<?php
/**
 * Plugin Name: Bessou Hair Beauty - Booking System
 * Plugin URI: https://bessouhairbeauty.com
 * Description: Complete appointment booking system with proof of payment upload, confirmation system, and client management for Bessou Hair Beauty.
 * Version: 1.0.0
 * Author: BookAI Studio
 * License: GPL v2 or later
 * Text Domain: bessou-booking
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('BESSOU_BOOKING_VERSION', '1.0.0');
define('BESSOU_BOOKING_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BESSOU_BOOKING_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main Bessou Booking System Class
 */
class Bessou_Booking_System {
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('init', array($this, 'init'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    /**
     * Initialize plugin
     */
    public function init() {
        // Load text domain
        load_plugin_textdomain('bessou-booking', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Initialize hooks
        $this->init_hooks();
        
        // Add shortcodes
        $this->init_shortcodes();
        
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
    }
    
    /**
     * Initialize hooks
     */
    private function init_hooks() {
        // AJAX handlers
        add_action('wp_ajax_book_appointment', array($this, 'handle_appointment_booking'));
        add_action('wp_ajax_nopriv_book_appointment', array($this, 'handle_appointment_booking'));
        add_action('wp_ajax_upload_booking_payment_proof', array($this, 'handle_payment_proof_upload'));
        add_action('wp_ajax_nopriv_upload_booking_payment_proof', array($this, 'handle_payment_proof_upload'));
        add_action('wp_ajax_confirm_booking', array($this, 'handle_booking_confirmation'));
        add_action('wp_ajax_cancel_booking', array($this, 'handle_booking_cancellation'));
        add_action('wp_ajax_reschedule_booking', array($this, 'handle_booking_reschedule'));
        add_action('wp_ajax_get_available_slots', array($this, 'get_available_time_slots'));
        add_action('wp_ajax_nopriv_get_available_slots', array($this, 'get_available_time_slots'));
        
        // Email hooks
        add_action('bessou_booking_created', array($this, 'send_booking_confirmation_email'));
        add_action('bessou_booking_confirmed', array($this, 'send_booking_confirmed_email'));
        add_action('bessou_booking_cancelled', array($this, 'send_booking_cancelled_email'));
        add_action('bessou_payment_proof_uploaded', array($this, 'send_payment_proof_notification'));
        
        // Cron hooks for reminders
        add_action('bessou_send_appointment_reminders', array($this, 'send_appointment_reminders'));
        
        // Custom post types
        add_action('init', array($this, 'register_post_types'));
        
        // Meta boxes
        add_action('add_meta_boxes', array($this, 'add_meta_boxes'));
        add_action('save_post', array($this, 'save_meta_boxes'));
    }
    
    /**
     * Initialize shortcodes
     */
    private function init_shortcodes() {
        add_shortcode('bessou_booking_form', array($this, 'booking_form_shortcode'));
        add_shortcode('bessou_booking_calendar', array($this, 'booking_calendar_shortcode'));
        add_shortcode('bessou_client_portal', array($this, 'client_portal_shortcode'));
        add_shortcode('bessou_service_menu', array($this, 'service_menu_shortcode'));
    }
    
    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_scripts() {
        wp_enqueue_script('bessou-booking', BESSOU_BOOKING_PLUGIN_URL . 'assets/js/booking.js', array('jquery'), BESSOU_BOOKING_VERSION, true);
        wp_enqueue_style('bessou-booking', BESSOU_BOOKING_PLUGIN_URL . 'assets/css/booking.css', array(), BESSOU_BOOKING_VERSION);
        
        // Enqueue date picker
        wp_enqueue_script('jquery-ui-datepicker');
        wp_enqueue_style('jquery-ui-datepicker', 'https://code.jquery.com/ui/1.12.1/themes/ui-lightness/jquery-ui.css');
        
        // Localize script
        wp_localize_script('bessou-booking', 'bessou_booking', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('bessou_booking_nonce'),
            'messages' => array(
                'booking_success' => __('Appointment booked successfully!', 'bessou-booking'),
                'booking_error' => __('Error booking appointment. Please try again.', 'bessou-booking'),
                'upload_success' => __('Payment proof uploaded successfully!', 'bessou-booking'),
                'upload_error' => __('Error uploading payment proof. Please try again.', 'bessou-booking'),
                'invalid_date' => __('Please select a valid date.', 'bessou-booking'),
                'invalid_time' => __('Please select a valid time slot.', 'bessou-booking'),
                'required_fields' => __('Please fill in all required fields.', 'bessou-booking'),
            ),
            'settings' => array(
                'deposit_amount' => get_option('bessou_booking_deposit_amount', 30),
                'business_hours' => get_option('bessou_booking_business_hours', array(
                    'monday' => array('start' => '09:00', 'end' => '19:00'),
                    'tuesday' => array('start' => '09:00', 'end' => '19:00'),
                    'wednesday' => array('start' => '09:00', 'end' => '19:00'),
                    'thursday' => array('start' => '09:00', 'end' => '19:00'),
                    'friday' => array('start' => '09:00', 'end' => '19:00'),
                    'saturday' => array('start' => '09:00', 'end' => '19:00'),
                    'sunday' => array('start' => 'closed', 'end' => 'closed'),
                )),
            ),
        ));
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'bessou-booking') !== false || $hook === 'post.php' || $hook === 'post-new.php') {
            wp_enqueue_script('bessou-booking-admin', BESSOU_BOOKING_PLUGIN_URL . 'assets/js/admin.js', array('jquery'), BESSOU_BOOKING_VERSION, true);
            wp_enqueue_style('bessou-booking-admin', BESSOU_BOOKING_PLUGIN_URL . 'assets/css/admin.css', array(), BESSOU_BOOKING_VERSION);
            
            wp_localize_script('bessou-booking-admin', 'bessou_booking_admin', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('bessou_booking_admin_nonce'),
            ));
        }
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            __('Bessou Bookings', 'bessou-booking'),
            __('Bookings', 'bessou-booking'),
            'manage_options',
            'bessou-bookings',
            array($this, 'bookings_page'),
            'dashicons-calendar-alt',
            25
        );
        
        add_submenu_page(
            'bessou-bookings',
            __('All Bookings', 'bessou-booking'),
            __('All Bookings', 'bessou-booking'),
            'manage_options',
            'bessou-bookings',
            array($this, 'bookings_page')
        );
        
        add_submenu_page(
            'bessou-bookings',
            __('Calendar View', 'bessou-booking'),
            __('Calendar', 'bessou-booking'),
            'manage_options',
            'bessou-calendar',
            array($this, 'calendar_page')
        );
        
        add_submenu_page(
            'bessou-bookings',
            __('Payment Proofs', 'bessou-booking'),
            __('Payment Proofs', 'bessou-booking'),
            'manage_options',
            'bessou-payment-proofs',
            array($this, 'payment_proofs_page')
        );
        
        add_submenu_page(
            'bessou-bookings',
            __('Settings', 'bessou-booking'),
            __('Settings', 'bessou-booking'),
            'manage_options',
            'bessou-booking-settings',
            array($this, 'settings_page')
        );
    }
    
    /**
     * Register custom post types
     */
    public function register_post_types() {
        // Bookings post type
        register_post_type('booking', array(
            'labels' => array(
                'name' => __('Bookings', 'bessou-booking'),
                'singular_name' => __('Booking', 'bessou-booking'),
                'add_new' => __('Add New Booking', 'bessou-booking'),
                'add_new_item' => __('Add New Booking', 'bessou-booking'),
                'edit_item' => __('Edit Booking', 'bessou-booking'),
                'new_item' => __('New Booking', 'bessou-booking'),
                'view_item' => __('View Booking', 'bessou-booking'),
                'search_items' => __('Search Bookings', 'bessou-booking'),
                'not_found' => __('No bookings found', 'bessou-booking'),
                'not_found_in_trash' => __('No bookings found in trash', 'bessou-booking'),
            ),
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => false,
            'supports' => array('title', 'editor'),
            'capability_type' => 'post',
            'capabilities' => array(
                'create_posts' => 'manage_options',
            ),
            'map_meta_cap' => true,
        ));
        
        // Services post type
        register_post_type('service', array(
            'labels' => array(
                'name' => __('Services', 'bessou-booking'),
                'singular_name' => __('Service', 'bessou-booking'),
                'add_new' => __('Add New Service', 'bessou-booking'),
                'add_new_item' => __('Add New Service', 'bessou-booking'),
                'edit_item' => __('Edit Service', 'bessou-booking'),
                'new_item' => __('New Service', 'bessou-booking'),
                'view_item' => __('View Service', 'bessou-booking'),
                'search_items' => __('Search Services', 'bessou-booking'),
                'not_found' => __('No services found', 'bessou-booking'),
                'not_found_in_trash' => __('No services found in trash', 'bessou-booking'),
            ),
            'public' => true,
            'has_archive' => true,
            'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
            'menu_icon' => 'dashicons-admin-tools',
            'rewrite' => array('slug' => 'services'),
        ));
    }
    
    /**
     * Booking form shortcode
     */
    public function booking_form_shortcode($atts) {
        $atts = shortcode_atts(array(
            'style' => 'default',
            'show_services' => 'true',
            'show_calendar' => 'true',
        ), $atts);
        
        ob_start();
        $this->render_booking_form($atts);
        return ob_get_clean();
    }
    
    /**
     * Render booking form
     */
    private function render_booking_form($atts) {
        $services = get_posts(array(
            'post_type' => 'service',
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ));
        
        $deposit_amount = get_option('bessou_booking_deposit_amount', 30);
        ?>
        <div class="bessou-booking-form-container">
            <form id="bessou-booking-form" class="bessou-booking-form">
                <div class="booking-step booking-step-1 active">
                    <h3><?php _e('Book Your Appointment', 'bessou-booking'); ?></h3>
                    
                    <div class="form-row form-row-half">
                        <label for="client_name"><?php _e('Full Name', 'bessou-booking'); ?> *</label>
                        <input type="text" id="client_name" name="client_name" required />
                    </div>
                    
                    <div class="form-row form-row-half">
                        <label for="client_email"><?php _e('Email Address', 'bessou-booking'); ?> *</label>
                        <input type="email" id="client_email" name="client_email" required />
                    </div>
                    
                    <div class="form-row form-row-half">
                        <label for="client_phone"><?php _e('Phone Number', 'bessou-booking'); ?> *</label>
                        <input type="tel" id="client_phone" name="client_phone" required />
                    </div>
                    
                    <div class="form-row form-row-half">
                        <label for="service_type"><?php _e('Service', 'bessou-booking'); ?> *</label>
                        <select id="service_type" name="service_type" required>
                            <option value=""><?php _e('Select a service...', 'bessou-booking'); ?></option>
                            <?php foreach ($services as $service): ?>
                                <?php
                                $price_min = get_post_meta($service->ID, '_service_price_min', true);
                                $price_max = get_post_meta($service->ID, '_service_price_max', true);
                                $duration = get_post_meta($service->ID, '_service_duration', true);
                                
                                $price_text = '';
                                if ($price_min && $price_max) {
                                    $price_text = ' ($' . $price_min . ' - $' . $price_max . ')';
                                } elseif ($price_min) {
                                    $price_text = ' (From $' . $price_min . ')';
                                }
                                
                                if ($duration) {
                                    $price_text .= ' - ' . $duration;
                                }
                                ?>
                                <option value="<?php echo esc_attr($service->post_title); ?>" data-price-min="<?php echo esc_attr($price_min); ?>" data-price-max="<?php echo esc_attr($price_max); ?>" data-duration="<?php echo esc_attr($duration); ?>">
                                    <?php echo esc_html($service->post_title . $price_text); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <label for="preferred_date"><?php _e('Preferred Date', 'bessou-booking'); ?> *</label>
                        <input type="text" id="preferred_date" name="preferred_date" class="datepicker" required readonly />
                    </div>
                    
                    <div class="form-row">
                        <label for="preferred_time"><?php _e('Preferred Time', 'bessou-booking'); ?> *</label>
                        <select id="preferred_time" name="preferred_time" required>
                            <option value=""><?php _e('Select date first...', 'bessou-booking'); ?></option>
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <label for="hair_length"><?php _e('Current Hair Length', 'bessou-booking'); ?></label>
                        <select id="hair_length" name="hair_length">
                            <option value=""><?php _e('Select length...', 'bessou-booking'); ?></option>
                            <option value="short"><?php _e('Short (Above shoulders)', 'bessou-booking'); ?></option>
                            <option value="medium"><?php _e('Medium (Shoulder length)', 'bessou-booking'); ?></option>
                            <option value="long"><?php _e('Long (Below shoulders)', 'bessou-booking'); ?></option>
                            <option value="very-long"><?php _e('Very Long (Mid-back or longer)', 'bessou-booking'); ?></option>
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <label for="special_requests"><?php _e('Special Requests or Notes', 'bessou-booking'); ?></label>
                        <textarea id="special_requests" name="special_requests" rows="4" placeholder="<?php _e('Any special requests, hair texture information, or other notes...', 'bessou-booking'); ?>"></textarea>
                    </div>
                    
                    <div class="deposit-info">
                        <h4><?php _e('Deposit Information', 'bessou-booking'); ?></h4>
                        <p><?php printf(__('A non-refundable deposit of $%s is required to secure your appointment. This deposit will be applied to your final service cost.', 'bessou-booking'), number_format($deposit_amount, 2)); ?></p>
                    </div>
                    
                    <div class="form-row">
                        <button type="button" class="button next-step"><?php _e('Continue to Payment', 'bessou-booking'); ?></button>
                    </div>
                </div>
                
                <div class="booking-step booking-step-2">
                    <h3><?php _e('Payment Method', 'bessou-booking'); ?></h3>
                    
                    <div class="payment-methods">
                        <label class="payment-method">
                            <input type="radio" name="payment_method" value="zelle" />
                            <span class="payment-method-label">
                                <img src="<?php echo BESSOU_BOOKING_PLUGIN_URL; ?>assets/images/zelle-icon.png" alt="Zelle" />
                                <?php _e('Zelle', 'bessou-booking'); ?>
                            </span>
                        </label>
                        
                        <label class="payment-method">
                            <input type="radio" name="payment_method" value="cashapp" />
                            <span class="payment-method-label">
                                <img src="<?php echo BESSOU_BOOKING_PLUGIN_URL; ?>assets/images/cashapp-icon.png" alt="Cash App" />
                                <?php _e('Cash App', 'bessou-booking'); ?>
                            </span>
                        </label>
                        
                        <label class="payment-method">
                            <input type="radio" name="payment_method" value="paypal" />
                            <span class="payment-method-label">
                                <img src="<?php echo BESSOU_BOOKING_PLUGIN_URL; ?>assets/images/paypal-icon.png" alt="PayPal" />
                                <?php _e('PayPal', 'bessou-booking'); ?>
                            </span>
                        </label>
                        
                        <label class="payment-method">
                            <input type="radio" name="payment_method" value="stripe" />
                            <span class="payment-method-label">
                                <img src="<?php echo BESSOU_BOOKING_PLUGIN_URL; ?>assets/images/stripe-icon.png" alt="Credit Card" />
                                <?php _e('Credit Card', 'bessou-booking'); ?>
                            </span>
                        </label>
                    </div>
                    
                    <div class="payment-instructions" id="payment-instructions" style="display: none;">
                        <!-- Payment instructions will be loaded here -->
                    </div>
                    
                    <div class="form-row">
                        <button type="button" class="button prev-step"><?php _e('Back', 'bessou-booking'); ?></button>
                        <button type="submit" class="button button-primary"><?php _e('Book Appointment', 'bessou-booking'); ?></button>
                    </div>
                </div>
                
                <div class="booking-step booking-step-3">
                    <h3><?php _e('Booking Confirmation', 'bessou-booking'); ?></h3>
                    <div id="booking-confirmation-content">
                        <!-- Confirmation content will be loaded here -->
                    </div>
                </div>
            </form>
        </div>
        
        <div id="payment-proof-modal" class="modal" style="display: none;">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h3><?php _e('Upload Payment Proof', 'bessou-booking'); ?></h3>
                
                <form id="payment-proof-form" enctype="multipart/form-data">
                    <input type="hidden" id="booking_id" name="booking_id" />
                    <input type="hidden" id="payment_method_proof" name="payment_method" />
                    
                    <div class="form-row">
                        <label for="payment_proof"><?php _e('Payment Proof Image', 'bessou-booking'); ?> *</label>
                        <input type="file" id="payment_proof" name="payment_proof" accept="image/*" required />
                        <small><?php _e('Upload a screenshot or photo of your payment confirmation.', 'bessou-booking'); ?></small>
                    </div>
                    
                    <div class="form-row">
                        <label for="transaction_id_proof"><?php _e('Transaction ID', 'bessou-booking'); ?></label>
                        <input type="text" id="transaction_id_proof" name="transaction_id" placeholder="<?php _e('Enter transaction ID if available', 'bessou-booking'); ?>" />
                    </div>
                    
                    <div class="form-row">
                        <label for="amount_proof"><?php _e('Amount Sent', 'bessou-booking'); ?> *</label>
                        <input type="number" id="amount_proof" name="amount" step="0.01" min="0" value="<?php echo esc_attr($deposit_amount); ?>" required />
                    </div>
                    
                    <div class="form-row">
                        <button type="submit" class="button button-primary"><?php _e('Upload Proof', 'bessou-booking'); ?></button>
                    </div>
                </form>
                
                <div id="proof-upload-result"></div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Handle appointment booking
     */
    public function handle_appointment_booking() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'bessou_booking_nonce')) {
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
        
        // Validate required fields
        $required_fields = array('client_name', 'client_email', 'client_phone', 'service_type', 'preferred_date', 'preferred_time', 'payment_method');
        foreach ($required_fields as $field) {
            if (empty($booking_data[$field])) {
                wp_send_json_error('Missing required field: ' . $field);
            }
        }
        
        // Check if time slot is still available
        if (!$this->is_time_slot_available($booking_data['preferred_date'], $booking_data['preferred_time'])) {
            wp_send_json_error('Selected time slot is no longer available. Please choose another time.');
        }
        
        // Create booking
        $booking_id = $this->create_booking($booking_data);
        
        if ($booking_id) {
            // Trigger booking created action
            do_action('bessou_booking_created', $booking_id, $booking_data);
            
            wp_send_json_success(array(
                'message' => 'Appointment booked successfully!',
                'booking_id' => $booking_id,
                'payment_instructions' => $this->get_payment_instructions($booking_data['payment_method']),
                'booking_details' => $booking_data,
            ));
        } else {
            wp_send_json_error('Failed to create booking. Please try again.');
        }
    }
    
    /**
     * Handle payment proof upload
     */
    public function handle_payment_proof_upload() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'bessou_booking_nonce')) {
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
        $booking_id = intval($_POST['booking_id']);
        $payment_method = sanitize_text_field($_POST['payment_method']);
        $transaction_id = sanitize_text_field($_POST['transaction_id']);
        $amount = floatval($_POST['amount']);
        
        $proof_id = $this->save_payment_proof(array(
            'booking_id' => $booking_id,
            'payment_method' => $payment_method,
            'transaction_id' => $transaction_id,
            'amount' => $amount,
            'proof_image' => $upload['url'],
            'status' => 'pending',
            'uploaded_at' => current_time('mysql'),
        ));
        
        if ($proof_id) {
            // Update booking status
            $this->update_booking_status($booking_id, 'payment_proof_uploaded');
            
            // Trigger payment proof uploaded action
            do_action('bessou_payment_proof_uploaded', $proof_id, $booking_id);
            
            wp_send_json_success(array(
                'message' => 'Payment proof uploaded successfully!',
                'proof_id' => $proof_id,
            ));
        } else {
            wp_send_json_error('Failed to save payment proof');
        }
    }
    
    /**
     * Create booking
     */
    private function create_booking($data) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'bessou_bookings';
        
        $booking_data = array_merge($data, array(
            'status' => 'pending_payment',
            'booking_reference' => $this->generate_booking_reference(),
            'created_at' => current_time('mysql'),
        ));
        
        $result = $wpdb->insert($table_name, $booking_data);
        
        return $result ? $wpdb->insert_id : false;
    }
    
    /**
     * Generate booking reference
     */
    private function generate_booking_reference() {
        return 'BHB-' . date('Y') . '-' . strtoupper(wp_generate_password(6, false));
    }
    
    /**
     * Check if time slot is available
     */
    private function is_time_slot_available($date, $time) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'bessou_bookings';
        
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table_name WHERE preferred_date = %s AND preferred_time = %s AND status NOT IN ('cancelled', 'no_show')",
            $date,
            $time
        ));
        
        return $existing == 0;
    }
    
    /**
     * Get available time slots
     */
    public function get_available_time_slots() {
        $date = sanitize_text_field($_POST['date']);
        $day_of_week = strtolower(date('l', strtotime($date)));
        
        $business_hours = get_option('bessou_booking_business_hours', array());
        
        if (!isset($business_hours[$day_of_week]) || $business_hours[$day_of_week]['start'] === 'closed') {
            wp_send_json_success(array('slots' => array()));
        }
        
        $start_time = $business_hours[$day_of_week]['start'];
        $end_time = $business_hours[$day_of_week]['end'];
        
        // Generate time slots (every 30 minutes)
        $slots = array();
        $current_time = strtotime($start_time);
        $end_timestamp = strtotime($end_time);
        
        while ($current_time < $end_timestamp) {
            $time_slot = date('H:i', $current_time);
            
            // Check if slot is available
            if ($this->is_time_slot_available($date, $time_slot)) {
                $slots[] = array(
                    'value' => $time_slot,
                    'label' => date('g:i A', $current_time),
                );
            }
            
            $current_time += 30 * 60; // Add 30 minutes
        }
        
        wp_send_json_success(array('slots' => $slots));
    }
    
    /**
     * Get payment instructions
     */
    private function get_payment_instructions($payment_method) {
        $settings = get_option('bessou_booking_settings', array());
        
        switch ($payment_method) {
            case 'zelle':
                return array(
                    'title' => 'Zelle Payment Instructions',
                    'recipient' => $settings['zelle_info'] ?? '',
                    'instructions' => 'Send payment via Zelle to the email/phone above. Include your booking reference in the memo.',
                );
                
            case 'cashapp':
                return array(
                    'title' => 'Cash App Payment Instructions',
                    'recipient' => $settings['cashapp_username'] ?? '',
                    'instructions' => 'Send payment via Cash App to the username above. Include your booking reference in the note.',
                );
                
            case 'paypal':
                return array(
                    'title' => 'PayPal Payment Instructions',
                    'recipient' => $settings['paypal_email'] ?? '',
                    'instructions' => 'Send payment via PayPal to the email above. Mark as "Friends & Family" and include your booking reference.',
                );
                
            case 'stripe':
                return array(
                    'title' => 'Credit Card Payment',
                    'instructions' => 'You will be redirected to our secure payment processor to complete your payment.',
                );
                
            default:
                return array(
                    'title' => 'Payment Instructions',
                    'instructions' => 'Please follow the payment instructions provided.',
                );
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
     * Update booking status
     */
    private function update_booking_status($booking_id, $status) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'bessou_bookings';
        
        return $wpdb->update(
            $table_name,
            array('status' => $status),
            array('id' => $booking_id),
            array('%s'),
            array('%d')
        );
    }
    
    /**
     * Send booking confirmation email
     */
    public function send_booking_confirmation_email($booking_id, $booking_data) {
        $to = $booking_data['client_email'];
        $subject = 'Appointment Booking Confirmation - Bessou Hair Beauty';
        
        $message = "Dear " . $booking_data['client_name'] . ",\n\n";
        $message .= "Thank you for booking an appointment with Bessou Hair Beauty!\n\n";
        $message .= "Booking Details:\n";
        $message .= "Service: " . $booking_data['service_type'] . "\n";
        $message .= "Date: " . date('F j, Y', strtotime($booking_data['preferred_date'])) . "\n";
        $message .= "Time: " . date('g:i A', strtotime($booking_data['preferred_time'])) . "\n";
        $message .= "Deposit: $" . number_format($booking_data['deposit_amount'], 2) . "\n\n";
        $message .= "Please send your deposit payment and upload proof of payment to confirm your appointment.\n\n";
        $message .= "Thank you!\n";
        $message .= "Bessou Hair Beauty Team";
        
        wp_mail($to, $subject, $message);
        
        // Send notification to admin
        $admin_email = get_option('admin_email');
        $admin_subject = 'New Appointment Booking - ' . $booking_data['client_name'];
        wp_mail($admin_email, $admin_subject, $message);
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        $this->create_tables();
        $this->set_default_options();
        
        // Schedule appointment reminders
        if (!wp_next_scheduled('bessou_send_appointment_reminders')) {
            wp_schedule_event(time(), 'daily', 'bessou_send_appointment_reminders');
        }
        
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        wp_clear_scheduled_hook('bessou_send_appointment_reminders');
        flush_rewrite_rules();
    }
    
    /**
     * Create database tables
     */
    private function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Bookings table
        $bookings_table = $wpdb->prefix . 'bessou_bookings';
        $bookings_sql = "CREATE TABLE $bookings_table (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            booking_reference varchar(20) NOT NULL,
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
            status varchar(30) DEFAULT 'pending_payment',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            confirmed_at datetime DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY booking_reference (booking_reference),
            KEY client_email (client_email),
            KEY status (status),
            KEY preferred_date (preferred_date)
        ) $charset_collate;";
        
        // Payment proofs table
        $proofs_table = $wpdb->prefix . 'bessou_payment_proofs';
        $proofs_sql = "CREATE TABLE $proofs_table (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            booking_id mediumint(9) NOT NULL,
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
            KEY booking_id (booking_id),
            KEY status (status)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($bookings_sql);
        dbDelta($proofs_sql);
    }
    
    /**
     * Set default options
     */
    private function set_default_options() {
        add_option('bessou_booking_deposit_amount', 30);
        add_option('bessou_booking_business_hours', array(
            'monday' => array('start' => '09:00', 'end' => '19:00'),
            'tuesday' => array('start' => '09:00', 'end' => '19:00'),
            'wednesday' => array('start' => '09:00', 'end' => '19:00'),
            'thursday' => array('start' => '09:00', 'end' => '19:00'),
            'friday' => array('start' => '09:00', 'end' => '19:00'),
            'saturday' => array('start' => '09:00', 'end' => '19:00'),
            'sunday' => array('start' => 'closed', 'end' => 'closed'),
        ));
    }
}

// Initialize the plugin
new Bessou_Booking_System();

?>

