<?php
// admin-importer.php

if (!defined('ABSPATH')) {
    exit;
}

// Register the Admin Menu Page
function cgp_register_admin_importer() {
    add_menu_page(
        'CGP Data Importer',
        'CGP Importer',
        'manage_options',
        'cgp-data-importer',
        'cgp_render_admin_importer',
        'dashicons-database-import',
        30
    );
}
add_action('admin_menu', 'cgp_register_admin_importer');

// Handle the Form Submissions
function cgp_handle_import_submission() {
    if (!current_user_can('manage_options')) return;

    // 1. Save API Key
    if (isset($_POST['cgp_save_key_nonce']) && wp_verify_nonce($_POST['cgp_save_key_nonce'], 'cgp_save_key_action')) {
        if (isset($_POST['cgp_api_key'])) {
            update_option('cgp_gemini_api_key', sanitize_text_field($_POST['cgp_api_key']));
            add_settings_error('cgp_messages', 'cgp_message', 'API Key saved successfully.', 'updated');
        }
    }

    // Process JSON Insertion Function
    $process_json_insertion = function($json_string) {
        // Strip markdown blocks if AI wrapped it
        $json_string = preg_replace('/```json\s*/', '', $json_string);
        $json_string = preg_replace('/```\s*/', '', $json_string);
        $json_string = trim($json_string);

        $data = json_decode($json_string, true);

        if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
            $imported_count = 0;
            
            foreach ($data as $item) {
                if (isset($item['title'])) {
                    $existing = get_page_by_title($item['title'], OBJECT, 'cgp_item');
                    if (!$existing) {
                        $post_id = wp_insert_post(array(
                            'post_title' => sanitize_text_field($item['title']),
                            'post_type' => 'cgp_item',
                            'post_status' => 'publish'
                        ));
                        if (!is_wp_error($post_id)) {
                            update_post_meta($post_id, '_cgp_json_data', wp_slash(wp_json_encode($item)));
                            $imported_count++;
                        }
                    } else {
                        update_post_meta($existing->ID, '_cgp_json_data', wp_slash(wp_json_encode($item)));
                        $imported_count++;
                    }
                }
            }
            add_settings_error('cgp_messages', 'cgp_message', "Successfully imported/updated $imported_count guides.", 'updated');
        } else {
            add_settings_error('cgp_messages', 'cgp_message', 'Invalid JSON payload format.', 'error');
        }
    };

    // 2. Handle Manual JSON Import
    if (isset($_POST['cgp_import_nonce']) && wp_verify_nonce($_POST['cgp_import_nonce'], 'cgp_import_action')) {
        if (!empty($_POST['cgp_json_payload'])) {
            $process_json_insertion(stripslashes($_POST['cgp_json_payload']));
        }
    }

    // 4. Handle Quick Manual Entry Builder
    if (isset($_POST['cgp_quick_entry_nonce']) && wp_verify_nonce($_POST['cgp_quick_entry_nonce'], 'cgp_quick_entry_action')) {
        $title = sanitize_text_field($_POST['cgp_quick_title']);
        $category = sanitize_text_field($_POST['cgp_quick_category']);
        $keywords = !empty($_POST['cgp_quick_keywords']) ? array_map('trim', explode(',', sanitize_text_field($_POST['cgp_quick_keywords']))) : [];
        
        $content = [];
        if (isset($_POST['cgp_content_keys']) && isset($_POST['cgp_content_values'])) {
            $keys = $_POST['cgp_content_keys'];
            $values = $_POST['cgp_content_values'];
            for ($i = 0; $i < count($keys); $i++) {
                $k = sanitize_text_field($keys[$i]);
                // Allow some basic formatting but sanitize
                $v = wp_kses_post($values[$i]);
                if (!empty($k) && !empty($v)) {
                    $content[$k] = $v;
                }
            }
        }
        
        if (!empty($keywords)) {
            $content['keywords'] = $keywords;
        }

        $item = [
            'title' => $title,
            'category' => $category,
            'source' => 'Manual Entry',
            'content' => $content
        ];

        // Format as array since the importer expects an array of items
        $json_string = wp_json_encode([$item]);
        $process_json_insertion($json_string);
    }

    // 3. Handle Gemini AI PDF Upload
    if (isset($_POST['cgp_ai_upload_nonce']) && wp_verify_nonce($_POST['cgp_ai_upload_nonce'], 'cgp_ai_upload_action')) {
        $api_key = get_option('cgp_gemini_api_key');
        if (empty($api_key)) {
            add_settings_error('cgp_messages', 'cgp_message', 'Please save your Gemini API key first.', 'error');
            return;
        }

        if (!empty($_FILES['cgp_pdf_file']['tmp_name'])) {
            $file_path = $_FILES['cgp_pdf_file']['tmp_name'];
            $file_type = $_FILES['cgp_pdf_file']['type'];

            if ($file_type !== 'application/pdf') {
                add_settings_error('cgp_messages', 'cgp_message', 'Only PDF files are allowed.', 'error');
                return;
            }

            // Read and Base64 encode the PDF
            $pdf_data = file_get_contents($file_path);
            $base64_pdf = base64_encode($pdf_data);

            // Construct Gemini Prompt
            $prompt = 'I am uploading a pharmaceutical guideline/protocol PDF. Please extract the entire document into the following strict JSON array format. Do not include any markdown formatting, only the raw JSON.

[
  {
    "id": "unique-kebab-case-identifier",
    "title": "Title of the Drug or Guide",
    "type": "condition-guide",
    "release": "Release #1",
    "committee": "WeCare committee",
    "sections": [
      {
        "title": "Name of Section",
        "content": [
          {
            "Subsection Title": ["Point 1", "Point 2"],
            "keywords": ["keyword1", "keyword2"]
          }
        ]
      }
    ]
  }
]

Rules:
1. Every section MUST contain a "keywords" array inside its content blocks containing relevant search terms (diseases, drug names, symptoms).
2. Maintain highly nested structures if there are subsections.
3. Ensure the output is 100% valid JSON.';

            // Gemini API Request Payload
            $payload = array(
                'contents' => array(
                    array(
                        'parts' => array(
                            array(
                                'inlineData' => array(
                                    'mimeType' => 'application/pdf',
                                    'data' => $base64_pdf
                                )
                            ),
                            array(
                                'text' => $prompt
                            )
                        )
                    )
                )
            );

            // Call Gemini API
            $response = wp_remote_post("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" . $api_key, array(
                'headers' => array('Content-Type' => 'application/json'),
                'body' => wp_json_encode($payload),
                'timeout' => 120 // 2 minutes timeout for large PDFs
            ));

            if (is_wp_error($response)) {
                add_settings_error('cgp_messages', 'cgp_message', 'API Request failed: ' . $response->get_error_message(), 'error');
            } else {
                $body = wp_remote_retrieve_body($response);
                $result_data = json_decode($body, true);

                if (isset($result_data['candidates'][0]['content']['parts'][0]['text'])) {
                    $ai_json = $result_data['candidates'][0]['content']['parts'][0]['text'];
                    $process_json_insertion($ai_json);
                } else {
                    add_settings_error('cgp_messages', 'cgp_message', 'Failed to extract JSON from Gemini response. Response: ' . wp_kses_post($body), 'error');
                }
            }
        }
    }
}
add_action('admin_init', 'cgp_handle_import_submission');

