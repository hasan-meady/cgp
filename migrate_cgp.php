<?php
// Load WordPress environment
require_once __DIR__ . '/wp-load.php';

echo "Starting Migration...\n<br>";

// Ensure plugin is active
require_once ABSPATH . 'wp-admin/includes/plugin.php';
activate_plugin('cgp-system/cgp-system.php');
echo "Activated CGP System plugin.\n<br>";

echo "Wiping all old cgp_item posts...\n<br>";
$old_posts = get_posts(array(
    'post_type' => 'cgp_item',
    'numberposts' => -1,
    'post_status' => 'any'
));
foreach ($old_posts as $p) {
    wp_delete_post($p->ID, true);
}
echo "Deleted " . count($old_posts) . " old posts.\n<br>";

echo "Wiping all old cgp_keyword terms...\n<br>";
$old_terms = get_terms(array(
    'taxonomy' => 'cgp_keyword',
    'hide_empty' => false,
));
if (!is_wp_error($old_terms)) {
    foreach ($old_terms as $t) {
        wp_delete_term($t->term_id, 'cgp_keyword');
    }
    echo "Deleted " . count($old_terms) . " old terms.\n<br>";
}

$json_dir = __DIR__ . '/cgp-json-data';
$files = glob($json_dir . '/*.json');

foreach ($files as $file) {
    $content = file_get_contents($file);
    $data = json_decode($content, true);
    
    if (!$data || !isset($data['title'])) continue;
    
    // Check if post exists
    $existing = get_page_by_title($data['title'], OBJECT, 'cgp_item');
    if ($existing) {
        $post_id = $existing->ID;
        echo "Updating: " . $data['title'] . "\n<br>";
    } else {
        echo "Creating: " . $data['title'] . "\n<br>";
        $post_id = wp_insert_post(array(
            'post_title' => $data['title'],
            'post_type' => 'cgp_item',
            'post_status' => 'publish'
        ));
    }
    
    // Update meta
    update_post_meta($post_id, '_cgp_json_data', wp_slash($content));
    
    // Extract keywords manually since array_walk_recursive behaves oddly with keys sometimes
    $keywords = array();
    
    // A simple recursive search for 'keywords'
    $json_string = strtolower($content);
    // Let's just decode and find them manually
    $find_keywords = function($arr) use (&$find_keywords, &$keywords) {
        if (is_array($arr)) {
            foreach ($arr as $k => $v) {
                if ($k === 'keywords' && is_array($v)) {
                    $keywords = array_merge($keywords, $v);
                } elseif (is_array($v)) {
                    $find_keywords($v);
                }
            }
        }
    };
    $find_keywords($data);
    
    if (!empty($keywords)) {
        wp_set_object_terms($post_id, array_unique($keywords), 'cgp_keyword');
    }
}

echo "Migration Complete.\n<br>";
