<?php
// Minimal functions.php for CGP Theme

function cgp_theme_setup() {
    add_theme_support( 'title-tag' );
}
add_action( 'after_setup_theme', 'cgp_theme_setup' );

function cgp_theme_scripts() {
    // Enqueue theme stylesheet
    wp_enqueue_style( 'cgp-theme-style', get_stylesheet_uri(), array(), '1.0' );
    
    // The CGP search plugin relies on Bootstrap classes for its UI layout.
    // We enqueue Bootstrap directly in this custom theme to guarantee it works.
    wp_enqueue_style('bootstrap-css', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css', array(), '5.3.0');
    wp_enqueue_script('bootstrap-js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js', array(), '5.3.0', true);
}
add_action( 'wp_enqueue_scripts', 'cgp_theme_scripts' );
