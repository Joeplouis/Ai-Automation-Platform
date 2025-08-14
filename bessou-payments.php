<?php
/**
 * Plugin Name: Bessou Hair Beauty - Multi-Payment Gateway
 * Plugin URI: https://bessouhairbeauty.com
 * Description: Complete payment solution supporting PayPal, Stripe, Zelle, Cash App with proof of payment system for appointments and product purchases.
 * Version: 1.0.0
 * Author: BookAI Studio
 * License: GPL v2 or later
 * Text Domain: bessou-payments
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
define('BESSOU_PAYMENTS_VERSION', '1.0.0');
define('BESSOU_PAYMENTS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BESSOU_PAYMENTS_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main Bessou Payments Class
 */
class Bessou_Payments {
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('plugins_loaded', array($this, 'check_dependencies'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    /**
     * Initialize plugin
     */
    public function init() {
        // Load text domain
        load_plugin_textdomain('bessou-payments', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Initialize payment gateways
        $this->init_payment_gateways();
        
        // Initialize hooks
        $this->init_hooks();
        
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
    }
    
    /**
     * Check plugin dependencies
     */
    public function check_dependencies() {
        if (!class_exists('WooCommerce')) {
            add_action('admin_notices', array($this, 'woocommerce_missing_notice'));
            return;
        }
    }
    
    /**
     * WooCommerce missing notice
     */
    public function woocommerce_missing_notice() {
        echo '<div class="error"><p><strong>Bessou Multi-Payment Gateway</strong> requires WooCommerce to be installed and active.</p></div>';
    }
    
    /**
     * Initialize payment gateways
     */
    private function init_payment_gateways() {
        // Add custom payment gateways to WooCommerce
        add_filter('woocommerce_payment_gateways', array($this, 'add_payment_gateways'));
        
        // Include gateway classes
        add_action('plugins_loaded', array($this, 'include_gateway_classes'), 11);
    }
    
    /**
     * Add payment gateways
     */
    public function add_payment_gateways($gateways) {
        $gateways[] = 'Bessou_Zelle_Gateway';
        $gateways[] = 'Bessou_CashApp_Gateway';
        $gateways[] = 'Bessou_ProofPayment_Gateway';
        $gateways[] = 'Bessou_Deposit_Gateway';
        return $gateways;
    }
    
    /**
     * Include gateway classes
     */
    public function include_gateway_classes() {
        if (!class_exists('WC_Payment_Gateway')) {
            return;
        }
        
        // Include gateway class files
        include_once BESSOU_PAYMENTS_PLUGIN_DIR . 'includes/class-zelle-gateway.php';
        include_once BESSOU_PAYMENTS_PLUGIN_DIR . 'includes/class-cashapp-gateway.php';
        include_once BESSOU_PAYMENTS_PLUGIN_DIR . 'includes/class-proof-payment-gateway.php';
        include_once BESSOU_PAYMENTS_PLUGIN_DIR . 'includes/class-deposit-gateway.php';
    }
    
    /**
     * Initialize hooks
     */
    private function init_hooks() {
        // AJAX handlers
        add_action('wp_ajax_upload_payment_proof', array($this, 'handle_payment_proof_upload'));
        add_action('wp_ajax_nopriv_upload_payment_proof', array($this, 'handle_payment_proof_upload'));
        add_action('wp_ajax_verify_payment_proof', array($this, 'handle_payment_verification'));
        add_action('wp_ajax_book_appointment_with_payment', array($this, 'handle_appointment_booking'));
        add_action('wp_ajax_nopriv_book_appointment_with_payment', array($this, 'handle_appointment_booking'));
        
        // Order status hooks
        add_action('woocommerce_order_status_changed', array($this, 'handle_order_status_change'), 10, 4);
        
        // Email hooks
        add_action('woocommerce_email_order_details', array($this, 'add_payment_instructions'), 20, 4);
        
        // Checkout hooks
        add_action('woocommerce_checkout_order_processed', array($this, 'process_payment_order'));
        add_action('woocommerce_thankyou', array($this, 'display_payment_instructions'));
        
        // Admin hooks
        add_action('add_meta_boxes', array($this, 'add_payment_meta_boxes'));
        add_action('save_post', array($this, 'save_payment_meta_boxes'));
        
        // Custom order columns
        add_filter('manage_edit-shop_order_columns', array($this, 'add_order_columns'));
        add_action('manage_shop_order_posts_custom_column', array($this, 'populate_order_columns'), 10, 2);
    }
    
    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_scripts() {
        wp_enqueue_script('bessou-payments', BESSOU_PAYMENTS_PLUGIN_URL . 'assets/js/payments.js', array('jquery'), BESSOU_PAYMENTS_VERSION, true);
        wp_enqueue_style('bessou-payments', BESSOU_PAYMENTS_PLUGIN_URL . 'assets/css/payments.css', array(), BESSOU_PAYMENTS_VERSION);
        
        // Localize script
        wp_localize_script('bessou-payments', 'bessou_payments', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('bessou_payments_nonce'),
            'messages' => array(
                'upload_success' => __('Payment proof uploaded successfully!', 'bessou-payments'),
                'upload_error' => __('Error uploading payment proof. Please try again.', 'bessou-payments'),
                'invalid_file' => __('Please select a valid image file (JPG, PNG, GIF).', 'bessou-payments'),
                'booking_success' => __('Appointment booked successfully! Please upload payment proof.', 'bessou-payments'),
            ),
        ));
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_scripts($hook) {
        if ('post.php' === $hook || 'post-new.php' === $hook || strpos($hook, 'bessou-payments') !== false) {
            wp_enqueue_script('bessou-payments-admin', BESSOU_PAYMENTS_PLUGIN_URL . 'assets/js/admin.js', array('jquery'), BESSOU_PAYMENTS_VERSION, true);
            wp_enqueue_style('bessou-payments-admin', BESSOU_PAYMENTS_PLUGIN_URL . 'assets/css/admin.css', array(), BESSOU_PAYMENTS_VERSION);
            
            wp_localize_script('bessou-payments-admin', 'bessou_payments_admin', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('bessou_payments_admin_nonce'),
            ));
        }
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            __('Bessou Payments', 'bessou-payments'),
            __('Bessou Payments', 'bessou-payments'),
            'manage_options',
            'bessou-payments',
            array($this, 'admin_page'),
            'dashicons-money-alt',
            30
        );
        
        add_submenu_page(
            'bessou-payments',
            __('Payment Settings', 'bessou-payments'),
            __('Settings', 'bessou-payments'),
            'manage_options',
            'bessou-payments-settings',
            array($this, 'settings_page')
        );
        
        add_submenu_page(
            'bessou-payments',
            __('Payment Proofs', 'bessou-payments'),
            __('Payment Proofs', 'bessou-payments'),
            'manage_options',
            'bessou-payment-proofs',
            array($this, 'payment_proofs_page')
        );
        
        add_submenu_page(
            'bessou-payments',
            __('Appointment Bookings', 'bessou-payments'),
            __('Bookings', 'bessou-payments'),
            'manage_options',
            'bessou-bookings',
            array($this, 'bookings_page')
        );
    }
    
    /**
     * Main admin page
     */
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Bessou Payments Dashboard', 'bessou-payments'); ?></h1>
            
            <div class="bessou-dashboard">
                <div class="dashboard-widgets">
                    <div class="dashboard-widget">
                        <h3><?php _e('Payment Overview', 'bessou-payments'); ?></h3>
                        <?php $this->display_payment_overview(); ?>
                    </div>
                    
                    <div class="dashboard-widget">
                        <h3><?php _e('Recent Payment Proofs', 'bessou-payments'); ?></h3>
                        <?php $this->display_recent_payment_proofs(); ?>
                    </div>
                    
                    <div class="dashboard-widget">
                        <h3><?php _e('Pending Appointments', 'bessou-payments'); ?></h3>
                        <?php $this->display_pending_appointments(); ?>
                    </div>
                    
                    <div class="dashboard-widget">
                        <h3><?php _e('Payment Methods Status', 'bessou-payments'); ?></h3>
                        <?php $this->display_payment_methods_status(); ?>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Settings page
     */
    public function settings_page() {
        if (isset($_POST['submit'])) {
            $this->save_settings();
            echo '<div class="notice notice-success"><p>' . __('Settings saved successfully!', 'bessou-payments') . '</p></div>';
        }
        
        $settings = $this->get_settings();
        ?>
        <div class="wrap">
            <h1><?php _e('Payment Settings', 'bessou-payments'); ?></h1>
            
            <form method="post" action="">
                <?php wp_nonce_field('bessou_payments_settings', 'bessou_payments_settings_nonce'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php _e('Zelle Email/Phone', 'bessou-payments'); ?></th>
                        <td>
                            <input type="text" name="zelle_info" value="<?php echo esc_attr($settings['zelle_info']); ?>" class="regular-text" />
                            <p class="description"><?php _e('Your Zelle email address or phone number for receiving payments.', 'bessou-payments'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row"><?php _e('Cash App Username', 'bessou-payments'); ?></th>
                        <td>
                            <input type="text" name="cashapp_username" value="<?php echo esc_attr($settings['cashapp_username']); ?>" class="regular-text" />
                            <p class="description"><?php _e('Your Cash App username (e.g., $YourUsername).', 'bessou-payments'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row"><?php _e('PayPal Email', 'bessou-payments'); ?></th>
                        <td>
                            <input type="email" name="paypal_email" value="<?php echo esc_attr($settings['paypal_email']); ?>" class="regular-text" />
                            <p class="description"><?php _e('Your PayPal email address for receiving payments.', 'bessou-payments'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row"><?php _e('Stripe Publishable Key', 'bessou-payments'); ?></th>
                        <td>
                            <input type="text" name="stripe_publishable_key" value="<?php echo esc_attr($settings['stripe_publishable_key']); ?>" class="regular-text" />
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row"><?php _e('Stripe Secret Key', 'bessou-payments'); ?></th>
                        <td>
                            <input type="password" name="stripe_secret_key" value="<?php echo esc_attr($settings['stripe_secret_key']); ?>" class="regular-text" />
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row"><?php _e('Appointment Deposit Amount', 'bessou-payments'); ?></th>
                        <td>
                            <input type="number" name="deposit_amount" value="<?php echo esc_attr($settings['deposit_amount']); ?>" min="0" step="0.01" />
                            <p class="description"><?php _e('Default deposit amount for appointments (e.g., 30.00).', 'bessou-payments'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row"><?php _e('Auto-Approve Payment Proofs', 'bessou-payments'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="auto_approve_proofs" value="1" <?php checked($settings['auto_approve_proofs'], 1); ?> />
                                <?php _e('Automatically approve payment proofs (not recommended)', 'bessou-payments'); ?>
                            </label>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row"><?php _e('Payment Instructions', 'bessou-payments'); ?></th>
                        <td>
                            <textarea name="payment_instructions" rows="5" cols="50" class="large-text"><?php echo esc_textarea($settings['payment_instructions']); ?></textarea>
                            <p class="description"><?php _e('Instructions displayed to customers for manual payment methods.', 'bessou-payments'); ?></p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
    
    /**
     * Payment proofs page
     */
    public function payment_proofs_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Payment Proofs', 'bessou-payments'); ?></h1>
            
            <div class="payment-proofs-list">
                <?php $this->display_payment_proofs_table(); ?>
            </div>
        </div>
        <?php
    }
    
    /**
     * Bookings page
     */
    public function bookings_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Appointment Bookings', 'bessou-payments'); ?></h1>
            
            <div class="bookings-list">
                <?php $this->display_bookings_table(); ?>
            </div>
        </div>
        <?php
    }
    
    /**
     * Handle payment proof upload
     */
    public function handle_payment_proof_upload() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'bessou_payments_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check if file was uploaded
        if (!isset($_FILES['payment_proof']) || $_FILES['payment_proof']['error'] !== UPLOAD_ERR_OK) {
            wp_send_json_error('No file uploaded or upload error');
        }
        
        // Validate file type
        $allowed_types = array('image/jpeg', 'image/png', 'image/gif');
        if (!in_array($_FILES['payment_proof']['type'], $allowed_types)) {
            wp_send_json_error('Invalid file type. Please upload JPG, PNG, or GIF.');
        }
        
        // Handle file upload
        $upload = wp_handle_upload($_FILES['payment_proof'], array('test_form' => false));
        
        if (isset($upload['error'])) {
            wp_send_json_error($upload['error']);
        }
        
        // Save payment proof data
        $order_id = intval($_POST['order_id']);
        $payment_method = sanitize_text_field($_POST['payment_method']);
        $transaction_id = sanitize_text_field($_POST['transaction_id']);
        $amount = floatval($_POST['amount']);
        
        $proof_id = $this->save_payment_proof(array(
            'order_id' => $order_id,
            'payment_method' => $payment_method,
            'transaction_id' => $transaction_id,
            'amount' => $amount,
            'proof_image' => $upload['url'],
            'status' => 'pending',
            'uploaded_at' => current_time('mysql'),
        ));
        
        if ($proof_id) {
            // Send notification email to admin
            $this->send_payment_proof_notification($proof_id);
            
            wp_send_json_success(array(
                'message' => 'Payment proof uploaded successfully!',
                'proof_id' => $proof_id,
            ));
        } else {
            wp_send_json_error('Failed to save payment proof');
        }
    }
    
    /**
     * Handle payment verification
     */
    public function handle_payment_verification() {
        // Verify nonce and permissions
        if (!wp_verify_nonce($_POST['nonce'], 'bessou_payments_admin_nonce') || !current_user_can('manage_options')) {
            wp_die('Security check failed');
        }
        
        $proof_id = intval($_POST['proof_id']);
        $action = sanitize_text_field($_POST['action_type']);
        $notes = sanitize_textarea_field($_POST['notes']);
        
        $result = $this->update_payment_proof_status($proof_id, $action, $notes);
        
        if ($result) {
            wp_send_json_success('Payment proof ' . $action . ' successfully');
        } else {
            wp_send_json_error('Failed to update payment proof status');
        }
    }
    
    /**
     * Handle appointment booking with payment
     */
    public function handle_appointment_booking() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'bessou_payments_nonce')) {
            wp_die('Security check failed');
        }
        
        // Sanitize form data
        $booking_data = array(
            'client_name' => sanitize_text_field($_POST['client_name']),
            'client_email' => sanitize_email($_POST['client_email']),
            'client_phone' => sanitize_text_field($_POST['client_phone']),
            'service_type' => sanitize_text_field($_POST['service_type']),
            'preferred_date' => sanitize_text_field($_POST['preferred_date']),
            'preferred_time' => sanitize_text_field($_POST['preferred_time']),
            'hair_length' => sanitize_text_field($_POST['hair_length']),
            'special_requests' => sanitize_textarea_field($_POST['special_requests']),
            'payment_method' => sanitize_text_field($_POST['payment_method']),
            'deposit_amount' => floatval($_POST['deposit_amount']),
        );
        
        // Save booking
        $booking_id = $this->save_appointment_booking($booking_data);
        
        if ($booking_id) {
            // Send confirmation email
            $this->send_booking_confirmation_email($booking_id);
            
            wp_send_json_success(array(
                'message' => 'Appointment booked successfully!',
                'booking_id' => $booking_id,
                'payment_instructions' => $this->get_payment_instructions($booking_data['payment_method']),
            ));
        } else {
            wp_send_json_error('Failed to book appointment');
        }
    }
    
    /**
     * Save payment proof
     */
    private function save_payment_proof($data) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'bessou_payment_proofs';
        
        $result = $wpdb->insert($table_name, $data);
        
        return $result ? $wpdb->insert_id : false;
    }
    