// Seed the API key if missing but provided by user
function cgp_seed_api_key() {
    if (!get_option('cgp_gemini_api_key')) {
        // API key should be entered manually via the settings UI
        // update_option('cgp_gemini_api_key', 'YOUR_API_KEY_HERE');
    }
}
add_action('admin_init', 'cgp_seed_api_key');

// Render the UI
function cgp_render_admin_importer() {
    $api_key = get_option('cgp_gemini_api_key', '');
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">CGP Data Importer</h1>
        <hr class="wp-header-end">
        
        <?php settings_errors('cgp_messages'); ?>

        <!-- API Key Settings -->
        <div style="background: #fff; padding: 15px 20px; border-left: 4px solid #3b5998; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px;">
            <form method="post" action="" style="display: flex; align-items: center; gap: 15px;">
                <?php wp_nonce_field('cgp_save_key_action', 'cgp_save_key_nonce'); ?>
                <label style="font-weight: 600;">Google Gemini API Key:</label>
                <input type="text" name="cgp_api_key" value="<?php echo esc_attr($api_key); ?>" style="width: 400px; padding: 5px;">
                <button type="submit" class="button">Save Key</button>
            </form>
        </div>

        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            
            <!-- Automated AI Area -->
            <div style="flex: 1; min-width: 400px; background: #f0f7ff; padding: 25px; border: 1px solid #cce5ff; border-radius: 8px;">
                <h2><span class="dashicons dashicons-superhero"></span> Automated AI PDF Extraction</h2>
                <p>Upload a pharmaceutical PDF below. The system will send it securely to <strong>Gemini 1.5 Flash</strong>, parse the results into strict JSON, and inject the data directly into your database.</p>
                
                <form method="post" action="" enctype="multipart/form-data" style="margin-top: 20px; border: 2px dashed #99c2ff; padding: 30px; text-align: center; border-radius: 8px; background: #fff;">
                    <?php wp_nonce_field('cgp_ai_upload_action', 'cgp_ai_upload_nonce'); ?>
                    
                    <span class="dashicons dashicons-pdf" style="font-size: 40px; width: 40px; height: 40px; color: #3b5998; margin-bottom: 10px;"></span>
                    <br>
                    <input type="file" name="cgp_pdf_file" accept="application/pdf" required style="margin-bottom: 15px;">
                    
                    <p class="submit" style="padding:0; margin:0;">
                        <button type="submit" class="button button-primary button-hero" style="background: #3b5998; border-color: #3b5998;">Process with Gemini AI</button>
                    </p>
                    <p style="font-size: 11px; color: #666; margin-top: 10px;">Please be patient. Processing large PDFs may take up to 60 seconds.</p>
                </form>
            </div>

            <!-- Manual JSON Import Area -->
            <div style="flex: 1; min-width: 400px; background: #fff; padding: 25px; border: 1px solid #ccd0d5; border-radius: 8px;">
                <h2><span class="dashicons dashicons-edit"></span> Manual JSON Import</h2>
                <p>If you prefer to use ChatGPT or Claude manually, paste the JSON array output here to inject it into the database:</p>
                
                <form method="post" action="">
                    <?php wp_nonce_field('cgp_import_action', 'cgp_import_nonce'); ?>
                    <textarea name="cgp_json_payload" style="width: 100%; height: 220px; font-family: monospace; font-size: 13px; padding: 10px;" placeholder="Paste JSON array here..."></textarea>
                    <p class="submit" style="margin-bottom: 0;">
                        <button type="submit" class="button button-secondary">Import Manual JSON</button>
                    </p>
                </form>
            </div>

            <!-- Quick Manual Entry Builder Area -->
            <div style="flex: 1 1 100%; background: #fffcf0; padding: 25px; border: 1px solid #ffeeba; border-radius: 8px; margin-top: 10px;">
                <h2><span class="dashicons dashicons-welcome-write-blog"></span> Quick Manual Entry Builder</h2>
                <p>Use this form to quickly add a new drug or guideline manually. The system will automatically build the complex JSON structure for you!</p>
                
                <form method="post" action="">
                    <?php wp_nonce_field('cgp_quick_entry_action', 'cgp_quick_entry_nonce'); ?>
                    
                    <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                        <div style="flex: 1;">
                            <label style="font-weight: 600; display: block; margin-bottom: 5px;">Title / Drug Name *</label>
                            <input type="text" name="cgp_quick_title" required placeholder="e.g. Paracetamol 500mg" style="width: 100%; padding: 6px;">
                        </div>
                        <div style="flex: 1;">
                            <label style="font-weight: 600; display: block; margin-bottom: 5px;">Category / Classification</label>
                            <input type="text" name="cgp_quick_category" placeholder="e.g. Pain Management" style="width: 100%; padding: 6px;">
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="font-weight: 600; display: block; margin-bottom: 5px;">Search Keywords (Comma separated) *</label>
                        <input type="text" name="cgp_quick_keywords" required placeholder="e.g. fever, headache, panadol, pain relief" style="width: 100%; padding: 6px;">
                        <p style="font-size: 12px; color: #666; margin-top: 4px;">These are critical. Users typing these words will find this guide.</p>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: 600; display: block; margin-bottom: 10px;">Details & Content Sections</label>
                        <div id="quick-entry-rows">
                            <div class="quick-entry-row" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-start;">
                                <input type="text" name="cgp_content_keys[]" placeholder="Section (e.g. Administration)" style="width: 25%; padding: 6px;" required>
                                <textarea name="cgp_content_values[]" placeholder="Write the details here..." style="width: 75%; padding: 6px; height: 60px;" required></textarea>
                            </div>
                            <div class="quick-entry-row" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-start;">
                                <input type="text" name="cgp_content_keys[]" placeholder="Section (e.g. Precautions)" style="width: 25%; padding: 6px;">
                                <textarea name="cgp_content_values[]" placeholder="Write the details here..." style="width: 75%; padding: 6px; height: 60px;"></textarea>
                            </div>
                        </div>
                        <button type="button" class="button" onclick="addQuickEntryRow()">+ Add Another Section</button>
                    </div>

                    <p class="submit" style="margin-bottom: 0;">
                        <button type="submit" class="button button-primary" style="background: #d99a1c; border-color: #c48b19; font-size: 15px; padding: 5px 20px;">Save Guide to Database</button>
                    </p>
                </form>

                <script>
                function addQuickEntryRow() {
                    const row = document.createElement('div');
                    row.className = 'quick-entry-row';
                    row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-start;';
                    row.innerHTML = `
                        <input type="text" name="cgp_content_keys[]" placeholder="New Section Name" style="width: 25%; padding: 6px;">
                        <textarea name="cgp_content_values[]" placeholder="Write the details here..." style="width: 70%; padding: 6px; height: 60px;"></textarea>
                        <button type="button" class="button" onclick="this.parentElement.remove()" style="color: #d63638; width: 5%;">X</button>
                    `;
                    document.getElementById('quick-entry-rows').appendChild(row);
                }
                </script>
            </div>

        </div>
    </div>
    <?php
}
