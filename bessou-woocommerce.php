<?php
/**
 * Plugin Name: Bessou Hair Beauty - WooCommerce Integration
 * Plugin URI: https://bessouhairbeauty.com
 * Description: Complete WooCommerce integration for hair product sales with custom features for Bessou Hair Beauty salon.
 * Version: 1.0.0
 * Author: BookAI Studio
 * License: GPL v2 or later
 * Text Domain: bessou-woocommerce
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('BESSOU_WC_VERSION', '1.0.0');
define('BESSOU_WC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BESSOU_WC_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main Bessou WooCommerce Class
 */
class Bessou_WooCommerce {
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('plugins_loaded', array($this, 'check_woocommerce'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    /**
     * Initialize plugin
     */
    public function init() {
        // Load text domain
        load_plugin_textdomain('bessou-woocommerce', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Initialize hooks
        $this->init_hooks();
        
        // Add custom product types
        $this->add_custom_product_types();
        
        // Customize WooCommerce
        $this->customize_woocommerce();
    }
    
    /**
     * Check if WooCommerce is active
     */
    public function check_woocommerce() {
        if (!class_exists('WooCommerce')) {
            add_action('admin_notices', array($this, 'woocommerce_missing_notice'));
            return;
        }
    }
    
    /**
     * WooCommerce missing notice
     */
    public function woocommerce_missing_notice() {
        echo '<div class="error"><p><strong>Bessou Hair Beauty WooCommerce Integration</strong> requires WooCommerce to be installed and active.</p></div>';
    }
    
    /**
     * Initialize hooks
     */
    private function init_hooks() {
        // Product customizations
        add_action('woocommerce_product_options_general_product_data', array($this, 'add_hair_product_fields'));
        add_action('woocommerce_process_product_meta', array($this, 'save_hair_product_fields'));
        add_action('woocommerce_single_product_summary', array($this, 'display_hair_product_info'), 25);
        
        // Cart and checkout customizations
        add_filter('woocommerce_add_cart_item_data', array($this, 'add_cart_item_data'), 10, 3);
        add_filter('woocommerce_checkout_fields', array($this, 'customize_checkout_fields'));
        add_action('woocommerce_checkout_order_processed', array($this, 'process_hair_product_order'));
        
        // Shop customizations
        add_action('woocommerce_shop_loop_item_title', array($this, 'add_product_badges'), 5);
        add_filter('woocommerce_product_tabs', array($this, 'add_hair_care_tab'));
        
        // Admin customizations
        add_filter('manage_edit-product_columns', array($this, 'add_product_columns'));
        add_action('manage_product_posts_custom_column', array($this, 'populate_product_columns'), 10, 2);
        
        // Email customizations
        add_action('woocommerce_email_order_details', array($this, 'add_hair_care_instructions'), 20, 4);
    }
    
    /**
     * Add custom product types for hair products
     */
    private function add_custom_product_types() {
        // Hair Extension Product Type
        add_filter('product_type_selector', array($this, 'add_hair_extension_product_type'));
        add_action('woocommerce_product_options_general_product_data', array($this, 'hair_extension_options'));
        add_action('woocommerce_process_product_meta', array($this, 'save_hair_extension_options'));
        
        // Hair Care Product Type
        add_filter('product_type_selector', array($this, 'add_hair_care_product_type'));
        add_action('woocommerce_product_options_general_product_data', array($this, 'hair_care_options'));
        add_action('woocommerce_process_product_meta', array($this, 'save_hair_care_options'));
    }
    
    /**
     * Add hair extension product type
     */
    public function add_hair_extension_product_type($types) {
        $types['hair_extension'] = __('Hair Extension', 'bessou-woocommerce');
        return $types;
    }
    
    /**
     * Add hair care product type
     */
    public function add_hair_care_product_type($types) {
        $types['hair_care'] = __('Hair Care Product', 'bessou-woocommerce');
        return $types;
    }
    
    /**
     * Add hair product fields
     */
    public function add_hair_product_fields() {
        global $post;
        
        echo '<div class="options_group">';
        
        // Hair Type
        woocommerce_wp_select(array(
            'id' => '_hair_type',
            'label' => __('Hair Type', 'bessou-woocommerce'),
            'options' => array(
                '' => __('Select hair type...', 'bessou-woocommerce'),
                'human' => __('Human Hair', 'bessou-woocommerce'),
                'synthetic' => __('Synthetic Hair', 'bessou-woocommerce'),
                'blend' => __('Human/Synthetic Blend', 'bessou-woocommerce'),
            ),
        ));
        
        // Hair Length
        woocommerce_wp_select(array(
            'id' => '_hair_length',
            'label' => __('Hair Length', 'bessou-woocommerce'),
            'options' => array(
                '' => __('Select length...', 'bessou-woocommerce'),
                '8-12' => __('8-12 inches', 'bessou-woocommerce'),
                '14-18' => __('14-18 inches', 'bessou-woocommerce'),
                '20-24' => __('20-24 inches', 'bessou-woocommerce'),
                '26-30' => __('26-30 inches', 'bessou-woocommerce'),
                '32+' => __('32+ inches', 'bessou-woocommerce'),
            ),
        ));
        
        // Hair Texture
        woocommerce_wp_select(array(
            'id' => '_hair_texture',
            'label' => __('Hair Texture', 'bessou-woocommerce'),
            'options' => array(
                '' => __('Select texture...', 'bessou-woocommerce'),
                'straight' => __('Straight', 'bessou-woocommerce'),
                'wavy' => __('Wavy', 'bessou-woocommerce'),
                'curly' => __('Curly', 'bessou-woocommerce'),
                'kinky' => __('Kinky', 'bessou-woocommerce'),
                'coily' => __('Coily', 'bessou-woocommerce'),
            ),
        ));
        
        // Hair Color
        woocommerce_wp_text_input(array(
            'id' => '_hair_color',
            'label' => __('Hair Color', 'bessou-woocommerce'),
            'placeholder' => __('e.g., Natural Black, #1B, Ombre', 'bessou-woocommerce'),
        ));
        
        // Bundle Weight
        woocommerce_wp_text_input(array(
            'id' => '_bundle_weight',
            'label' => __('Bundle Weight (oz)', 'bessou-woocommerce'),
            'type' => 'number',
            'custom_attributes' => array(
                'step' => '0.1',
                'min' => '0',
            ),
        ));
        
        // Recommended for Styles
        woocommerce_wp_textarea_input(array(
            'id' => '_recommended_styles',
            'label' => __('Recommended for Styles', 'bessou-woocommerce'),
            'placeholder' => __('e.g., Box braids, Senegalese twists, Cornrows', 'bessou-woocommerce'),
        ));
        
        // Care Instructions
        woocommerce_wp_textarea_input(array(
            'id' => '_care_instructions',
            'label' => __('Care Instructions', 'bessou-woocommerce'),
            'placeholder' => __('Special care instructions for this hair type', 'bessou-woocommerce'),
        ));
        
        // Professional Use Only
        woocommerce_wp_checkbox(array(
            'id' => '_professional_only',
            'label' => __('Professional Use Only', 'bessou-woocommerce'),
            'description' => __('Check if this product is for professional stylists only', 'bessou-woocommerce'),
        ));
        
        echo '</div>';
    }
    
    /**
     * Save hair product fields
     */
    public function save_hair_product_fields($post_id) {
        $fields = array(
            '_hair_type',
            '_hair_length',
            '_hair_texture',
            '_hair_color',
            '_bundle_weight',
            '_recommended_styles',
            '_care_instructions',
            '_professional_only',
        );
        
        foreach ($fields as $field) {
            if (isset($_POST[$field])) {
                update_post_meta($post_id, $field, sanitize_text_field($_POST[$field]));
            }
        }
    }
    
    /**
     * Display hair product info on single product page
     */
    public function display_hair_product_info() {
        global $product;
        
        $hair_type = get_post_meta($product->get_id(), '_hair_type', true);
        $hair_length = get_post_meta($product->get_id(), '_hair_length', true);
        $hair_texture = get_post_meta($product->get_id(), '_hair_texture', true);
        $hair_color = get_post_meta($product->get_id(), '_hair_color', true);
        $bundle_weight = get_post_meta($product->get_id(), '_bundle_weight', true);
        $recommended_styles = get_post_meta($product->get_id(), '_recommended_styles', true);
        $professional_only = get_post_meta($product->get_id(), '_professional_only', true);
        
        if ($hair_type || $hair_length || $hair_texture) {
            echo '<div class="hair-product-info" style="background: #f8f8f8; padding: 20px; margin: 20px 0; border-radius: 10px;">';
            echo '<h3 style="color: #8B4513; margin-bottom: 15px;">Hair Specifications</h3>';
            
            if ($hair_type) {
                echo '<p><strong>Hair Type:</strong> ' . esc_html($hair_type) . '</p>';
            }
            if ($hair_length) {
                echo '<p><strong>Length:</strong> ' . esc_html($hair_length) . '</p>';
            }
            if ($hair_texture) {
                echo '<p><strong>Texture:</strong> ' . esc_html($hair_texture) . '</p>';
            }
            if ($hair_color) {
                echo '<p><strong>Color:</strong> ' . esc_html($hair_color) . '</p>';
            }
            if ($bundle_weight) {
                echo '<p><strong>Bundle Weight:</strong> ' . esc_html($bundle_weight) . ' oz</p>';
            }
            if ($recommended_styles) {
                echo '<p><strong>Recommended for:</strong> ' . esc_html($recommended_styles) . '</p>';
            }
            if ($professional_only) {
                echo '<p style="color: #DAA520; font-weight: bold;">⚠️ Professional Use Only</p>';
            }
            
            echo '</div>';
        }
    }
    
    /**
     * Add cart item data
     */
    public function add_cart_item_data($cart_item_data, $product_id, $variation_id) {
        // Add hair product specifications to cart
        $hair_type = get_post_meta($product_id, '_hair_type', true);
        $hair_length = get_post_meta($product_id, '_hair_length', true);
        
        if ($hair_type) {
            $cart_item_data['hair_type'] = $hair_type;
        }
        if ($hair_length) {
            $cart_item_data['hair_length'] = $hair_length;
        }
        
        return $cart_item_data;
    }
    
    /**
     * Customize checkout fields
     */
    public function customize_checkout_fields($fields) {
        // Add hair stylist information field
        $fields['billing']['billing_stylist_name'] = array(
            'label' => __('Your Stylist Name (Optional)', 'bessou-woocommerce'),
            'placeholder' => __('If you have a preferred stylist at Bessou Hair Beauty', 'bessou-woocommerce'),
            'required' => false,
            'class' => array('form-row-wide'),
            'priority' => 25,
        );
        
        // Add appointment booking field
        $fields['billing']['billing_book_appointment'] = array(
            'type' => 'checkbox',
            'label' => __('I would like to book an appointment for hair installation', 'bessou-woocommerce'),
            'required' => false,
            'class' => array('form-row-wide'),
            'priority' => 26,
        );
        
        return $fields;
    }
    
    /**
     * Process hair product order
     */
    public function process_hair_product_order($order_id) {
        $order = wc_get_order($order_id);
        
        // Check if appointment booking was requested
        $book_appointment = get_post_meta($order_id, '_billing_book_appointment', true);
        $stylist_name = get_post_meta($order_id, '_billing_stylist_name', true);
        
        if ($book_appointment) {
            // Add order note about appointment request
            $note = __('Customer requested appointment booking for hair installation.', 'bessou-woocommerce');
            if ($stylist_name) {
                $note .= ' ' . sprintf(__('Preferred stylist: %s', 'bessou-woocommerce'), $stylist_name);
            }
            $order->add_order_note($note);
            
            // Send notification email to salon
            $this->send_appointment_request_email($order);
        }
        
        // Add hair product care instructions to order
        $this->add_care_instructions_to_order($order);
    }
    
    /**
     * Send appointment request email
     */
    private function send_appointment_request_email($order) {
        $to = get_option('admin_email');
        $subject = 'New Appointment Request - Hair Product Order #' . $order->get_order_number();
        
        $message = "A customer has requested an appointment for hair installation:\n\n";
        $message .= "Order: #" . $order->get_order_number() . "\n";
        $message .= "Customer: " . $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() . "\n";
        $message .= "Email: " . $order->get_billing_email() . "\n";
        $message .= "Phone: " . $order->get_billing_phone() . "\n";
        
        $stylist_name = get_post_meta($order->get_id(), '_billing_stylist_name', true);
        if ($stylist_name) {
            $message .= "Preferred Stylist: " . $stylist_name . "\n";
        }
        
        $message .= "\nProducts Ordered:\n";
        foreach ($order->get_items() as $item) {
            $message .= "- " . $item->get_name() . " (Qty: " . $item->get_quantity() . ")\n";
        }
        
        wp_mail($to, $subject, $message);
    }
    
    /**
     * Add care instructions to order
     */
    private function add_care_instructions_to_order($order) {
        $care_instructions = array();
        
        foreach ($order->get_items() as $item) {
            $product_id = $item->get_product_id();
            $instructions = get_post_meta($product_id, '_care_instructions', true);
            
            if ($instructions) {
                $care_instructions[] = $item->get_name() . ': ' . $instructions;
            }
        }
        
        if (!empty($care_instructions)) {
            $note = "Hair Care Instructions:\n" . implode("\n", $care_instructions);
            $order->add_order_note($note, 1); // 1 = customer note
        }
    }
    
    /**
     * Add product badges in shop
     */
    public function add_product_badges() {
        global $product;
        
        $hair_type = get_post_meta($product->get_id(), '_hair_type', true);
        $professional_only = get_post_meta($product->get_id(), '_professional_only', true);
        
        if ($hair_type === 'human') {
            echo '<span class="hair-badge human-hair" style="background: #DAA520; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-right: 5px;">100% Human Hair</span>';
        }
        
        if ($professional_only) {
            echo '<span class="hair-badge professional" style="background: #8B4513; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">Professional Only</span>';
        }
    }
    
    /**
     * Add hair care tab to product page
     */
    public function add_hair_care_tab($tabs) {
        $tabs['hair_care'] = array(
            'title' => __('Hair Care Guide', 'bessou-woocommerce'),
            'priority' => 50,
            'callback' => array($this, 'hair_care_tab_content'),
        );
        
        return $tabs;
    }
    
    /**
     * Hair care tab content
     */
    public function hair_care_tab_content() {
        global $product;
        
        $care_instructions = get_post_meta($product->get_id(), '_care_instructions', true);
        $hair_type = get_post_meta($product->get_id(), '_hair_type', true);
        
        echo '<div class="hair-care-guide">';
        
        if ($care_instructions) {
            echo '<h3>Product-Specific Care Instructions</h3>';
            echo '<p>' . nl2br(esc_html($care_instructions)) . '</p>';
        }
        
        echo '<h3>General Hair Care Tips</h3>';
        
        if ($hair_type === 'human') {
            echo '<ul>';
            echo '<li>Wash with sulfate-free shampoo</li>';
            echo '<li>Deep condition weekly</li>';
            echo '<li>Use heat protectant before styling</li>';
            echo '<li>Sleep with a silk or satin pillowcase</li>';
            echo '<li>Avoid excessive heat styling</li>';
            echo '</ul>';
        } else {
            echo '<ul>';
            echo '<li>Wash gently with mild shampoo</li>';
            echo '<li>Use cool water to prevent tangling</li>';
            echo '<li>Air dry when possible</li>';
            echo '<li>Use wide-tooth comb when wet</li>';
            echo '<li>Store properly when not in use</li>';
            echo '</ul>';
        }
        
        echo '<p><strong>Need professional installation?</strong> Book an appointment with our expert stylists at Bessou Hair Beauty!</p>';
        echo '<a href="#booking" class="button" style="background: #DAA520; color: white;">Book Appointment</a>';
        
        echo '</div>';
    }
    
    /**
     * Add product columns in admin
     */
    public function add_product_columns($columns) {
        $columns['hair_type'] = __('Hair Type', 'bessou-woocommerce');
        $columns['hair_length'] = __('Length', 'bessou-woocommerce');
        return $columns;
    }
    
    /**
     * Populate product columns
     */
    public function populate_product_columns($column, $post_id) {
        switch ($column) {
            case 'hair_type':
                echo esc_html(get_post_meta($post_id, '_hair_type', true));
                break;
            case 'hair_length':
                echo esc_html(get_post_meta($post_id, '_hair_length', true));
                break;
        }
    }
    
    /**
     * Add hair care instructions to order emails
     */
    public function add_hair_care_instructions($order, $sent_to_admin, $plain_text, $email) {
        if ($email->id === 'customer_completed_order') {
            $care_instructions = array();
            
            foreach ($order->get_items() as $item) {
                $product_id = $item->get_product_id();
                $instructions = get_post_meta($product_id, '_care_instructions', true);
                
                if ($instructions) {
                    $care_instructions[$item->get_name()] = $instructions;
                }
            }
            
            if (!empty($care_instructions)) {
                if ($plain_text) {
                    echo "\n\nHAIR CARE INSTRUCTIONS:\n";
                    foreach ($care_instructions as $product => $instruction) {
                        echo $product . ": " . $instruction . "\n";
                    }
                } else {
                    echo '<h2 style="color: #8B4513;">Hair Care Instructions</h2>';
                    foreach ($care_instructions as $product => $instruction) {
                        echo '<p><strong>' . esc_html($product) . ':</strong> ' . nl2br(esc_html($instruction)) . '</p>';
                    }
                }
            }
        }
    }
    
    /**
     * Customize WooCommerce settings
     */
    private function customize_woocommerce() {
        // Add custom CSS
        add_action('wp_head', array($this, 'add_custom_styles'));
        
        // Modify shop page
        add_action('woocommerce_before_shop_loop', array($this, 'add_hair_product_filters'));
        
        // Add to cart customizations
        add_filter('woocommerce_product_add_to_cart_text', array($this, 'custom_add_to_cart_text'));
    }
    
    /**
     * Add custom styles
     */
    public function add_custom_styles() {
        echo '<style>
            .hair-badge {
                display: inline-block;
                margin-bottom: 10px;
            }
            .hair-product-info {
                border-left: 4px solid #DAA520;
            }
            .hair-care-guide ul {
                padding-left: 20px;
            }
            .hair-care-guide li {
                margin-bottom: 8px;
            }
            .woocommerce .hair-product-filters {
                background: #f8f8f8;
                padding: 20px;
                margin-bottom: 30px;
                border-radius: 10px;
            }
        </style>';
    }
    
    /**
     * Add hair product filters
     */
    public function add_hair_product_filters() {
        echo '<div class="hair-product-filters">';
        echo '<h3 style="color: #8B4513; margin-bottom: 15px;">Shop by Hair Type</h3>';
        echo '<div class="filter-buttons" style="display: flex; gap: 10px; flex-wrap: wrap;">';
        echo '<a href="?hair_type=human" class="button" style="background: #DAA520; color: white;">Human Hair</a>';
        echo '<a href="?hair_type=synthetic" class="button" style="background: #8B4513; color: white;">Synthetic Hair</a>';
        echo '<a href="?hair_type=blend" class="button" style="background: #CD853F; color: white;">Blend</a>';
        echo '<a href="' . wc_get_page_permalink('shop') . '" class="button">All Products</a>';
        echo '</div>';
        echo '</div>';
        
        // Apply filter if set
        if (isset($_GET['hair_type'])) {
            add_action('woocommerce_product_query', array($this, 'filter_products_by_hair_type'));
        }
    }
    
    /**
     * Filter products by hair type
     */
    public function filter_products_by_hair_type($query) {
        if (!is_admin() && $query->is_main_query() && is_shop()) {
            $hair_type = sanitize_text_field($_GET['hair_type']);
            
            $query->set('meta_query', array(
                array(
                    'key' => '_hair_type',
                    'value' => $hair_type,
                    'compare' => '=',
                ),
            ));
        }
    }
    
    /**
     * Custom add to cart text
     */
    public function custom_add_to_cart_text($text) {
        global $product;
        
        $professional_only = get_post_meta($product->get_id(), '_professional_only', true);
        
        if ($professional_only) {
            return __('Add to Cart (Professional)', 'bessou-woocommerce');
        }
        
        return $text;
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Create custom database tables if needed
        $this->create_tables();
        
        // Set default options
        add_option('bessou_wc_version', BESSOU_WC_VERSION);
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Create custom database tables
     */
    private function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Hair product specifications table
        $table_name = $wpdb->prefix . 'bessou_hair_products';
        
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            product_id bigint(20) NOT NULL,
            hair_type varchar(50) DEFAULT '',
            hair_length varchar(50) DEFAULT '',
            hair_texture varchar(50) DEFAULT '',
            hair_color varchar(100) DEFAULT '',
            bundle_weight decimal(5,2) DEFAULT 0.00,
            recommended_styles text DEFAULT '',
            care_instructions text DEFAULT '',
            professional_only tinyint(1) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY product_id (product_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Initialize the plugin
new Bessou_WooCommerce();

/**
 * Helper Functions
 */

/**
 * Get hair product specifications
 */
function bessou_get_hair_specs($product_id) {
    return array(
        'hair_type' => get_post_meta($product_id, '_hair_type', true),
        'hair_length' => get_post_meta($product_id, '_hair_length', true),
        'hair_texture' => get_post_meta($product_id, '_hair_texture', true),
        'hair_color' => get_post_meta($product_id, '_hair_color', true),
        'bundle_weight' => get_post_meta($product_id, '_bundle_weight', true),
        'recommended_styles' => get_post_meta($product_id, '_recommended_styles', true),
        'care_instructions' => get_post_meta($product_id, '_care_instructions', true),
        'professional_only' => get_post_meta($product_id, '_professional_only', true),
    );
}

/**
 * Display hair product badge
 */
function bessou_hair_product_badge($product_id) {
    $hair_type = get_post_meta($product_id, '_hair_type', true);
    $professional_only = get_post_meta($product_id, '_professional_only', true);
    
    $badges = array();
    
    if ($hair_type === 'human') {
        $badges[] = '<span class="hair-badge human-hair">100% Human Hair</span>';
    }
    
    if ($professional_only) {
        $badges[] = '<span class="hair-badge professional">Professional Only</span>';
    }
    
    return implode(' ', $badges);
}

?>

