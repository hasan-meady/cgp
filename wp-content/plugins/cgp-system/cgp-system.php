<?php
/**
 * Plugin Name: CGP System
 * Description: Migrates and manages the CGP Info search system.
 * Version: 1.0
 */

require_once plugin_dir_path(__FILE__) . 'interactions-api.php';
require_once plugin_dir_path(__FILE__) . 'admin-importer.php';
require_once plugin_dir_path(__FILE__) . 'ai-chatbot-api.php';

// 1. Register Custom Post Type & Taxonomy
function cgp_register_post_types() {
    register_post_type('cgp_item', array(
        'labels' => array(
            'name' => 'CGP Guides',
            'singular_name' => 'CGP Guide'
        ),
        'public' => true,
        'has_archive' => true,
        'show_in_rest' => true,
        'supports' => array('title', 'custom-fields')
    ));

    register_taxonomy('cgp_keyword', 'cgp_item', array(
        'labels' => array(
            'name' => 'CGP Keywords'
        ),
        'hierarchical' => false,
        'show_in_rest' => true
    ));
}
add_action('init', 'cgp_register_post_types');

// 2. Register REST API Search Endpoint
function cgp_rest_search($request) {
    $args = array(
        'post_type' => 'cgp_item',
        'posts_per_page' => -1,
    );
    
    $posts = get_posts($args);
    $results = array();
    
    foreach ($posts as $post) {
        $json_data = get_post_meta($post->ID, '_cgp_json_data', true);
        if ($json_data) {
            $data = json_decode($json_data, true);
            $results[] = $data;
        }
    }
    
    return rest_ensure_response($results);
}

function cgp_register_rest_routes() {
    register_rest_route('cgp/v1', '/data', array(
        'methods' => 'GET',
        'callback' => 'cgp_rest_search',
        'permission_callback' => '__return_true'
    ));
}
add_action('rest_api_init', 'cgp_register_rest_routes');

