<?php
require_once __DIR__ . '/wp-load.php';

echo "Wiping all cgp_item posts...\n";
$posts = get_posts(array(
    'post_type' => 'cgp_item',
    'numberposts' => -1,
    'post_status' => 'any'
));

foreach ($posts as $post) {
    wp_delete_post($post->ID, true);
}

echo "Deleted " . count($posts) . " posts.\n";

echo "Wiping all cgp_keyword terms...\n";
$terms = get_terms(array(
    'taxonomy' => 'cgp_keyword',
    'hide_empty' => false,
));

foreach ($terms as $term) {
    wp_delete_term($term->term_id, 'cgp_keyword');
}

echo "Deleted " . count($terms) . " terms.\n";
echo "Wipe complete.\n";
