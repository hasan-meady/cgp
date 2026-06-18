<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0">
    <meta http-equiv="Cache-Control" content="post-check=0, pre-check=0">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="Wed, 11 Jan 1984 05:00:00 GMT">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
    <main class="cgp-theme-container">
        <!-- Renders the CGP Search shortcode natively as the absolute core of the website -->
        <?php echo do_shortcode('[cgp_search]'); ?>
    </main>
    
    <footer class="cgp-theme-footer">
        <p>Made with <i class="fas fa-heart heart-icon"></i> by <a href="https://hasanmeady.online/" target="_blank" rel="noopener noreferrer">Hasan Meady</a></p>
    </footer>

    <?php wp_footer(); ?>
</body>
</html>
