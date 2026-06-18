<?php
// Minimal functions.php for CGP Theme

function cgp_theme_setup() {
    add_theme_support( 'title-tag' );
}
add_action( 'after_setup_theme', 'cgp_theme_setup' );

function cgp_theme_scripts() {
    // Force cache refresh with timestamp version
    $version = time();
    
    // Enqueue theme stylesheet
    wp_enqueue_style( 'cgp-theme-style', get_stylesheet_uri(), array(), $version );
    
    // The CGP search plugin relies on Bootstrap classes for its UI layout.
    // We enqueue Bootstrap directly in this custom theme to guarantee it works.
    wp_enqueue_style('bootstrap-css', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css', array(), $version);
    wp_enqueue_script('bootstrap-js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js', array(), $version, true);
}
add_action( 'wp_enqueue_scripts', 'cgp_theme_scripts' );

// Prevent browser caching
function cgp_prevent_caching() {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Cache-Control: post-check=0, pre-check=0', false);
    header('Pragma: no-cache');
    header('Expires: Wed, 11 Jan 1984 05:00:00 GMT');
}
add_action('send_headers', 'cgp_prevent_caching');
