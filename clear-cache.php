<?php
/**
 * Manual Cache Clear Script
 * Run this file to clear all WordPress caches
 */

// Load WordPress environment
require_once __DIR__ . '/wp-load.php';

echo "=== CGP Cache Clear Script ===\n\n";

// Clear WordPress object cache
if (function_exists('wp_cache_flush')) {
    wp_cache_flush();
    echo "✓ WordPress object cache cleared\n";
} else {
    echo "✗ WordPress object cache not available\n";
}

// Clear plugin-specific caches if they exist
$cache_dir = WP_CONTENT_DIR . '/cache';
if (is_dir($cache_dir)) {
    $files = glob($cache_dir . '/*');
    foreach ($files as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }
    echo "✓ Plugin cache directory cleared\n";
} else {
    echo "✓ No plugin cache directory found\n";
}

// Clear browser cache headers
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: Wed, 11 Jan 1984 05:00:00 GMT');

echo "\n=== Cache Clear Complete ===\n";
echo "Please hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)\n";
?>