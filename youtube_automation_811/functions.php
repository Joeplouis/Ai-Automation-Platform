<?php
/**
 * AI Agency Pro Theme Functions
 * Core functionality and admin panel
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Theme setup
function ai_agency_theme_setup() {
    // Add theme support
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo');
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption'));
    
    // Register navigation menus
    register_nav_menus(array(
        'primary' => __('Primary Menu', 'ai-agency-pro'),
        'footer' => __('Footer Menu', 'ai-agency-pro'),
    ));
}
add_action('after_setup_theme', 'ai_agency_theme_setup');

// Enqueue scripts and styles
function ai_agency_enqueue_scripts() {
    // Theme stylesheet
    wp_enqueue_style('ai-agency-style', get_stylesheet_uri(), array(), '1.0.0');
    
    // Custom JavaScript
    wp_enqueue_script('ai-agency-script', get_template_directory_uri() . '/assets/js/main.js', array('jquery'), '1.0.0', true);
    
    // Localize script for AJAX
    wp_localize_script('ai-agency-script', 'ai_agency_ajax', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('ai_agency_nonce'),
        'site_url' => home_url(),
    ));
}
add_action('wp_enqueue_scripts', 'ai_agency_enqueue_scripts');

// Admin enqueue scripts
function ai_agency_admin_enqueue_scripts($hook) {
    if ('toplevel_page_ai-agency-settings' !== $hook) {
        return;
    }
    
    wp_enqueue_style('ai-agency-admin-style', get_template_directory_uri() . '/admin/admin-style.css', array(), '1.0.0');
    wp_enqueue_script('ai-agency-admin-script', get_template_directory_uri() . '/admin/admin-script.js', array('jquery'), '1.0.0', true);
    wp_enqueue_media(); // For media uploader
}
add_action('admin_enqueue_scripts', 'ai_agency_admin_enqueue_scripts');

// Create admin menu
function ai_agency_admin_menu() {
    add_menu_page(
        'AI Agency Settings',
        'AI Agency',
        'manage_options',
        'ai-agency-settings',
        'ai_agency_settings_page',
        'dashicons-robot',
        30
    );
    
    add_submenu_page(
        'ai-agency-settings',
        'Client Dashboard',
        'Client Dashboard',
        'manage_options',
        'ai-agency-dashboard',
        'ai_agency_dashboard_page'
    );
    
    add_submenu_page(
        'ai-agency-settings',
        'Payment Settings',
        'Payment Settings',
        'manage_options',
        'ai-agency-payments',
        'ai_agency_payments_page'
    );
    
    add_submenu_page(
        'ai-agency-settings',
        'Analytics',
        'Analytics',
        'manage_options',
        'ai-agency-analytics',
        'ai_agency_analytics_page'
    );
}
add_action('admin_menu', 'ai_agency_admin_menu');

// Main settings page
function ai_agency_settings_page() {
    if (isset($_POST['submit'])) {
        // Save settings
        $settings = array(
            'site_title' => sanitize_text_field($_POST['site_title']),
            'site_description' => sanitize_textarea_field($_POST['site_description']),
            'contact_email' => sanitize_email($_POST['contact_email']),
            'contact_phone' => sanitize_text_field($_POST['contact_phone']),
            'google_calendar_url' => esc_url_raw($_POST['google_calendar_url']),
            'ai_agent_embed_url' => esc_url_raw($_POST['ai_agent_embed_url']),
            'linkedin_url' => esc_url_raw($_POST['linkedin_url']),
            'twitter_url' => esc_url_raw($_POST['twitter_url']),
            'facebook_url' => esc_url_raw($_POST['facebook_url']),
            'youtube_url' => esc_url_raw($_POST['youtube_url']),
            'instagram_url' => esc_url_raw($_POST['instagram_url']),
            'google_analytics_id' => sanitize_text_field($_POST['google_analytics_id']),
            'facebook_pixel_id' => sanitize_text_field($_POST['facebook_pixel_id']),
            'custom_css' => wp_strip_all_tags($_POST['custom_css']),
        );
        
        foreach ($settings as $key => $value) {
            update_option($key, $value);
        }
        
        echo '<div class="notice notice-success"><p>Settings saved successfully!</p></div>';
    }
    
    // Get current settings
    $settings = array(
        'site_title' => get_option('site_title', 'BookAI Studio'),
        'site_description' => get_option('site_description', 'Expert AI consulting and automation solutions for small businesses'),
        'contact_email' => get_option('contact_email', 'info@bookaistudio.com'),
        'contact_phone' => get_option('contact_phone', '+1 (555) 123-4567'),
        'google_calendar_url' => get_option('google_calendar_url', ''),
        'ai_agent_embed_url' => get_option('ai_agent_embed_url', ''),
        'linkedin_url' => get_option('linkedin_url', ''),
        'twitter_url' => get_option('twitter_url', ''),
        'facebook_url' => get_option('facebook_url', ''),
        'youtube_url' => get_option('youtube_url', ''),
        'instagram_url' => get_option('instagram_url', ''),
        'google_analytics_id' => get_option('google_analytics_id', ''),
        'facebook_pixel_id' => get_option('facebook_pixel_id', ''),
        'custom_css' => get_option('custom_css', ''),
    );
    ?>
    
    <div class="wrap ai-agency-admin">
        <h1>AI Agency Settings</h1>
        
        <form method="post" action="">
            <?php wp_nonce_field('ai_agency_settings_nonce'); ?>
            
            <div class="ai-agency-tabs">
                <nav class="nav-tab-wrapper">
                    <a href="#general" class="nav-tab nav-tab-active">General</a>
                    <a href="#contact" class="nav-tab">Contact</a>
                    <a href="#integrations" class="nav-tab">Integrations</a>
                    <a href="#social" class="nav-tab">Social Media</a>
                    <a href="#analytics" class="nav-tab">Analytics</a>
                    <a href="#advanced" class="nav-tab">Advanced</a>
                </nav>
                
                <!-- General Tab -->
                <div id="general" class="tab-content active">
                    <h2>General Settings</h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row">Site Title</th>
                            <td>
                                <input type="text" name="site_title" value="<?php echo esc_attr($settings['site_title']); ?>" class="regular-text" />
                                <p class="description">Your agency name displayed in the header</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Site Description</th>
                            <td>
                                <textarea name="site_description" rows="3" cols="50" class="large-text"><?php echo esc_textarea($settings['site_description']); ?></textarea>
                                <p class="description">Brief description for SEO and social media</p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- Contact Tab -->
                <div id="contact" class="tab-content">
                    <h2>Contact Information</h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row">Contact Email</th>
                            <td>
                                <input type="email" name="contact_email" value="<?php echo esc_attr($settings['contact_email']); ?>" class="regular-text" />
                                <p class="description">Primary contact email address</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Contact Phone</th>
                            <td>
                                <input type="text" name="contact_phone" value="<?php echo esc_attr($settings['contact_phone']); ?>" class="regular-text" />
                                <p class="description">Phone number for contact display</p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- Integrations Tab -->
                <div id="integrations" class="tab-content">
                    <h2>Third-Party Integrations</h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row">Google Calendar URL</th>
                            <td>
                                <input type="url" name="google_calendar_url" value="<?php echo esc_attr($settings['google_calendar_url']); ?>" class="large-text" />
                                <p class="description">Your Google Calendar booking link for free consultations</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">AI Agent Embed URL</th>
                            <td>
                                <input type="url" name="ai_agent_embed_url" value="<?php echo esc_attr($settings['ai_agent_embed_url']); ?>" class="large-text" />
                                <p class="description">URL for your external AI agent iframe embed</p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- Social Media Tab -->
                <div id="social" class="tab-content">
                    <h2>Social Media Links</h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row">LinkedIn URL</th>
                            <td><input type="url" name="linkedin_url" value="<?php echo esc_attr($settings['linkedin_url']); ?>" class="large-text" /></td>
                        </tr>
                        <tr>
                            <th scope="row">Twitter URL</th>
                            <td><input type="url" name="twitter_url" value="<?php echo esc_attr($settings['twitter_url']); ?>" class="large-text" /></td>
                        </tr>
                        <tr>
                            <th scope="row">Facebook URL</th>
                            <td><input type="url" name="facebook_url" value="<?php echo esc_attr($settings['facebook_url']); ?>" class="large-text" /></td>
                        </tr>
                        <tr>
                            <th scope="row">YouTube URL</th>
                            <td><input type="url" name="youtube_url" value="<?php echo esc_attr($settings['youtube_url']); ?>" class="large-text" /></td>
                        </tr>
                        <tr>
                            <th scope="row">Instagram URL</th>
                            <td><input type="url" name="instagram_url" value="<?php echo esc_attr($settings['instagram_url']); ?>" class="large-text" /></td>
                        </tr>
                    </table>
                </div>
                
                <!-- Analytics Tab -->
                <div id="analytics" class="tab-content">
                    <h2>Analytics & Tracking</h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row">Google Analytics ID</th>
                            <td>
                                <input type="text" name="google_analytics_id" value="<?php echo esc_attr($settings['google_analytics_id']); ?>" class="regular-text" placeholder="G-XXXXXXXXXX" />
                                <p class="description">Google Analytics 4 Measurement ID</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Facebook Pixel ID</th>
                            <td>
                                <input type="text" name="facebook_pixel_id" value="<?php echo esc_attr($settings['facebook_pixel_id']); ?>" class="regular-text" placeholder="123456789012345" />
                                <p class="description">Facebook Pixel ID for conversion tracking</p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- Advanced Tab -->
                <div id="advanced" class="tab-content">
                    <h2>Advanced Settings</h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row">Custom CSS</th>
                            <td>
                                <textarea name="custom_css" rows="10" cols="50" class="large-text code"><?php echo esc_textarea($settings['custom_css']); ?></textarea>
                                <p class="description">Add custom CSS to override theme styles</p>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <?php submit_button('Save Settings'); ?>
        </form>
    </div>
    
    <style>
    .ai-agency-admin .nav-tab-wrapper {
        margin-bottom: 20px;
    }
    
    .ai-agency-admin .tab-content {
        display: none;
        background: #fff;
        padding: 20px;
        border: 1px solid #ccd0d4;
        border-top: none;
    }
    
    .ai-agency-admin .tab-content.active {
        display: block;
    }
    
    .ai-agency-admin .form-table th {
        width: 200px;
    }
    </style>
    
    <script>
    jQuery(document).ready(function($) {
        $('.nav-tab').click(function(e) {
            e.preventDefault();
            
            // Remove active class from all tabs and content
            $('.nav-tab').removeClass('nav-tab-active');
            $('.tab-content').removeClass('active');
            
            // Add active class to clicked tab
            $(this).addClass('nav-tab-active');
            
            // Show corresponding content
            var target = $(this).attr('href');
            $(target).addClass('active');
        });
    });
    </script>
    
    <?php
}

// Client Dashboard Page
function ai_agency_dashboard_page() {
    ?>
    <div class="wrap">
        <h1>Client Dashboard</h1>
        
        <div class="ai-agency-dashboard">
            <!-- Dashboard will be loaded here -->
            <div id="client-dashboard-app"></div>
        </div>
        
        <script>
        // Load React dashboard component
        document.addEventListener('DOMContentLoaded', function() {
            // Dashboard initialization will be added here
            console.log('Client Dashboard loaded');
        });
        </script>
    </div>
    <?php
}

// Payment Settings Page
function ai_agency_payments_page() {
    if (isset($_POST['submit'])) {
        // Save payment settings
        $payment_settings = array(
            'stripe_publishable_key' => sanitize_text_field($_POST['stripe_publishable_key']),
            'stripe_secret_key' => sanitize_text_field($_POST['stripe_secret_key']),
            'paypal_client_id' => sanitize_text_field($_POST['paypal_client_id']),
            'paypal_client_secret' => sanitize_text_field($_POST['paypal_client_secret']),
            'paypal_mode' => sanitize_text_field($_POST['paypal_mode']),
            'currency' => sanitize_text_field($_POST['currency']),
        );
        
        foreach ($payment_settings as $key => $value) {
            update_option($key, $value);
        }
        
        echo '<div class="notice notice-success"><p>Payment settings saved successfully!</p></div>';
    }
    
    // Get current payment settings
    $payment_settings = array(
        'stripe_publishable_key' => get_option('stripe_publishable_key', ''),
        'stripe_secret_key' => get_option('stripe_secret_key', ''),
        'paypal_client_id' => get_option('paypal_client_id', ''),
        'paypal_client_secret' => get_option('paypal_client_secret', ''),
        'paypal_mode' => get_option('paypal_mode', 'sandbox'),
        'currency' => get_option('currency', 'USD'),
    );
    ?>
    
    <div class="wrap">
        <h1>Payment Settings</h1>
        
        <form method="post" action="">
            <?php wp_nonce_field('ai_agency_payment_settings_nonce'); ?>
            
            <div class="ai-agency-tabs">
                <nav class="nav-tab-wrapper">
                    <a href="#stripe" class="nav-tab nav-tab-active">Stripe</a>
                    <a href="#paypal" class="nav-tab">PayPal</a>
                    <a href="#general-payment" class="nav-tab">General</a>
                </nav>
                
                <!-- Stripe Tab -->
                <div id="stripe" class="tab-content active">
                    <h2>Stripe Configuration</h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row">Publishable Key</th>
                            <td>
                                <input type="text" name="stripe_publishable_key" value="<?php echo esc_attr($payment_settings['stripe_publishable_key']); ?>" class="large-text" placeholder="pk_test_..." />
                                <p class="description">Stripe publishable key (starts with pk_)</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Secret Key</th>
                            <td>
                                <input type="password" name="stripe_secret_key" value="<?php echo esc_attr($payment_settings['stripe_secret_key']); ?>" class="large-text" placeholder="sk_test_..." />
                                <p class="description">Stripe secret key (starts with sk_)</p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- PayPal Tab -->
                <div id="paypal" class="tab-content">
                    <h2>PayPal Configuration</h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row">Client ID</th>
                            <td>
                                <input type="text" name="paypal_client_id" value="<?php echo esc_attr($payment_settings['paypal_client_id']); ?>" class="large-text" />
                                <p class="description">PayPal application client ID</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Client Secret</th>
                            <td>
                                <input type="password" name="paypal_client_secret" value="<?php echo esc_attr($payment_settings['paypal_client_secret']); ?>" class="large-text" />
                                <p class="description">PayPal application client secret</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Mode</th>
                            <td>
                                <select name="paypal_mode">
                                    <option value="sandbox" <?php selected($payment_settings['paypal_mode'], 'sandbox'); ?>>Sandbox (Testing)</option>
                                    <option value="live" <?php selected($payment_settings['paypal_mode'], 'live'); ?>>Live (Production)</option>
                                </select>
                                <p class="description">PayPal environment mode</p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- General Payment Tab -->
                <div id="general-payment" class="tab-content">
                    <h2>General Payment Settings</h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row">Currency</th>
                            <td>
                                <select name="currency">
                                    <option value="USD" <?php selected($payment_settings['currency'], 'USD'); ?>>USD - US Dollar</option>
                                    <option value="EUR" <?php selected($payment_settings['currency'], 'EUR'); ?>>EUR - Euro</option>
                                    <option value="GBP" <?php selected($payment_settings['currency'], 'GBP'); ?>>GBP - British Pound</option>
                                    <option value="CAD" <?php selected($payment_settings['currency'], 'CAD'); ?>>CAD - Canadian Dollar</option>
                                    <option value="AUD" <?php selected($payment_settings['currency'], 'AUD'); ?>>AUD - Australian Dollar</option>
                                </select>
                                <p class="description">Default currency for payments</p>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <?php submit_button('Save Payment Settings'); ?>
        </form>
    </div>
    
    <style>
    .ai-agency-admin .nav-tab-wrapper {
        margin-bottom: 20px;
    }
    
    .ai-agency-admin .tab-content {
        display: none;
        background: #fff;
        padding: 20px;
        border: 1px solid #ccd0d4;
        border-top: none;
    }
    
    .ai-agency-admin .tab-content.active {
        display: block;
    }
    </style>
    
    <script>
    jQuery(document).ready(function($) {
        $('.nav-tab').click(function(e) {
            e.preventDefault();
            
            $('.nav-tab').removeClass('nav-tab-active');
            $('.tab-content').removeClass('active');
            
            $(this).addClass('nav-tab-active');
            
            var target = $(this).attr('href');
            $(target).addClass('active');
        });
    });
    </script>
    
    <?php
}

// Analytics Page
function ai_agency_analytics_page() {
    ?>
    <div class="wrap">
        <h1>Analytics Dashboard</h1>
        
        <div class="ai-agency-analytics">
            <!-- Analytics dashboard will be loaded here -->
            <div id="analytics-dashboard-app"></div>
        </div>
    </div>
    <?php
}

// Handle contact form submissions
function ai_agency_handle_contact_form() {
    if (!wp_verify_nonce($_POST['_wpnonce'], 'ai_agency_contact_nonce')) {
        wp_die('Security check failed');
    }
    
    $name = sanitize_text_field($_POST['contact_name']);
    $email = sanitize_email($_POST['contact_email']);
    $phone = sanitize_text_field($_POST['contact_phone']);
    $company = sanitize_text_field($_POST['contact_company']);
    $service = sanitize_text_field($_POST['contact_service']);
    $message = sanitize_textarea_field($_POST['contact_message']);
    
    // Save to database
    global $wpdb;
    $table_name = $wpdb->prefix . 'ai_agency_contacts';
    
    $wpdb->insert(
        $table_name,
        array(
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'company' => $company,
            'service_interest' => $service,
            'message' => $message,
            'created_at' => current_time('mysql'),
            'status' => 'new'
        )
    );
    
    // Send email notification
    $admin_email = get_option('admin_email');
    $subject = 'New Contact Form Submission - ' . $service;
    $email_message = "New contact form submission:\n\n";
    $email_message .= "Name: $name\n";
    $email_message .= "Email: $email\n";
    $email_message .= "Phone: $phone\n";
    $email_message .= "Company: $company\n";
    $email_message .= "Service Interest: $service\n";
    $email_message .= "Message: $message\n";
    
    wp_mail($admin_email, $subject, $email_message);
    
    // Redirect back with success message
    wp_redirect(home_url('/?contact=success'));
    exit;
}
add_action('admin_post_ai_agency_contact', 'ai_agency_handle_contact_form');
add_action('admin_post_nopriv_ai_agency_contact', 'ai_agency_handle_contact_form');

// Create database tables on theme activation
function ai_agency_create_tables() {
    global $wpdb;
    
    $charset_collate = $wpdb->get_charset_collate();
    
    // Contacts table
    $contacts_table = $wpdb->prefix . 'ai_agency_contacts';
    $contacts_sql = "CREATE TABLE $contacts_table (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        name tinytext NOT NULL,
        email varchar(100) NOT NULL,
        phone varchar(20),
        company tinytext,
        service_interest varchar(50),
        message text,
        status varchar(20) DEFAULT 'new',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) $charset_collate;";
    
    // Clients table
    $clients_table = $wpdb->prefix . 'ai_agency_clients';
    $clients_sql = "CREATE TABLE $clients_table (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        user_id mediumint(9),
        company_name tinytext NOT NULL,
        contact_name tinytext NOT NULL,
        email varchar(100) NOT NULL,
        phone varchar(20),
        package_type varchar(50),
        monthly_revenue decimal(10,2) DEFAULT 0,
        total_spent decimal(10,2) DEFAULT 0,
        status varchar(20) DEFAULT 'active',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) $charset_collate;";
    
    // Payments table
    $payments_table = $wpdb->prefix . 'ai_agency_payments';
    $payments_sql = "CREATE TABLE $payments_table (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        client_id mediumint(9),
        amount decimal(10,2) NOT NULL,
        currency varchar(3) DEFAULT 'USD',
        payment_method varchar(20),
        transaction_id varchar(100),
        status varchar(20) DEFAULT 'pending',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($contacts_sql);
    dbDelta($clients_sql);
    dbDelta($payments_sql);
}

// Activate theme
function ai_agency_theme_activation() {
    ai_agency_create_tables();
    
    // Set default options
    $default_options = array(
        'site_title' => 'BookAI Studio',
        'site_description' => 'Expert AI consulting and automation solutions for small businesses',
        'contact_email' => 'info@bookaistudio.com',
        'contact_phone' => '+1 (555) 123-4567',
        'show_cookie_consent' => true,
        'currency' => 'USD',
    );
    
    foreach ($default_options as $key => $value) {
        if (!get_option($key)) {
            update_option($key, $value);
        }
    }
}
add_action('after_switch_theme', 'ai_agency_theme_activation');

// Add custom post types for packages and services
function ai_agency_custom_post_types() {
    // Service Packages
    register_post_type('service_package', array(
        'labels' => array(
            'name' => 'Service Packages',
            'singular_name' => 'Service Package',
            'add_new' => 'Add New Package',
            'add_new_item' => 'Add New Service Package',
            'edit_item' => 'Edit Service Package',
            'new_item' => 'New Service Package',
            'view_item' => 'View Service Package',
            'search_items' => 'Search Service Packages',
            'not_found' => 'No service packages found',
            'not_found_in_trash' => 'No service packages found in trash'
        ),
        'public' => true,
        'has_archive' => true,
        'supports' => array('title', 'editor', 'thumbnail', 'custom-fields'),
        'menu_icon' => 'dashicons-portfolio',
        'show_in_rest' => true,
    ));
    
    // Client Projects
    register_post_type('client_project', array(
        'labels' => array(
            'name' => 'Client Projects',
            'singular_name' => 'Client Project',
            'add_new' => 'Add New Project',
            'add_new_item' => 'Add New Client Project',
            'edit_item' => 'Edit Client Project',
            'new_item' => 'New Client Project',
            'view_item' => 'View Client Project',
            'search_items' => 'Search Client Projects',
            'not_found' => 'No client projects found',
            'not_found_in_trash' => 'No client projects found in trash'
        ),
        'public' => false,
        'show_ui' => true,
        'supports' => array('title', 'editor', 'custom-fields'),
        'menu_icon' => 'dashicons-businessman',
        'capability_type' => 'post',
        'capabilities' => array(
            'read_post' => 'manage_options',
            'edit_post' => 'manage_options',
            'delete_post' => 'manage_options',
        ),
    ));
}
add_action('init', 'ai_agency_custom_post_types');

// Add meta boxes for service packages
function ai_agency_add_meta_boxes() {
    add_meta_box(
        'package_details',
        'Package Details',
        'ai_agency_package_details_callback',
        'service_package',
        'normal',
        'high'
    );
}
add_action('add_meta_boxes', 'ai_agency_add_meta_boxes');

function ai_agency_package_details_callback($post) {
    wp_nonce_field('ai_agency_package_details_nonce', 'ai_agency_package_details_nonce');
    
    $price = get_post_meta($post->ID, '_package_price', true);
    $billing_cycle = get_post_meta($post->ID, '_billing_cycle', true);
    $features = get_post_meta($post->ID, '_package_features', true);
    $is_featured = get_post_meta($post->ID, '_is_featured', true);
    
    ?>
    <table class="form-table">
        <tr>
            <th scope="row">Price</th>
            <td>
                <input type="number" name="package_price" value="<?php echo esc_attr($price); ?>" step="0.01" />
                <p class="description">Package price in your default currency</p>
            </td>
        </tr>
        <tr>
            <th scope="row">Billing Cycle</th>
            <td>
                <select name="billing_cycle">
                    <option value="one-time" <?php selected($billing_cycle, 'one-time'); ?>>One-time</option>
                    <option value="monthly" <?php selected($billing_cycle, 'monthly'); ?>>Monthly</option>
                    <option value="yearly" <?php selected($billing_cycle, 'yearly'); ?>>Yearly</option>
                </select>
            </td>
        </tr>
        <tr>
            <th scope="row">Features</th>
            <td>
                <textarea name="package_features" rows="5" cols="50" class="large-text"><?php echo esc_textarea($features); ?></textarea>
                <p class="description">One feature per line</p>
            </td>
        </tr>
        <tr>
            <th scope="row">Featured Package</th>
            <td>
                <label>
                    <input type="checkbox" name="is_featured" value="1" <?php checked($is_featured, '1'); ?> />
                    Mark as featured package
                </label>
            </td>
        </tr>
    </table>
    <?php
}

// Save package meta data
function ai_agency_save_package_meta($post_id) {
    if (!isset($_POST['ai_agency_package_details_nonce']) || 
        !wp_verify_nonce($_POST['ai_agency_package_details_nonce'], 'ai_agency_package_details_nonce')) {
        return;
    }
    
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }
    
    $fields = array('package_price', 'billing_cycle', 'package_features', 'is_featured');
    
    foreach ($fields as $field) {
        if (isset($_POST[$field])) {
            update_post_meta($post_id, '_' . $field, sanitize_text_field($_POST[$field]));
        }
    }
}
add_action('save_post', 'ai_agency_save_package_meta');

// AJAX handlers for dashboard functionality
function ai_agency_get_dashboard_data() {
    check_ajax_referer('ai_agency_nonce', 'nonce');
    
    global $wpdb;
    
    // Get contacts count
    $contacts_table = $wpdb->prefix . 'ai_agency_contacts';
    $contacts_count = $wpdb->get_var("SELECT COUNT(*) FROM $contacts_table WHERE status = 'new'");
    
    // Get clients count
    $clients_table = $wpdb->prefix . 'ai_agency_clients';
    $clients_count = $wpdb->get_var("SELECT COUNT(*) FROM $clients_table WHERE status = 'active'");
    
    // Get revenue data
    $payments_table = $wpdb->prefix . 'ai_agency_payments';
    $monthly_revenue = $wpdb->get_var("SELECT SUM(amount) FROM $payments_table WHERE status = 'completed' AND MONTH(created_at) = MONTH(CURRENT_DATE())");
    
    wp_send_json_success(array(
        'contacts' => intval($contacts_count),
        'clients' => intval($clients_count),
        'monthly_revenue' => floatval($monthly_revenue),
        'currency' => get_option('currency', 'USD')
    ));
}
add_action('wp_ajax_ai_agency_get_dashboard_data', 'ai_agency_get_dashboard_data');

// Security enhancements
function ai_agency_security_headers() {
    if (!is_admin()) {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');
    }
}
add_action('send_headers', 'ai_agency_security_headers');

// Disable file editing in admin
define('DISALLOW_FILE_EDIT', true);

// Remove WordPress version from head
remove_action('wp_head', 'wp_generator');

// Custom login page styling
function ai_agency_login_styles() {
    ?>
    <style>
    body.login {
        background: linear-gradient(135deg, #0a1628 0%, #1a2332 50%, #0f1419 100%);
    }
    
    .login h1 a {
        background-image: none;
        color: #d4af37;
        font-size: 24px;
        font-weight: bold;
        text-decoration: none;
        width: auto;
        height: auto;
    }
    
    .login form {
        background: rgba(42, 52, 65, 0.9);
        border: 1px solid #d4af37;
        border-radius: 10px;
    }
    
    .login form .input {
        background: rgba(10, 22, 40, 0.8);
        border: 1px solid #d4af37;
        color: #ffffff;
    }
    
    .login form .button-primary {
        background: linear-gradient(135deg, #d4af37 0%, #f4e4a6 50%, #b8941f 100%);
        border: none;
        color: #0a1628;
        font-weight: bold;
    }
    </style>
    <?php
}
add_action('login_head', 'ai_agency_login_styles');

// Custom login logo URL
function ai_agency_login_logo_url() {
    return home_url();
}
add_filter('login_headerurl', 'ai_agency_login_logo_url');

// Custom login logo title
function ai_agency_login_logo_title() {
    return get_option('site_title', 'BookAI Studio');
}
add_filter('login_headertitle', 'ai_agency_login_logo_title');

?>

