<?php
// interactions-api.php

function cgp_register_feedback_cpt() {
    register_post_type('cgp_feedback', array(
        'labels' => array('name' => 'CGP Feedback', 'singular_name' => 'Feedback'),
        'public' => false,
        'show_ui' => true,
        'supports' => array('title', 'comments')
    ));
}
add_action('init', 'cgp_register_feedback_cpt');

function cgp_get_feedback_post($drug_name) {
    // We must ensure the title matches precisely, but WP_Query by title is exact
    $query = new WP_Query(array(
        'post_type' => 'cgp_feedback',
        'title' => $drug_name,
        'post_status' => 'publish',
        'posts_per_page' => 1
    ));
    if ($query->have_posts()) {
        return $query->posts[0]->ID;
    }
    
    // Create it
    return wp_insert_post(array(
        'post_title' => $drug_name,
        'post_type' => 'cgp_feedback',
        'post_status' => 'publish',
        'comment_status' => 'open'
    ));
}

function cgp_get_interaction_data($drug_name) {
    $post_id = cgp_get_feedback_post($drug_name);
    
    $likes = (int) get_post_meta($post_id, 'cgp_likes', true);
    $dislikes = (int) get_post_meta($post_id, 'cgp_dislikes', true);
    
    $comments = get_comments(array('post_id' => $post_id, 'status' => 'approve'));
    $formatted_comments = array();
    foreach ($comments as $c) {
        $formatted_comments[] = array(
            'author' => $c->comment_author,
            'content' => $c->comment_content,
            'date' => date('M j, Y', strtotime($c->comment_date))
        );
    }
    
    return array(
        'likes' => $likes,
        'dislikes' => $dislikes,
        'comments' => $formatted_comments
    );
}

function cgp_interaction_get($request) {
    $drug_name = sanitize_text_field($request->get_param('drug'));
    if (empty($drug_name)) return new WP_Error('missing_drug', 'Drug name is required', array('status' => 400));
    
    return rest_ensure_response(cgp_get_interaction_data($drug_name));
}

function cgp_interaction_post($request) {
    $drug_name = sanitize_text_field($request->get_param('drug'));
    $action = sanitize_text_field($request->get_param('action'));
    
    if (empty($drug_name) || empty($action)) return new WP_Error('invalid', 'Missing data', array('status' => 400));
    
    $post_id = cgp_get_feedback_post($drug_name);
    
    if ($action === 'like') {
        $likes = (int) get_post_meta($post_id, 'cgp_likes', true);
        update_post_meta($post_id, 'cgp_likes', $likes + 1);
    } elseif ($action === 'dislike') {
        $dislikes = (int) get_post_meta($post_id, 'cgp_dislikes', true);
        update_post_meta($post_id, 'cgp_dislikes', $dislikes + 1);
    } elseif ($action === 'comment') {
        $content = sanitize_textarea_field($request->get_param('content'));
        $author = sanitize_text_field($request->get_param('author'));
        if (!empty($content)) {
            wp_insert_comment(array(
                'comment_post_ID' => $post_id,
                'comment_author' => empty($author) ? 'Guest' : $author,
                'comment_content' => $content,
                'comment_approved' => 1
            ));
        }
    }
    
    return rest_ensure_response(cgp_get_interaction_data($drug_name));
}

function cgp_register_interaction_routes() {
    register_rest_route('cgp/v1', '/interaction', array(
        array(
            'methods' => 'GET',
            'callback' => 'cgp_interaction_get',
            'permission_callback' => '__return_true'
        ),
        array(
            'methods' => 'POST',
            'callback' => 'cgp_interaction_post',
            'permission_callback' => '__return_true'
        )
    ));
}
add_action('rest_api_init', 'cgp_register_interaction_routes');
