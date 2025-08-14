<?php
/**
 * Zelle Payment Gateway Class
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Bessou Zelle Gateway
 */
class Bessou_Zelle_Gateway extends WC_Payment_Gateway {
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->id = 'bessou_zelle';
        $this->icon = BESSOU_PAYMENTS_PLUGIN_URL . 'assets/images/zelle-icon.png';
        $this->has_fields = true;
        $this->method_title = __('Zelle Payment', 'bessou-payments');
        $this->method_description = __('Accept payments via Zelle with proof of payment upload.', 'bessou-payments');
        
        // Load the settings
        $this->init_form_fields();
        $this->init_settings();
        
        // Define user set variables
        $this->title = $this->get_option('title');
        $this->description = $this->get_option('description');
        $this->instructions = $this->get_option('instructions');
        $this->zelle_info = $this->get_option('zelle_info');
        $this->enabled = $this->get_option('enabled');
        
        // Actions
        add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
        add_action('woocommerce_thankyou_' . $this->id, array($this, 'thankyou_page'));
        add_action('woocommerce_email_before_order_table', array($this, 'email_instructions'), 10, 3);
    }
    
    /**
     * Initialize Gateway Settings Form Fields
     */
    public function init_form_fields() {
        $this->form_fields = array(
            'enabled' => array(
                'title' => __('Enable/Disable', 'bessou-payments'),
                'type' => 'checkbox',
                'label' => __('Enable Zelle Payment', 'bessou-payments'),
                'default' => 'no',
            ),
            'title' => array(
                'title' => __('Title', 'bessou-payments'),
                'type' => 'text',
                'description' => __('This controls the title which the user sees during checkout.', 'bessou-payments'),
                'default' => __('Zelle Payment', 'bessou-payments'),
                'desc_tip' => true,
            ),
            'description' => array(
                'title' => __('Description', 'bessou-payments'),
                'type' => 'textarea',
                'description' => __('Payment method description that the customer will see on your checkout.', 'bessou-payments'),
                'default' => __('Send payment via Zelle and upload proof of payment.', 'bessou-payments'),
                'desc_tip' => true,
            ),
            'instructions' => array(
                'title' => __('Instructions', 'bessou-payments'),
                'type' => 'textarea',
                'description' => __('Instructions that will be added to the thank you page and emails.', 'bessou-payments'),
                'default' => __('Please send payment via Zelle and upload your proof of payment.', 'bessou-payments'),
                'desc_tip' => true,
            ),
            'zelle_info' => array(
                'title' => __('Zelle Email/Phone', 'bessou-payments'),
                'type' => 'text',
                'description' => __('Your Zelle email address or phone number.', 'bessou-payments'),
                'default' => '',
                'desc_tip' => true,
            ),
        );
    }
    
    /**
     * Payment form on checkout page
     */
    public function payment_fields() {
        if ($this->description) {
            echo wpautop(wptexturize($this->description));
        }
        
        echo '<div class="zelle-payment-form">';
        echo '<p><strong>' . __('Zelle Payment Information:', 'bessou-payments') . '</strong></p>';
        echo '<p>' . sprintf(__('Send payment to: %s', 'bessou-payments'), '<strong>' . esc_html($this->zelle_info) . '</strong>') . '</p>';
        echo '<p>' . __('After sending payment, you will be able to upload proof of payment on the next page.', 'bessou-payments') . '</p>';
        
        echo '<div class="form-row form-row-wide">';
        echo '<label for="zelle_transaction_id">' . __('Transaction ID (Optional)', 'bessou-payments') . '</label>';
        echo '<input type="text" id="zelle_transaction_id" name="zelle_transaction_id" placeholder="' . __('Enter Zelle transaction ID if available', 'bessou-payments') . '" />';
        echo '</div>';
        
        echo '<div class="form-row form-row-wide">';
        echo '<label for="zelle_sender_info">' . __('Your Zelle Email/Phone', 'bessou-payments') . '</label>';
        echo '<input type="text" id="zelle_sender_info" name="zelle_sender_info" placeholder="' . __('Email or phone used to send payment', 'bessou-payments') . '" required />';
        echo '</div>';
        
        echo '</div>';
    }
    
    /**
     * Validate payment fields
     */
    public function validate_fields() {
        if (empty($_POST['zelle_sender_info'])) {
            wc_add_notice(__('Please provide your Zelle email or phone number.', 'bessou-payments'), 'error');
            return false;
        }
        
        return true;
    }
    
    /**
     * Process the payment
     */
    public function process_payment($order_id) {
        $order = wc_get_order($order_id);
        
        // Save Zelle payment information
        $order->update_meta_data('_zelle_transaction_id', sanitize_text_field($_POST['zelle_transaction_id']));
        $order->update_meta_data('_zelle_sender_info', sanitize_text_field($_POST['zelle_sender_info']));
        $order->update_meta_data('_zelle_recipient_info', $this->zelle_info);
        
        // Mark as on-hold (we're awaiting payment proof)
        $order->update_status('on-hold', __('Awaiting Zelle payment proof.', 'bessou-payments'));
        
        // Reduce stock levels
        wc_reduce_stock_levels($order_id);
        
        // Remove cart
        WC()->cart->empty_cart();
        
        // Return thankyou redirect
        return array(
            'result' => 'success',
            'redirect' => $this->get_return_url($order),
        );
    }
    
    /**
     * Output for the order received page
     */
    public function thankyou_page($order_id) {
        if ($this->instructions) {
            echo wpautop(wptexturize($this->instructions));
        }
        
        $order = wc_get_order($order_id);
        $zelle_info = $order->get_meta('_zelle_recipient_info');
        
        echo '<div class="zelle-payment-instructions">';
        echo '<h3>' . __('Complete Your Zelle Payment', 'bessou-payments') . '</h3>';
        echo '<p><strong>' . __('Send payment to:', 'bessou-payments') . '</strong> ' . esc_html($zelle_info) . '</p>';
        echo '<p><strong>' . __('Amount:', 'bessou-payments') . '</strong> $' . $order->get_total() . '</p>';
        echo '<p><strong>' . __('Order Number:', 'bessou-payments') . '</strong> #' . $order->get_order_number() . '</p>';
        echo '<p>' . __('Please include your order number in the Zelle memo/note.', 'bessou-payments') . '</p>';
        echo '</div>';
        
        // Payment proof upload form
        $this->display_payment_proof_form($order_id);
    }
    
    /**
     * Add content to the WC emails
     */
    public function email_instructions($order, $sent_to_admin, $plain_text = false) {
        if ($this->instructions && !$sent_to_admin && $this->id === $order->get_payment_method() && $order->has_status('on-hold')) {
            echo wpautop(wptexturize($this->instructions)) . PHP_EOL;
            
            $zelle_info = $order->get_meta('_zelle_recipient_info');
            
            if ($plain_text) {
                echo "Zelle Payment Information:\n";
                echo "Send payment to: " . $zelle_info . "\n";
                echo "Amount: $" . $order->get_total() . "\n";
                echo "Order Number: #" . $order->get_order_number() . "\n";
                echo "Please include your order number in the Zelle memo.\n\n";
            } else {
                echo '<h3>Zelle Payment Information</h3>';
                echo '<p><strong>Send payment to:</strong> ' . esc_html($zelle_info) . '</p>';
                echo '<p><strong>Amount:</strong> $' . $order->get_total() . '</p>';
                echo '<p><strong>Order Number:</strong> #' . $order->get_order_number() . '</p>';
                echo '<p>Please include your order number in the Zelle memo.</p>';
            }
        }
    }
    
    /**
     * Display payment proof upload form
     */
    private function display_payment_proof_form($order_id) {
        ?>
        <div class="payment-proof-upload" style="margin-top: 30px; padding: 20px; background: #f8f8f8; border-radius: 10px;">
            <h3><?php _e('Upload Payment Proof', 'bessou-payments'); ?></h3>
            <p><?php _e('After sending your Zelle payment, please upload a screenshot or photo as proof of payment.', 'bessou-payments'); ?></p>
            
            <form id="payment-proof-form" enctype="multipart/form-data">
                <input type="hidden" name="order_id" value="<?php echo esc_attr($order_id); ?>" />
                <input type="hidden" name="payment_method" value="zelle" />
                
                <div class="form-row">
                    <label for="payment_proof"><?php _e('Payment Proof Image', 'bessou-payments'); ?> *</label>
                    <input type="file" id="payment_proof" name="payment_proof" accept="image/*" required />
                    <small><?php _e('Upload a screenshot or photo of your Zelle payment confirmation.', 'bessou-payments'); ?></small>
                </div>
                
                <div class="form-row">
                    <label for="transaction_id"><?php _e('Transaction ID', 'bessou-payments'); ?></label>
                    <input type="text" id="transaction_id" name="transaction_id" placeholder="<?php _e('Enter transaction ID from Zelle', 'bessou-payments'); ?>" />
                </div>
                
                <div class="form-row">
                    <label for="amount"><?php _e('Amount Sent', 'bessou-payments'); ?> *</label>
                    <input type="number" id="amount" name="amount" step="0.01" min="0" required />
                </div>
                
                <div class="form-row">
                    <button type="submit" class="button"><?php _e('Upload Proof', 'bessou-payments'); ?></button>
                </div>
            </form>
            
            <div id="upload-result" style="margin-top: 15px;"></div>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            $('#payment-proof-form').on('submit', function(e) {
                e.preventDefault();
                
                var formData = new FormData(this);
                formData.append('action', 'upload_payment_proof');
                formData.append('nonce', bessou_payments.nonce);
                
                $.ajax({
                    url: bessou_payments.ajax_url,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    beforeSend: function() {
                        $('#upload-result').html('<p>Uploading...</p>');
                    },
                    success: function(response) {
                        if (response.success) {
                            $('#upload-result').html('<div class="woocommerce-message">' + response.data.message + '</div>');
                            $('#payment-proof-form')[0].reset();
                        } else {
                            $('#upload-result').html('<div class="woocommerce-error">' + response.data + '</div>');
                        }
                    },
                    error: function() {
                        $('#upload-result').html('<div class="woocommerce-error">Upload failed. Please try again.</div>');
                    }
                });
            });
        });
        </script>
        <?php
    }
}

?>

