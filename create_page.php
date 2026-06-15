<?php
require_once __DIR__ . '/wp-load.php';

$page_title = 'CGP Search';
$page_content = '[cgp_search]';

$existing_page = get_page_by_title($page_title);
if (!$existing_page) {
    $page_id = wp_insert_post(array(
        'post_title' => $page_title,
        'post_content' => $page_content,
        'post_status' => 'publish',
        'post_type' => 'page',
    ));
    echo "Created Page: $page_title with ID $page_id";
} else {
    echo "Page already exists!";
}