    /**
     * Save appointment booking
     */
    private function save_appointment_booking($data) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'bessou_bookings';
        
        $data['status'] = 'pending_payment';
        $data['created_at'] = current_time('mysql');
        
        $result = $wpdb->insert($table_name, $data);
        
        return $result ? $wpdb->insert_id : false;
    }
    
    /**
     * Get payment instructions
     */
    private function get_payment_instructions($payment_method) {
        $settings = $this->get_settings();
        
        switch ($payment_method) {
            case 'zelle':
                return sprintf(
                    __('Send payment via Zelle to: %s\nPlease include your booking reference in the memo.', 'bessou-payments'),
                    $settings['zelle_info']
                );
                
            case 'cashapp':
                return sprintf(
                    __('Send payment via Cash App to: %s\nPlease include your booking reference in the note.', 'bessou-payments'),
                    $settings['cashapp_username']
                );
                
            case 'paypal':
                return sprintf(
                    __('Send payment via PayPal to: %s\nPlease mark as "Friends & Family" and include your booking reference.', 'bessou-payments'),
                    $settings['paypal_email']
                );
                
            default:
                return $settings['payment_instructions'];
        }
    }
    
    /**
     * Get plugin settings
     */
    private function get_settings() {
        return wp_parse_args(get_option('bessou_payments_settings', array()), array(
            'zelle_info' => '',
            'cashapp_username' => '',
            'paypal_email' => '',
            'stripe_publishable_key' => '',
            'stripe_secret_key' => '',
            'deposit_amount' => '30.00',
            'auto_approve_proofs' => 0,
            'payment_instructions' => 'Please send payment and upload proof of payment to confirm your booking.',
        ));
    }
    
    /**
     * Save settings
     */
    private function save_settings() {
        if (!wp_verify_nonce($_POST['bessou_payments_settings_nonce'], 'bessou_payments_settings')) {
            return;
        }
        
        $settings = array(
            'zelle_info' => sanitize_text_field($_POST['zelle_info']),
            'cashapp_username' => sanitize_text_field($_POST['cashapp_username']),
            'paypal_email' => sanitize_email($_POST['paypal_email']),
            'stripe_publishable_key' => sanitize_text_field($_POST['stripe_publishable_key']),
            'stripe_secret_key' => sanitize_text_field($_POST['stripe_secret_key']),
            'deposit_amount' => floatval($_POST['deposit_amount']),
            'auto_approve_proofs' => isset($_POST['auto_approve_proofs']) ? 1 : 0,
            'payment_instructions' => sanitize_textarea_field($_POST['payment_instructions']),
        );
        
        update_option('bessou_payments_settings', $settings);
    }
    
    /**
     * Display payment overview
     */
    private function display_payment_overview() {
        global $wpdb;
        
        // Get payment statistics
        $proofs_table = $wpdb->prefix . 'bessou_payment_proofs';
        $bookings_table = $wpdb->prefix . 'bessou_bookings';
        
        $pending_proofs = $wpdb->get_var("SELECT COUNT(*) FROM $proofs_table WHERE status = 'pending'");
        $approved_proofs = $wpdb->get_var("SELECT COUNT(*) FROM $proofs_table WHERE status = 'approved'");
        $total_bookings = $wpdb->get_var("SELECT COUNT(*) FROM $bookings_table");
        $pending_bookings = $wpdb->get_var("SELECT COUNT(*) FROM $bookings_table WHERE status = 'pending_payment'");
        
        echo '<div class="payment-stats">';
        echo '<div class="stat-item"><span class="stat-number">' . $pending_proofs . '</span><span class="stat-label">Pending Proofs</span></div>';
        echo '<div class="stat-item"><span class="stat-number">' . $approved_proofs . '</span><span class="stat-label">Approved Proofs</span></div>';
        echo '<div class="stat-item"><span class="stat-number">' . $total_bookings . '</span><span class="stat-label">Total Bookings</span></div>';
        echo '<div class="stat-item"><span class="stat-number">' . $pending_bookings . '</span><span class="stat-label">Pending Bookings</span></div>';
        echo '</div>';
    }
    
    /**
     * Display recent payment proofs
     */
    private function display_recent_payment_proofs() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'bessou_payment_proofs';
        $proofs = $wpdb->get_results("SELECT * FROM $table_name ORDER BY uploaded_at DESC LIMIT 5");
        
        if ($proofs) {
            echo '<table class="wp-list-table widefat fixed striped">';
            echo '<thead><tr><th>Order ID</th><th>Method</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>';
            echo '<tbody>';
            
            foreach ($proofs as $proof) {
                echo '<tr>';
                echo '<td>#' . $proof->order_id . '</td>';
                echo '<td>' . ucfirst($proof->payment_method) . '</td>';
                echo '<td>$' . number_format($proof->amount, 2) . '</td>';
                echo '<td><span class="status-' . $proof->status . '">' . ucfirst($proof->status) . '</span></td>';
                echo '<td>' . date('M j, Y', strtotime($proof->uploaded_at)) . '</td>';
                echo '</tr>';
            }
            
            echo '</tbody></table>';
        } else {
            echo '<p>No payment proofs found.</p>';
        }
    }
    
    /**
     * Display pending appointments
     */
    private function display_pending_appointments() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'bessou_bookings';
        $bookings = $wpdb->get_results("SELECT * FROM $table_name WHERE status = 'pending_payment' ORDER BY created_at DESC LIMIT 5");
        
        if ($bookings) {
            echo '<table class="wp-list-table widefat fixed striped">';
            echo '<thead><tr><th>Client</th><th>Service</th><th>Date</th><th>Deposit</th><th>Status</th></tr></thead>';
            echo '<tbody>';
            
            foreach ($bookings as $booking) {
                echo '<tr>';
                echo '<td>' . esc_html($booking->client_name) . '</td>';
                echo '<td>' . esc_html($booking->service_type) . '</td>';
                echo '<td>' . esc_html($booking->preferred_date) . '</td>';
                echo '<td>$' . number_format($booking->deposit_amount, 2) . '</td>';
                echo '<td><span class="status-' . $booking->status . '">' . ucfirst(str_replace('_', ' ', $booking->status)) . '</span></td>';
                echo '</tr>';
            }
            
            echo '</tbody></table>';
        } else {
            echo '<p>No pending appointments found.</p>';
        }
    }
    
    /**
     * Display payment methods status
     */
    private function display_payment_methods_status() {
        $settings = $this->get_settings();
        
        echo '<div class="payment-methods-status">';
        
        $methods = array(
            'Zelle' => !empty($settings['zelle_info']),
            'Cash App' => !empty($settings['cashapp_username']),
            'PayPal' => !empty($settings['paypal_email']),
            'Stripe' => !empty($settings['stripe_publishable_key']) && !empty($settings['stripe_secret_key']),
        );
        
        foreach ($methods as $method => $configured) {
            $status = $configured ? 'configured' : 'not-configured';
            $icon = $configured ? '✅' : '❌';
            echo '<div class="method-status ' . $status . '">';
            echo '<span class="method-icon">' . $icon . '</span>';
            echo '<span class="method-name">' . $method . '</span>';
            echo '<span class="method-label">' . ($configured ? 'Configured' : 'Not Configured') . '</span>';
            echo '</div>';
        }
        
        echo '</div>';
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        $this->create_tables();
        add_option('bessou_payments_version', BESSOU_PAYMENTS_VERSION);
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        flush_rewrite_rules();
    }
    
    /**
     * Create database tables
     */
    private function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Payment proofs table
        $proofs_table = $wpdb->prefix . 'bessou_payment_proofs';
        $proofs_sql = "CREATE TABLE $proofs_table (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            order_id bigint(20) DEFAULT 0,
            booking_id bigint(20) DEFAULT 0,
            payment_method varchar(50) NOT NULL,
            transaction_id varchar(100) DEFAULT '',
            amount decimal(10,2) NOT NULL,
            proof_image varchar(255) NOT NULL,
            status varchar(20) DEFAULT 'pending',
            admin_notes text DEFAULT '',
            uploaded_at datetime DEFAULT CURRENT_TIMESTAMP,
            verified_at datetime DEFAULT NULL,
            verified_by bigint(20) DEFAULT NULL,
            PRIMARY KEY (id),
            KEY order_id (order_id),
            KEY booking_id (booking_id),
            KEY status (status)
        ) $charset_collate;";
        
        // Bookings table
        $bookings_table = $wpdb->prefix . 'bessou_bookings';
        $bookings_sql = "CREATE TABLE $bookings_table (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            client_name varchar(100) NOT NULL,
            client_email varchar(100) NOT NULL,
            client_phone varchar(20) NOT NULL,
            service_type varchar(100) NOT NULL,
            preferred_date date NOT NULL,
            preferred_time time NOT NULL,
            hair_length varchar(50) DEFAULT '',
            special_requests text DEFAULT '',
            payment_method varchar(50) NOT NULL,
            deposit_amount decimal(10,2) NOT NULL,
            status varchar(20) DEFAULT 'pending_payment',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            confirmed_at datetime DEFAULT NULL,
            PRIMARY KEY (id),
            KEY client_email (client_email),
            KEY status (status),
            KEY preferred_date (preferred_date)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($proofs_sql);
        dbDelta($bookings_sql);
    }
}

// Initialize the plugin
new Bessou_Payments();

?>

