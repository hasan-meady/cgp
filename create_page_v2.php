<?php
require_once __DIR__ . '/wp-load.php';

echo "Starting page creation...\n<br>";

$page_title = 'CGP Search';
$page_content = '[cgp_search]';

// Use WP_Query instead of deprecated get_page_by_title
$query = new WP_Query(array(
    'post_type' => 'page',
    'title' => $page_title,
    'posts_per_page' => 1
));

if (!$query->have_posts()) {
    $page_id = wp_insert_post(array(
        'post_title' => $page_title,
        'post_content' => $page_content,
        'post_status' => 'publish',
        'post_type' => 'page',
    ));
    echo "Created Page: $page_title with ID $page_id\n<br>";
} else {
    $existing_post = $query->posts[0];
    echo "Page already exists with ID: " . $existing_post->ID . "\n<br>";
}

echo "Done.";
