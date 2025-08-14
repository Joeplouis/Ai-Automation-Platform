<?php
/**
 * Plugin Name: Bessou Hair Beauty - Admin Dashboard & Analytics
 * Plugin URI: https://bessouhairbeauty.com
 * Description: Comprehensive admin dashboard with visitor analytics, booking statistics, revenue tracking, and business insights for Bessou Hair Beauty.
 * Version: 1.0.0
 * Author: BookAI Studio
 * License: GPL v2 or later
 * Text Domain: bessou-dashboard
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('BESSOU_DASHBOARD_VERSION', '1.0.0');
define('BESSOU_DASHBOARD_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BESSOU_DASHBOARD_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main Bessou Admin Dashboard Class
 */
class Bessou_Admin_Dashboard {
    
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
        load_plugin_textdomain('bessou-dashboard', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Initialize hooks
        $this->init_hooks();
        
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Enqueue scripts and styles
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        
        // Track visitor analytics
        add_action('wp', array($this, 'track_visitor'));
        
        // AJAX handlers
        add_action('wp_ajax_get_dashboard_stats', array($this, 'get_dashboard_stats'));
        add_action('wp_ajax_get_visitor_analytics', array($this, 'get_visitor_analytics'));
        add_action('wp_ajax_get_booking_analytics', array($this, 'get_booking_analytics'));
        add_action('wp_ajax_get_revenue_analytics', array($this, 'get_revenue_analytics'));
        add_action('wp_ajax_export_analytics', array($this, 'export_analytics'));
    }
    
    /**
     * Initialize hooks
     */
    private function init_hooks() {
        // Track booking events
        add_action('bessou_booking_created', array($this, 'track_booking_event'), 10, 2);
        add_action('bessou_booking_confirmed', array($this, 'track_booking_confirmed'), 10, 1);
        add_action('bessou_booking_cancelled', array($this, 'track_booking_cancelled'), 10, 1);
        add_action('bessou_payment_proof_uploaded', array($this, 'track_payment_proof'), 10, 2);
        
        // Track WooCommerce events
        add_action('woocommerce_new_order', array($this, 'track_woocommerce_order'), 10, 1);
        add_action('woocommerce_order_status_completed', array($this, 'track_order_completed'), 10, 1);
        
        // Daily analytics processing
        add_action('bessou_process_daily_analytics', array($this, 'process_daily_analytics'));
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            __('Bessou Dashboard', 'bessou-dashboard'),
            __('Dashboard', 'bessou-dashboard'),
            'manage_options',
            'bessou-dashboard',
            array($this, 'dashboard_page'),
            'dashicons-chart-area',
            2
        );
        
        add_submenu_page(
            'bessou-dashboard',
            __('Analytics Overview', 'bessou-dashboard'),
            __('Overview', 'bessou-dashboard'),
            'manage_options',
            'bessou-dashboard',
            array($this, 'dashboard_page')
        );
        
        add_submenu_page(
            'bessou-dashboard',
            __('Visitor Analytics', 'bessou-dashboard'),
            __('Visitors', 'bessou-dashboard'),
            'manage_options',
            'bessou-visitor-analytics',
            array($this, 'visitor_analytics_page')
        );
        
        add_submenu_page(
            'bessou-dashboard',
            __('Booking Analytics', 'bessou-dashboard'),
            __('Bookings', 'bessou-dashboard'),
            'manage_options',
            'bessou-booking-analytics',
            array($this, 'booking_analytics_page')
        );
        
        add_submenu_page(
            'bessou-dashboard',
            __('Revenue Analytics', 'bessou-dashboard'),
            __('Revenue', 'bessou-dashboard'),
            'manage_options',
            'bessou-revenue-analytics',
            array($this, 'revenue_analytics_page')
        );
        