// 3. Register Shortcode for the UI
function cgp_ui_shortcode() {

    $plugin_url = plugin_dir_url(__FILE__);
    
    $plugin_dir = plugin_dir_path(__FILE__);
    
    // Enqueue modular styles
    wp_enqueue_style('cgp-variables-css', $plugin_url . 'assets/css/variables.css', array(), filemtime($plugin_dir . 'assets/css/variables.css'));
    wp_enqueue_style('cgp-layout-css', $plugin_url . 'assets/css/layout.css', array('cgp-variables-css'), filemtime($plugin_dir . 'assets/css/layout.css'));
    wp_enqueue_style('cgp-accordion-css', $plugin_url . 'assets/css/accordion.css', array('cgp-variables-css'), filemtime($plugin_dir . 'assets/css/accordion.css'));
    wp_enqueue_style('cgp-sidebar-css', $plugin_url . 'assets/css/sidebar.css', array('cgp-variables-css'), filemtime($plugin_dir . 'assets/css/sidebar.css'));
    wp_enqueue_style('cgp-components-css', $plugin_url . 'assets/css/components.css', array('cgp-variables-css'), filemtime($plugin_dir . 'assets/css/components.css'));
    wp_enqueue_style('cgp-autocomplete-css', $plugin_url . 'assets/css/autocomplete.css', array('cgp-variables-css'), filemtime($plugin_dir . 'assets/css/autocomplete.css'));
    wp_enqueue_style('cgp-interactions-css', $plugin_url . 'assets/css/interactions.css', array('cgp-variables-css'), filemtime($plugin_dir . 'assets/css/interactions.css'));
    wp_enqueue_style('cgp-chatbot-css', $plugin_url . 'assets/css/chatbot.css', array('cgp-variables-css'), filemtime($plugin_dir . 'assets/css/chatbot.css'));
    wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');
    
    // Enqueue external libraries via CDN because local lib directory is missing
    wp_enqueue_script('awesomplete', 'https://cdnjs.cloudflare.com/ajax/libs/awesomplete/1.1.5/awesomplete.min.js', array(), null, true);
    wp_enqueue_script('printjs', 'https://cdnjs.cloudflare.com/ajax/libs/print-js/1.6.0/print.js', array(), null, true);
    
    // Enqueue modularized JS files with correct dependencies
    wp_enqueue_script('cgp-api', $plugin_url . 'assets/js/api.js', array('jquery'), filemtime($plugin_dir . 'assets/js/api.js'), true);
    wp_enqueue_script('cgp-utils', $plugin_url . 'assets/js/utils.js', array(), filemtime($plugin_dir . 'assets/js/utils.js'), true);
    wp_enqueue_script('cgp-search', $plugin_url . 'assets/js/search.js', array('cgp-api', 'cgp-utils'), filemtime($plugin_dir . 'assets/js/search.js'), true);
    wp_enqueue_script('cgp-interactions', $plugin_url . 'assets/js/interactions.js', array('cgp-api'), filemtime($plugin_dir . 'assets/js/interactions.js'), true);
    wp_enqueue_script('cgp-render', $plugin_url . 'assets/js/render.js', array('cgp-search', 'cgp-utils', 'cgp-interactions'), filemtime($plugin_dir . 'assets/js/render.js'), true);
    wp_enqueue_script('cgp-main', $plugin_url . 'assets/js/main.js', array('cgp-render', 'awesomplete'), filemtime($plugin_dir . 'assets/js/main.js'), true);
    wp_enqueue_script('cgp-chatbot-js', $plugin_url . 'assets/js/chatbot.js', array('jquery'), filemtime($plugin_dir . 'assets/js/chatbot.js'), true);
    
    // Pass API URL to JS (attached to api.js)
    wp_localize_script('cgp-api', 'cgpData', array(
        'apiUrl' => rest_url('cgp/v1/data'),
        'pdfUrl' => wp_upload_dir()['baseurl'] . '/cgp_files/',
        'askUrl' => rest_url('cgp/v1/ask')
    ));

    ob_start();
    ?>
    <div class="search-page-container">
        <div class="header-section mb-4">
            <h1 class="head-title">
                CGP Information 
                <span class="rolling-words">
                    <span>Search</span>
                    <span>Drugs</span>
                    <span>Interactions</span>
                    <span>Info</span>
                </span>
            </h1>
            <p class="hint">Search through comprehensive pharmaceutical guidelines and protocols.</p>
        </div>
        <form class="url-form" onsubmit="event.preventDefault();">
            <div class="form-wraper">
                <div class="input-wraper">
                    <div class="search-wraper">
                        <div style="position:relative;">
                            <input class="form-control form-control-lg url-input autocomplete" type="search"
                                id="search-input" placeholder="e.g. Ashwagandha, Nephrozac, Foltene Men Amp...">
                        </div>
                    </div>
                    <div id="search-results-count" class="results-count"></div>
                </div>
            </div>
        </form>
    </div>
    <div class="cgp-layout-wrapper" id="main-content-wrapper">
        <?php
        // Fetch recent discussions and articles
        $recent_comments = get_comments(array('number' => 4, 'status' => 'approve', 'post_type' => 'cgp_feedback'));
        $recent_posts = wp_get_recent_posts(array('numberposts' => 4, 'post_status' => 'publish'));
        ?>
        <div class="cgp-layout-grid">
            <!-- Left empty column to ensure center column is perfectly centered -->
            <div class="cgp-grid-left d-none d-lg-block"></div>

            <!-- Center column -->
            <div class="cgp-grid-center">
                <div id="search-results" class="results-container mt-4"></div>
            </div>

            <!-- Right column -->
            <div class="cgp-grid-right">
                <div id="mobile-search-tags" class="d-lg-none mb-4 mt-4" style="display: none;">
                    <div class="text-muted small fw-bold mb-2"><i class="fas fa-tags"></i> Related Keywords</div>
                    <div id="mobile-dynamic-tags" class="horizontal-tags-scroll">
                    </div>
                </div>
                <div class="sidebar-wrapper mt-4" id="main-sidebar-wrapper" <?php if (empty($recent_posts) && empty($recent_comments)) echo 'style="display: none;"'; ?>>
                    <div id="search-tags-sidebar" class="tags-sidebar d-none d-lg-block mb-4" style="display: none;">
                        <div class="tags-sidebar-header">
                            <h5><i class="fas fa-tags"></i> Related Keywords</h5>
                        </div>
                        <div id="dynamic-tags" class="tags-sidebar-content">
                        </div>
                    </div>
                    <div id="initial-dashboard-feed" class="dashboard-feed-wrapper">
                        <?php if (!empty($recent_posts) || !empty($recent_comments)) : ?>
                            <?php if (!empty($recent_posts)) : ?>
                            <div class="mb-4">
                                <h6 class="dashboard-section-title"><i class="far fa-newspaper"></i> Latest Updates</h6>
                                <div class="dashboard-card">
                                    <ul class="clean-feed-list">
                                        <?php foreach($recent_posts as $p) : ?>
                                            <li>
                                                <a href="<?php echo get_permalink($p['ID']); ?>" class="feed-link">
                                                    <div class="feed-title"><?php echo esc_html($p['post_title']); ?></div>
                                                    <div class="feed-date text-muted small"><?php echo date('M j, Y', strtotime($p['post_date'])); ?></div>
                                                </a>
                                            </li>
                                        <?php endforeach; ?>
                                    </ul>
                                </div>
                            </div>
                            <?php endif; ?>
                            <?php if (!empty($recent_comments)) : ?>
                            <div class="mb-4">
                                <h6 class="dashboard-section-title"><i class="far fa-comments"></i> Recent Discussions</h6>
                                <div class="dashboard-card">
                                    <ul class="clean-feed-list">
                                        <?php foreach($recent_comments as $c) : 
                                            $drug_post = get_post($c->comment_post_ID);
                                            $drug_title = $drug_post ? $drug_post->post_title : 'a drug';
                                        ?>
                                            <li>
                                                <div class="feed-content">
                                                    <div><span class="feed-author fw-bold">@<?php echo strtolower(str_replace(' ', '', $c->comment_author ?: 'guest')); ?></span> <span class="text-muted small">on</span> <span class="feed-target" style="color:var(--accent-color); cursor:pointer;" onclick="document.getElementById('search-input').value='<?php echo esc_js($drug_title); ?>'; document.getElementById('search-input').dispatchEvent(new Event('input'));"><?php echo esc_html($drug_title); ?></span></div>
                                                    <div class="feed-text mt-1" style="font-style:italic; font-size:13px; color:#555;">"<?php echo wp_trim_words($c->comment_content, 12); ?>"</div>
                                                </div>
                                            </li>
                                        <?php endforeach; ?>
                                    </ul>
                                </div>
                            </div>
                            <?php endif; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <button id="sources-toggle" class="sources-toggle-btn" title="Click to view information sources">
        <i class="fas fa-info-circle"></i>
    </button>

    <div id="sources-card" class="sources-card">
        <div class="card-header">
            <h3>Information Sources</h3>
            <button class="close-btn">&times;</button>
        </div>
        <div class="card-body">
            <ul class="sources-list">
                <!-- Links updated to point to wp-content/uploads/cgp_files/ -->
                <li><a href="/wp-content/uploads/cgp_files/Weight Managment_July 2023.pdf" target="_blank"><i class="fas fa-weight"></i> Weight Management</a></li>
                <li><a href="/wp-content/uploads/cgp_files/ALLERGIC RHINITIS.pdf" target="_blank"><i class="fas fa-allergies"></i> Allergic Rhinitis</a></li>
                <li><a href="/wp-content/uploads/cgp_files/Pain Management_final.pdf" target="_blank"><i class="fas fa-head-side-mask"></i> Pain Management</a></li>
                <li><a href="/wp-content/uploads/cgp_files/CGP_Eye_Care_New.pdf" target="_blank"><i class="fas fa-eye"></i> CGP Eye Care</a></li>
                <li><a href="/wp-content/uploads/cgp_files/Oral Care Final.pdf-7.pdf" target="_blank"><i class="fas fa-tooth"></i> Oral Care</a></li>
                <li><a href="/wp-content/uploads/cgp_files/CGP_Drug Food Interaction.pdf" target="_blank"><i class="fas fa-pills"></i> Drug Food Interaction</a></li>
                <li><a href="/wp-content/uploads/cgp_files/H&W_All_In_One.pdf" target="_blank"><i class="fas fa-utensils"></i> Health & Wellness Guide</a></li>
                <li><a href="/wp-content/uploads/cgp_files/IMMUNITY BATTLE.pdf" target="_blank"><i class="fas fa-shield-virus"></i> Immunity Battle</a></li>
                <li><a href="/wp-content/uploads/cgp_files/Respiratory_Release.pdf" target="_blank"><i class="fas fa-shield-virus"></i> Respiratory Release</a></li>
                <li><a href="/wp-content/uploads/cgp_files/GIT_Release.pdf" target="_blank"><i class="fas fa-git-alt"></i> GIT Release</a></li>
                <li><a href="/wp-content/uploads/cgp_files/CGP_Baby Milk.pdf" target="_blank"><i class="fas fa-baby"></i> Baby Milk</a></li>
                <li><a href="/wp-content/uploads/cgp_files/HairExperts-Topic.pdf" target="_blank"><i class="fas fa-cut"></i> Hair Experts</a></li>
                <li><a href="/wp-content/uploads/cgp_files/Ronzac.pdf" target="_blank"><i class="fas fa-prescription-bottle-alt"></i> Ronzac</a></li>
                <li><a href="/wp-content/uploads/cgp_files/RONZAC_New.pdf" target="_blank"><i class="fas fa-prescription-bottle-alt"></i> Ronzac (Updated)</a></li>
                <li><a href="/wp-content/uploads/cgp_files/Ronzavit minerals.pdf" target="_blank"><i class="fas fa-pills"></i> Ronzavit Minerals</a></li>
                <li><a href="/wp-content/uploads/cgp_files/sunscreen.pdf" target="_blank"><i class="fas fa-sun"></i> Sunscreen</a></li>
                <li><a href="/wp-content/uploads/cgp_files/Moisturizers & Eczema.pdf" target="_blank"><i class="fas fa-hand-holding-water"></i> Moisturizers & Eczema</a></li>
                <li><a href="/wp-content/uploads/cgp_files/MANUKA HONEY .pdf" target="_blank"><i class="fas fa-honey-pot"></i> Manuka Honey</a></li>
                <li><a href="/wp-content/uploads/cgp_files/Ramadan_Release_2025.pdf" target="_blank"><i class="fas fa-moon"></i> Ramadan Release 2025</a></li>
            </ul>
        </div>
    </div>
    <div class="sources-overlay"></div>
    <?php
    return ob_get_clean();
}
add_shortcode('cgp_search', 'cgp_ui_shortcode');


// Add PWA Manifest to Head
function cgp_add_pwa_manifest() {
    $manifest_url = plugin_dir_url(__FILE__) . 'manifest.json';
    echo '<link rel="manifest" href="' . esc_url($manifest_url) . '">
';
    echo '<meta name="theme-color" content="#3b5998">
';
}
add_action('wp_head', 'cgp_add_pwa_manifest');


// Set custom document title
add_filter('document_title_parts', function($title_parts) {
    if (is_front_page() || is_home()) {
        $title_parts['title'] = 'CGP Information Search';
        $title_parts['tagline'] = 'By Hasan Meady';
    }
    return $title_parts;
});

// Add Favicon to Head
function cgp_add_favicon() {
    $favicon_url = plugin_dir_url(__FILE__) . 'assets/images/icon-192.png';
    echo '<link rel="icon" href="' . esc_url($favicon_url) . '" type="image/png">
';
    echo '<link rel="apple-touch-icon" href="' . esc_url($favicon_url) . '">
';
}
add_action('wp_head', 'cgp_add_favicon');

