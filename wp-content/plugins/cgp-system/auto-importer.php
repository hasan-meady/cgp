<?php
// auto-importer.php

if (!defined('ABSPATH')) {
    exit;
}

function cgp_auto_import_jsons() {
    // Only run if we are in admin to avoid slowing down the frontend during import, 
    // but the user requested automatic background importing. 
    // A transient is extremely fast to check.
    $json_dir = ABSPATH . 'cgp-json-data';
    
    if (!is_dir($json_dir)) {
        return;
    }

    $files = glob($json_dir . '/*.json');
    if (empty($files)) {
        return;
    }

    // Calculate a hash of the files and their modification times
    $current_state = '';
    foreach ($files as $file) {
        $current_state .= basename($file) . filemtime($file);
    }
    $current_hash = md5($current_state);

    $last_hash = get_option('cgp_json_last_import_hash');

    // If the hash matches, nothing has changed, do nothing.
    if ($current_hash === $last_hash) {
        return;
    }

    // Hash mismatched! This means files were added, updated, or removed.
    // We will wipe the old data and insert the new data.

    // 1. Wipe Old Data
    $cgp_posts = get_posts(array('post_type' => 'cgp_item', 'posts_per_page' => -1, 'post_status' => 'any'));
    foreach ($cgp_posts as $p) {
        wp_delete_post($p->ID, true);
    }

    // 2. Insert New Data
    foreach ($files as $tmp_name) {
        $json_data = file_get_contents($tmp_name);
        
        // Handle different encodings (UTF-16LE is common for PowerShell/Windows exports)
        if (substr($json_data, 0, 2) === "\xFF\xFE") {
            $json_data = mb_convert_encoding(substr($json_data, 2), 'UTF-8', 'UTF-16LE');
        } elseif (substr($json_data, 0, 2) === "\xFE\xFF") {
            $json_data = mb_convert_encoding(substr($json_data, 2), 'UTF-8', 'UTF-16BE');
        } elseif (substr($json_data, 0, 3) === "\xEF\xBB\xBF") {
            $json_data = substr($json_data, 3); // Remove UTF-8 BOM
        } elseif (strpos(substr($json_data, 0, 100), "\x00") !== false) {
            $json_data = mb_convert_encoding($json_data, 'UTF-8', 'UTF-16LE'); // Assume LE if null bytes exist
        }

        $data = json_decode($json_data, true);
        if (!$data) continue;

        // Ensure title exists
        $title = isset($data['title']) ? sanitize_text_field($data['title']) : basename($tmp_name, '.json');

        // Extract keywords
        $keywords = array();
        if (isset($data['sections']) && is_array($data['sections'])) {
            foreach ($data['sections'] as $section) {
                if (isset($section['content']) && is_array($section['content'])) {
                    foreach ($section['content'] as $item) {
                        if (is_array($item)) {
                            foreach ($item as $k => $v) {
                                if (isset($v['keywords']) && is_array($v['keywords'])) {
                                    $keywords = array_merge($keywords, $v['keywords']);
                                }
                            }
                        }
                    }
                }
            }
        }
        $keywords = array_map('strtolower', array_map('trim', $keywords));
        $keywords = array_unique($keywords);

        // Insert post
        $post_id = wp_insert_post(array(
            'post_title' => $title,
            'post_type' => 'cgp_item',
            'post_status' => 'publish'
        ));

        if (!is_wp_error($post_id)) {
            // Save keywords
            if (!empty($keywords)) {
                wp_set_object_terms($post_id, $keywords, 'cgp_keyword');
            }
            // Save JSON blob exactly as is
            update_post_meta($post_id, '_cgp_json_data', wp_slash($json_data));
        }
    }

    // Update the hash so we don't run this again until files change
    update_option('cgp_json_last_import_hash', $current_hash);
}

// Hook it to init so it runs automatically whenever ANY page is loaded.
// This ensures that the user does not have to log into the admin panel for the import to happen.
// A fast MD5 check prevents this from slowing down normal page loads.
add_action('init', 'cgp_auto_import_jsons');