        add_submenu_page(
            'bessou-dashboard',
            __('Real-time Monitor', 'bessou-dashboard'),
            __('Live Monitor', 'bessou-dashboard'),
            'manage_options',
            'bessou-realtime-monitor',
            array($this, 'realtime_monitor_page')
        );
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'bessou-dashboard') !== false || strpos($hook, 'bessou-') !== false) {
            // Chart.js for analytics
            wp_enqueue_script('chart-js', 'https://cdn.jsdelivr.net/npm/chart.js', array(), '3.9.1', true);
            
            // Dashboard scripts
            wp_enqueue_script('bessou-dashboard', BESSOU_DASHBOARD_PLUGIN_URL . 'assets/js/dashboard.js', array('jquery', 'chart-js'), BESSOU_DASHBOARD_VERSION, true);
            wp_enqueue_style('bessou-dashboard', BESSOU_DASHBOARD_PLUGIN_URL . 'assets/css/dashboard.css', array(), BESSOU_DASHBOARD_VERSION);
            
            // Localize script
            wp_localize_script('bessou-dashboard', 'bessou_dashboard', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('bessou_dashboard_nonce'),
                'refresh_interval' => 30000, // 30 seconds
                'currency_symbol' => get_woocommerce_currency_symbol(),
                'date_format' => get_option('date_format'),
                'time_format' => get_option('time_format'),
            ));
        }
    }
    
    /**
     * Dashboard overview page
     */
    public function dashboard_page() {
        ?>
        <div class="wrap bessou-dashboard">
            <h1><?php _e('Bessou Hair Beauty - Dashboard Overview', 'bessou-dashboard'); ?></h1>
            
            <!-- Real-time Stats Cards -->
            <div class="dashboard-stats-grid">
                <div class="stat-card visitors-card">
                    <div class="stat-icon">
                        <span class="dashicons dashicons-visibility"></span>
                    </div>
                    <div class="stat-content">
                        <h3 id="total-visitors">-</h3>
                        <p><?php _e('Total Visitors Today', 'bessou-dashboard'); ?></p>
                        <span class="stat-change" id="visitors-change">-</span>
                    </div>
                </div>
                
                <div class="stat-card bookings-card">
                    <div class="stat-icon">
                        <span class="dashicons dashicons-calendar-alt"></span>
                    </div>
                    <div class="stat-content">
                        <h3 id="total-bookings">-</h3>
                        <p><?php _e('Bookings Today', 'bessou-dashboard'); ?></p>
                        <span class="stat-change" id="bookings-change">-</span>
                    </div>
                </div>
                
                <div class="stat-card revenue-card">
                    <div class="stat-icon">
                        <span class="dashicons dashicons-money-alt"></span>
                    </div>
                    <div class="stat-content">
                        <h3 id="total-revenue">-</h3>
                        <p><?php _e('Revenue Today', 'bessou-dashboard'); ?></p>
                        <span class="stat-change" id="revenue-change">-</span>
                    </div>
                </div>
                
                <div class="stat-card conversion-card">
                    <div class="stat-icon">
                        <span class="dashicons dashicons-chart-line"></span>
                    </div>
                    <div class="stat-content">
                        <h3 id="conversion-rate">-</h3>
                        <p><?php _e('Conversion Rate', 'bessou-dashboard'); ?></p>
                        <span class="stat-change" id="conversion-change">-</span>
                    </div>
                </div>
            </div>
            
            <!-- Charts Row -->
            <div class="dashboard-charts-row">
                <div class="chart-container half-width">
                    <div class="chart-header">
                        <h3><?php _e('Visitor Traffic (Last 7 Days)', 'bessou-dashboard'); ?></h3>
                        <div class="chart-controls">
                            <select id="traffic-period">
                                <option value="7"><?php _e('Last 7 Days', 'bessou-dashboard'); ?></option>
                                <option value="30"><?php _e('Last 30 Days', 'bessou-dashboard'); ?></option>
                                <option value="90"><?php _e('Last 3 Months', 'bessou-dashboard'); ?></option>
                            </select>
                        </div>
                    </div>
                    <canvas id="traffic-chart"></canvas>
                </div>
                
                <div class="chart-container half-width">
                    <div class="chart-header">
                        <h3><?php _e('Booking Trends', 'bessou-dashboard'); ?></h3>
                        <div class="chart-controls">
                            <select id="booking-period">
                                <option value="7"><?php _e('Last 7 Days', 'bessou-dashboard'); ?></option>
                                <option value="30"><?php _e('Last 30 Days', 'bessou-dashboard'); ?></option>
                                <option value="90"><?php _e('Last 3 Months', 'bessou-dashboard'); ?></option>
                            </select>
                        </div>
                    </div>
                    <canvas id="bookings-chart"></canvas>
                </div>
            </div>
            
            <!-- Revenue and Services Row -->
            <div class="dashboard-charts-row">
                <div class="chart-container half-width">
                    <div class="chart-header">
                        <h3><?php _e('Revenue Breakdown', 'bessou-dashboard'); ?></h3>
                    </div>
                    <canvas id="revenue-chart"></canvas>
                </div>
                
                <div class="chart-container half-width">
                    <div class="chart-header">
                        <h3><?php _e('Popular Services', 'bessou-dashboard'); ?></h3>
                    </div>
                    <canvas id="services-chart"></canvas>
                </div>
            </div>
            
            <!-- Recent Activity -->
            <div class="dashboard-section">
                <div class="section-header">
                    <h3><?php _e('Recent Activity', 'bessou-dashboard'); ?></h3>
                    <button class="button" id="refresh-activity"><?php _e('Refresh', 'bessou-dashboard'); ?></button>
                </div>
                <div class="activity-feed" id="recent-activity">
                    <div class="loading"><?php _e('Loading recent activity...', 'bessou-dashboard'); ?></div>
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div class="dashboard-section">
                <div class="section-header">
                    <h3><?php _e('Quick Actions', 'bessou-dashboard'); ?></h3>
                </div>
                <div class="quick-actions">
                    <a href="<?php echo admin_url('admin.php?page=bessou-bookings'); ?>" class="action-button">
                        <span class="dashicons dashicons-calendar-alt"></span>
                        <?php _e('View All Bookings', 'bessou-dashboard'); ?>
                    </a>
                    <a href="<?php echo admin_url('admin.php?page=bessou-payment-proofs'); ?>" class="action-button">
                        <span class="dashicons dashicons-money-alt"></span>
                        <?php _e('Review Payment Proofs', 'bessou-dashboard'); ?>
                    </a>
                    <a href="<?php echo admin_url('admin.php?page=wc-orders'); ?>" class="action-button">
                        <span class="dashicons dashicons-cart"></span>
                        <?php _e('Manage Orders', 'bessou-dashboard'); ?>
                    </a>
                    <a href="#" class="action-button" id="export-analytics">
                        <span class="dashicons dashicons-download"></span>
                        <?php _e('Export Analytics', 'bessou-dashboard'); ?>
                    </a>
                </div>
            </div>
        </div>
        
        <style>
        .bessou-dashboard {
            max-width: 1400px;
        }
        
        .dashboard-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            display: flex;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .stat-icon {
            margin-right: 15px;
            font-size: 24px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .visitors-card .stat-icon { background: #e3f2fd; color: #1976d2; }
        .bookings-card .stat-icon { background: #f3e5f5; color: #7b1fa2; }
        .revenue-card .stat-icon { background: #e8f5e8; color: #388e3c; }
        .conversion-card .stat-icon { background: #fff3e0; color: #f57c00; }
        
        .stat-content h3 {
            margin: 0 0 5px 0;
            font-size: 28px;
            font-weight: bold;
            color: #333;
        }
        
        .stat-content p {
            margin: 0 0 5px 0;
            color: #666;
            font-size: 14px;
        }
        
        .stat-change {
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 4px;
        }
        
        .stat-change.positive {
            background: #e8f5e8;
            color: #388e3c;
        }
        
        .stat-change.negative {
            background: #ffebee;
            color: #d32f2f;
        }
        
        .dashboard-charts-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .chart-container {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .chart-container.full-width {
            grid-column: 1 / -1;
        }
        
        .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        
        .chart-header h3 {
            margin: 0;
            color: #333;
        }
        
        .chart-controls select {
            padding: 5px 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .dashboard-section {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        
        .section-header h3 {
            margin: 0;
            color: #333;
        }
        
        .activity-feed {
            max-height: 300px;
            overflow-y: auto;
        }
        
        .activity-item {
            display: flex;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .activity-item:last-child {
            border-bottom: none;
        }
        
        .activity-icon {
            margin-right: 10px;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }
        
        .activity-content {
            flex: 1;
        }
        
        .activity-title {
            font-weight: 500;
            color: #333;
            margin-bottom: 2px;
        }
        
        .activity-time {
            font-size: 12px;
            color: #666;
        }
        
        .quick-actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .action-button {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            text-decoration: none;
            color: #495057;
            transition: all 0.2s ease;
        }
        
        .action-button:hover {
            background: #e9ecef;
            border-color: #adb5bd;
            color: #212529;
            text-decoration: none;
        }
        
        .action-button .dashicons {
            margin-right: 8px;
            font-size: 18px;
        }
        
        .loading {
            text-align: center;
            padding: 20px;
            color: #666;
        }
        
        @media (max-width: 768px) {
            .dashboard-charts-row {
                grid-template-columns: 1fr;
            }
            
            .dashboard-stats-grid {
                grid-template-columns: 1fr;
            }
        }
        </style>
        <?php
    }
    
    /**
     * Visitor analytics page
     */
    public function visitor_analytics_page() {
        ?>
        <div class="wrap bessou-dashboard">
            <h1><?php _e('Visitor Analytics', 'bessou-dashboard'); ?></h1>
            
            <!-- Visitor Overview -->
            <div class="dashboard-stats-grid">
                <div class="stat-card">
                    <div class="stat-icon visitors-card">
                        <span class="dashicons dashicons-visibility"></span>
                    </div>
                    <div class="stat-content">
                        <h3 id="unique-visitors">-</h3>
                        <p><?php _e('Unique Visitors (30 days)', 'bessou-dashboard'); ?></p>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <span class="dashicons dashicons-admin-page"></span>
                    </div>
                    <div class="stat-content">
                        <h3 id="page-views">-</h3>
                        <p><?php _e('Page Views (30 days)', 'bessou-dashboard'); ?></p>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <span class="dashicons dashicons-clock"></span>
                    </div>
                    <div class="stat-content">
                        <h3 id="avg-session">-</h3>
                        <p><?php _e('Avg. Session Duration', 'bessou-dashboard'); ?></p>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <span class="dashicons dashicons-smartphone"></span>
                    </div>
                    <div class="stat-content">
                        <h3 id="mobile-percentage">-</h3>
                        <p><?php _e('Mobile Visitors', 'bessou-dashboard'); ?></p>
                    </div>
                </div>
            </div>
            
            <!-- Visitor Charts -->
            <div class="dashboard-charts-row">
                <div class="chart-container">
                    <div class="chart-header">
                        <h3><?php _e('New vs Returning Visitors', 'bessou-dashboard'); ?></h3>
                    </div>
                    <canvas id="visitor-type-chart"></canvas>
                </div>
                
                <div class="chart-container">
                    <div class="chart-header">
                        <h3><?php _e('Traffic Sources', 'bessou-dashboard'); ?></h3>
                    </div>
                    <canvas id="traffic-sources-chart"></canvas>
                </div>
            </div>
            
            <div class="dashboard-charts-row">
                <div class="chart-container">
                    <div class="chart-header">
                        <h3><?php _e('Device Types', 'bessou-dashboard'); ?></h3>
                    </div>
                    <canvas id="device-chart"></canvas>
                </div>
                
                <div class="chart-container">
                    <div class="chart-header">
                        <h3><?php _e('Top Pages', 'bessou-dashboard'); ?></h3>
                    </div>
                    <div id="top-pages-list" class="data-list">
                        <div class="loading"><?php _e('Loading top pages...', 'bessou-dashboard'); ?></div>
                    </div>
                </div>
            </div>
            
            <!-- Geographic Data -->
            <div class="chart-container full-width">
                <div class="chart-header">
                    <h3><?php _e('Visitor Locations (Top 10)', 'bessou-dashboard'); ?></h3>
                </div>
                <canvas id="geographic-chart"></canvas>
            </div>
        </div>
        <?php
    }
    
    /**
     * Track visitor
     */
    public function track_visitor() {
        // Don't track admin users or bots
        if (is_admin() || current_user_can('manage_options') || $this->is_bot()) {
            return;
        }
        
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'bessou_visitor_analytics';
        
        $visitor_data = array(
            'ip_address' => $this->get_visitor_ip(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'page_url' => $_SERVER['REQUEST_URI'] ?? '',
            'referrer' => $_SERVER['HTTP_REFERER'] ?? '',
            'session_id' => $this->get_session_id(),
            'is_new_visitor' => $this->is_new_visitor(),
            'device_type' => $this->get_device_type(),
            'browser' => $this->get_browser(),
            'country' => $this->get_visitor_country(),
            'city' => $this->get_visitor_city(),
            'visit_time' => current_time('mysql'),
        );
        
        $wpdb->insert($table_name, $visitor_data);
    }
    
    /**
     * Get dashboard statistics
     */
    public function get_dashboard_stats() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'bessou_dashboard_nonce')) {
            wp_die('Security check failed');
        }
        
        global $wpdb;
        
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        
        // Visitors today
        $visitors_table = $wpdb->prefix . 'bessou_visitor_analytics';
        $visitors_today = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(DISTINCT ip_address) FROM $visitors_table WHERE DATE(visit_time) = %s",
            $today
        ));
        
        $visitors_yesterday = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(DISTINCT ip_address) FROM $visitors_table WHERE DATE(visit_time) = %s",
            $yesterday
        ));
        
        // Bookings today
        $bookings_table = $wpdb->prefix . 'bessou_bookings';
        $bookings_today = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $bookings_table WHERE DATE(created_at) = %s",
            $today
        ));
        
        $bookings_yesterday = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $bookings_table WHERE DATE(created_at) = %s",
            $yesterday
        ));
        
        // Revenue today (bookings + WooCommerce)
        $booking_revenue = $wpdb->get_var($wpdb->prepare(
            "SELECT SUM(deposit_amount) FROM $bookings_table WHERE DATE(created_at) = %s AND status IN ('confirmed', 'completed')",
            $today
        ));
        
        $wc_revenue = 0;
        if (class_exists('WooCommerce')) {
            $orders = wc_get_orders(array(
                'date_created' => $today,
                'status' => array('completed', 'processing'),
                'return' => 'ids',
            ));
            
            foreach ($orders as $order_id) {
                $order = wc_get_order($order_id);
                $wc_revenue += $order->get_total();
            }
        }
        
        $total_revenue_today = ($booking_revenue ?? 0) + $wc_revenue;
        
        // Calculate conversion rate
        $conversion_rate = $visitors_today > 0 ? ($bookings_today / $visitors_today) * 100 : 0;
        
        // Calculate changes
        $visitors_change = $visitors_yesterday > 0 ? (($visitors_today - $visitors_yesterday) / $visitors_yesterday) * 100 : 0;
        $bookings_change = $bookings_yesterday > 0 ? (($bookings_today - $bookings_yesterday) / $bookings_yesterday) * 100 : 0;
        
        // Recent activity
        $recent_activity = $this->get_recent_activity();
        
        wp_send_json_success(array(
            'visitors_today' => intval($visitors_today),
            'visitors_change' => round($visitors_change, 1),
            'bookings_today' => intval($bookings_today),
            'bookings_change' => round($bookings_change, 1),
            'revenue_today' => number_format($total_revenue_today, 2),
            'conversion_rate' => round($conversion_rate, 1),
            'recent_activity' => $recent_activity,
        ));
    }
    
    /**
     * Get recent activity
     */
    private function get_recent_activity() {
        global $wpdb;
        
        $activities = array();
        
        // Recent bookings
        $bookings_table = $wpdb->prefix . 'bessou_bookings';
        $recent_bookings = $wpdb->get_results($wpdb->prepare(
            "SELECT client_name, service_type, created_at FROM $bookings_table WHERE created_at >= %s ORDER BY created_at DESC LIMIT 5",
            date('Y-m-d H:i:s', strtotime('-24 hours'))
        ));
        
        foreach ($recent_bookings as $booking) {
            $activities[] = array(
                'type' => 'booking',
                'icon' => 'calendar-alt',
                'title' => sprintf(__('%s booked %s', 'bessou-dashboard'), $booking->client_name, $booking->service_type),
                'time' => human_time_diff(strtotime($booking->created_at)) . ' ago',
                'timestamp' => strtotime($booking->created_at),
            );
        }
        
        // Recent orders (WooCommerce)
        if (class_exists('WooCommerce')) {
            $orders = wc_get_orders(array(
                'date_created' => '>=' . (time() - 24 * 60 * 60),
                'limit' => 5,
                'orderby' => 'date',
                'order' => 'DESC',
            ));
            
            foreach ($orders as $order) {
                $activities[] = array(
                    'type' => 'order',
                    'icon' => 'cart',
                    'title' => sprintf(__('New order #%s - %s', 'bessou-dashboard'), $order->get_order_number(), wc_price($order->get_total())),
                    'time' => human_time_diff($order->get_date_created()->getTimestamp()) . ' ago',
                    'timestamp' => $order->get_date_created()->getTimestamp(),
                );
            }
        }
        
        // Sort by timestamp
        usort($activities, function($a, $b) {
            return $b['timestamp'] - $a['timestamp'];
        });
        
        return array_slice($activities, 0, 10);
    }
    
    /**
     * Helper functions
     */
    private function get_visitor_ip() {
        $ip_keys = array('HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR');
        foreach ($ip_keys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
    
    private function get_session_id() {
        if (!session_id()) {
            session_start();
        }
        return session_id();
    }
    
    private function is_new_visitor() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'bessou_visitor_analytics';
        $ip = $this->get_visitor_ip();
        
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table_name WHERE ip_address = %s AND visit_time < %s",
            $ip,
            date('Y-m-d H:i:s', strtotime('-1 hour'))
        ));
        
        return $existing == 0;
    }
    
    private function get_device_type() {
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        
        if (preg_match('/mobile|android|iphone|ipad|phone/i', $user_agent)) {
            return 'mobile';
        } elseif (preg_match('/tablet|ipad/i', $user_agent)) {
            return 'tablet';
        } else {
            return 'desktop';
        }
    }
    
    private function get_browser() {
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        
        if (strpos($user_agent, 'Chrome') !== false) return 'Chrome';
        if (strpos($user_agent, 'Firefox') !== false) return 'Firefox';
        if (strpos($user_agent, 'Safari') !== false) return 'Safari';
        if (strpos($user_agent, 'Edge') !== false) return 'Edge';
        if (strpos($user_agent, 'Opera') !== false) return 'Opera';
        
        return 'Other';
    }
    
    private function get_visitor_country() {
        // Simple IP geolocation (you might want to use a service like MaxMind)
        $ip = $this->get_visitor_ip();
        
        // For demo purposes, return a placeholder
        // In production, integrate with a geolocation service
        return 'US';
    }
    
    private function get_visitor_city() {
        // Simple IP geolocation (you might want to use a service like MaxMind)
        $ip = $this->get_visitor_ip();
        
        // For demo purposes, return a placeholder
        // In production, integrate with a geolocation service
        return 'New York';
    }
    
    private function is_bot() {
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $bots = array('bot', 'crawler', 'spider', 'scraper');
        
        foreach ($bots as $bot) {
            if (stripos($user_agent, $bot) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        $this->create_tables();
        
        // Schedule daily analytics processing
        if (!wp_next_scheduled('bessou_process_daily_analytics')) {
            wp_schedule_event(time(), 'daily', 'bessou_process_daily_analytics');
        }
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        wp_clear_scheduled_hook('bessou_process_daily_analytics');
    }
    
    /**
     * Create database tables
     */
    private function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Visitor analytics table
        $visitor_table = $wpdb->prefix . 'bessou_visitor_analytics';
        $visitor_sql = "CREATE TABLE $visitor_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            ip_address varchar(45) NOT NULL,
            user_agent text,
            page_url varchar(255),
            referrer varchar(255),
            session_id varchar(100),
            is_new_visitor tinyint(1) DEFAULT 1,
            device_type varchar(20),
            browser varchar(50),
            country varchar(2),
            city varchar(100),
            visit_time datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY ip_address (ip_address),
            KEY visit_time (visit_time),
            KEY session_id (session_id)
        ) $charset_collate;";
        
        // Daily analytics summary table
        $daily_table = $wpdb->prefix . 'bessou_daily_analytics';
        $daily_sql = "CREATE TABLE $daily_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            date date NOT NULL,
            unique_visitors int(11) DEFAULT 0,
            page_views int(11) DEFAULT 0,
            new_visitors int(11) DEFAULT 0,
            returning_visitors int(11) DEFAULT 0,
            mobile_visitors int(11) DEFAULT 0,
            desktop_visitors int(11) DEFAULT 0,
            tablet_visitors int(11) DEFAULT 0,
            total_bookings int(11) DEFAULT 0,
            confirmed_bookings int(11) DEFAULT 0,
            booking_revenue decimal(10,2) DEFAULT 0,
            woocommerce_revenue decimal(10,2) DEFAULT 0,
            conversion_rate decimal(5,2) DEFAULT 0,
            avg_session_duration int(11) DEFAULT 0,
            PRIMARY KEY (id),
            UNIQUE KEY date (date)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($visitor_sql);
        dbDelta($daily_sql);
    }
}

// Initialize the plugin
new Bessou_Admin_Dashboard();

?>

