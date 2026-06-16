<?php
// ai-chatbot-api.php

if (!defined('ABSPATH')) {
    exit;
}

function cgp_register_chatbot_api() {
    register_rest_route('cgp/v1', '/ask', array(
        'methods' => 'POST',
        'callback' => 'cgp_handle_ask_ai',
        'permission_callback' => '__return_true'
    ));
}
add_action('rest_api_init', 'cgp_register_chatbot_api');

function cgp_handle_ask_ai($request) {
    // 1. Rate Limiting (10 requests per hour per IP)
    $ip = $_SERVER['REMOTE_ADDR'];
    $transient_key = 'cgp_ai_limit_' . md5($ip);
    $attempts = get_transient($transient_key) ?: 0;
    
    if ($attempts >= 10) {
        return new WP_Error('rate_limit', 'You have reached the maximum number of questions for this hour. Please try again later.', array('status' => 429));
    }
    
    // 2. Extract User Question
    $params = $request->get_json_params();
    $question = isset($params['question']) ? sanitize_text_field($params['question']) : '';
    
    if (empty($question)) {
        return new WP_Error('empty_question', 'Please ask a valid question.', array('status' => 400));
    }
    
    // Increment Rate Limit
    set_transient($transient_key, $attempts + 1, HOUR_IN_SECONDS);

    // 3. Retrieve Context (Optimized RAG search using Database LIKE queries)
    // First, remove punctuation so words like "medication?" don't break the search
    $clean_question = preg_replace('/[^\p{L}\p{N}\s]/u', '', strtolower($question));
    $question_words = array_filter(explode(' ', $clean_question), function($w) {
        return mb_strlen($w) >= 3; // Search for words 3+ characters
    });
    
    $context_chunks = array();
    $scored_posts = array();

    if (!empty($question_words)) {
        // Query posts that match any of the keywords in the database
        $meta_query = array('relation' => 'OR');
        foreach ($question_words as $word) {
            $meta_query[] = array(
                'key' => '_cgp_json_data',
                'value' => sanitize_text_field($word),
                'compare' => 'LIKE'
            );
        }

        $args = array(
            'post_type' => 'cgp_item',
            'posts_per_page' => 10, // Limit to top 10 potential matches
            'meta_query' => $meta_query
        );
        $posts = get_posts($args);

        // Now score the matched posts for relevance
        foreach ($posts as $post) {
            $json_data = get_post_meta($post->ID, '_cgp_json_data', true);
            if ($json_data) {
                $score = 0;
                $lower_json = strtolower($json_data);
                foreach ($question_words as $word) {
                    if (strpos($lower_json, $word) !== false) {
                        $score++;
                    }
                }
                if ($score > 0) {
                    $scored_posts[] = array('score' => $score, 'data' => $json_data);
                }
            }
        }

        // Sort by relevance and take top 3
        usort($scored_posts, function($a, $b) { return $b['score'] - $a['score']; });
        $top_posts = array_slice($scored_posts, 0, 3);
        
        foreach ($top_posts as $tp) {
            $context_chunks[] = $tp['data'];
        }
    }
    
    $context_string = empty($context_chunks) ? "No specific data found in database for the given keywords." : implode("\n\n---\n\n", $context_chunks);

    // 4. Construct Secure Prompt
    $has_context = !empty($context_chunks);
    $system_prompt = "You are a professional, helpful, and concise medical assistant created by Hasan Meady for 'CGP Information Search'.\n";
    if ($has_context) {
        $system_prompt .= "Answer the user's question using the following database context as your PRIMARY source. Prefer information from the context when available.\n";
        $system_prompt .= "If the context contains relevant information, use it. If not, you may supplement with your general medical knowledge but CLEARLY indicate when you are doing so.\n\n";
        $system_prompt .= "DATABASE CONTEXT:\n" . $context_string;
    } else {
        $system_prompt .= "No specific data was found in Hasan Meady's local database for this query.\n";
        $system_prompt .= "You may answer using your general medical knowledge, but BEGIN your answer with this note: \"⚠️ This drug/topic is not yet in our local database. The following is general medical information:\"\n";
        $system_prompt .= "Keep your answer concise, professional, and accurate. Do NOT invent facts."; 
    }

    $user_prompt = "User Question: " . $question;

    // 5. Call Gemini API
    $api_key = defined('API_KEY') ? API_KEY : get_option('cgp_gemini_api_key');
    if (empty($api_key)) {
        return new WP_Error('no_api', 'The AI system is currently unconfigured.', array('status' => 500));
    }

    $payload = array(
        'contents' => array(
            array(
                'parts' => array(
                    array('text' => $system_prompt . "\n\n" . $user_prompt)
                )
            )
        )
    );

    $response = wp_remote_post("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" . $api_key, array(
        'headers' => array('Content-Type' => 'application/json'),
        'body' => wp_json_encode($payload),
        'timeout' => 30
    ));

    if (is_wp_error($response)) {
        return new WP_Error('api_error', 'Failed to reach AI server.', array('status' => 500));
    }

    $body = wp_remote_retrieve_body($response);
    $result_data = json_decode($body, true);

    if (isset($result_data['candidates'][0]['content']['parts'][0]['text'])) {
        $ai_answer_clean = esc_html($result_data['candidates'][0]['content']['parts'][0]['text']);
        // Decode quotes for cleaner JSON, while keeping < and > safely escaped
        $ai_answer_clean = htmlspecialchars_decode($ai_answer_clean, ENT_QUOTES);
        $ai_answer_clean = preg_replace('/\*\*(.*?)\*\*/', '<b>$1</b>', $ai_answer_clean);
        $ai_answer_clean = nl2br($ai_answer_clean);

        return rest_ensure_response(array(
            'success' => true,
            'answer' => $ai_answer_clean
        ));
    } else {
        // Return the raw response from Google to debug
        $error_msg = isset($result_data['error']['message']) ? $result_data['error']['message'] : 'Invalid response from AI.';
        return new WP_Error('api_error', 'Gemini API Error: ' . $error_msg . ' | Raw: ' . esc_html($body), array('status' => 500));
    }
}
