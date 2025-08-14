<?php
/**
 * AI Agency Pro WordPress Theme
 * Main template file
 */

get_header(); ?>

<main class="main-content">
    <!-- Hero Section -->
    <section class="hero-section" id="home">
        <div class="hero-content">
            <h1 class="hero-title">Transform Your Business with AI Automation</h1>
            <p class="hero-subtitle">Expert AI consulting and custom automation solutions for small businesses</p>
            <p class="hero-description">
                20+ years of software engineering experience combined with cutting-edge AI technology. 
                Get personalized training, custom automation, and content generation systems that drive real results.
            </p>
            <div class="hero-buttons">
                <a href="#contact" class="btn-primary">Book Free Consultation</a>
                <a href="#services" class="btn-secondary">View Services</a>
            </div>
        </div>
    </section>

    <!-- Services Section -->
    <section class="services-section" id="services">
        <div class="container">
            <div class="section-title">
                <h2>AI Solutions for Your Business</h2>
                <p>Comprehensive AI consulting and automation services tailored to your specific needs</p>
            </div>
            
            <div class="services-grid">
                <!-- Free Consultation -->
                <div class="service-card">
                    <div class="service-icon">🎯</div>
                    <h3 class="service-title">Free Consultation</h3>
                    <p class="service-description">
                        30-minute discovery call to assess your business needs and identify AI opportunities
                    </p>
                    <div class="service-price">FREE</div>
                    <a href="#contact" class="btn-primary">Schedule Now</a>
                </div>

                <!-- AI Training Session -->
                <div class="service-card">
                    <div class="service-icon">🧠</div>
                    <h3 class="service-title">AI Training Session</h3>
                    <p class="service-description">
                        1.5-hour intensive training on AI tools for sales, admin, customer service, and more
                    </p>
                    <div class="service-price">$350</div>
                    <a href="#contact" class="btn-primary">Book Training</a>
                </div>

                <!-- Custom Automation -->
                <div class="service-card">
                    <div class="service-icon">⚙️</div>
                    <h3 class="service-title">Custom Automation</h3>
                    <p class="service-description">
                        Tailored AI automation systems with analytics dashboard and CRM integration
                    </p>
                    <div class="service-price">Custom Quote</div>
                    <a href="#contact" class="btn-primary">Get Quote</a>
                </div>

                <!-- Content Generation -->
                <div class="service-card">
                    <div class="service-icon">📝</div>
                    <h3 class="service-title">Content Packages</h3>
                    <p class="service-description">
                        Automated content generation and social media posting with brand customization
                    </p>
                    <div class="service-price">Starting $297/mo</div>
                    <a href="#packages" class="btn-primary">View Packages</a>
                </div>

                <!-- GoHighLevel Integration -->
                <div class="service-card">
                    <div class="service-icon">🔗</div>
                    <h3 class="service-title">CRM Integration</h3>
                    <p class="service-description">
                        GoHighLevel CRM integration with automated workflows and lead management
                    </p>
                    <div class="service-price">$197/mo</div>
                    <a href="#contact" class="btn-primary">Learn More</a>
                </div>

                <!-- AI Tools Training -->
                <div class="service-card">
                    <div class="service-icon">🛠️</div>
                    <h3 class="service-title">AI Tools Mastery</h3>
                    <p class="service-description">
                        Complete training on ChatGPT, automation tools, and AI implementation strategies
                    </p>
                    <div class="service-price">$497</div>
                    <a href="#contact" class="btn-primary">Enroll Now</a>
                </div>
            </div>
        </div>
    </section>

    <!-- AI Agent Demo Section -->
    <section class="ai-agent-section" id="ai-demo">
        <div class="ai-agent-container">
            <h2>Experience Our AI Assistant</h2>
            <p>Interact with our AI agent to see the power of automation in action</p>
            
            <div class="ai-agent-embed">
                <?php 
                $ai_agent_url = get_option('ai_agent_embed_url', '');
                if (!empty($ai_agent_url)): ?>
                    <iframe src="<?php echo esc_url($ai_agent_url); ?>" 
                            width="100%" 
                            height="400" 
                            frameborder="0"
                            style="border-radius: 15px;">
                    </iframe>
                <?php else: ?>
                    <div class="ai-agent-placeholder">
                        <p>AI Agent will be embedded here<br>
                        <small>Configure the embed URL in WordPress Admin → AI Agency Settings</small></p>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </section>

    <!-- About Section -->
    <section class="about-section" id="about">
        <div class="container">
            <div class="contact-grid">
                <div class="about-content">
                    <h2>20+ Years of Software Engineering Excellence</h2>
                    <p>
                        As a seasoned software engineer with two decades of experience running my own company, 
                        I've witnessed the evolution of technology firsthand. For the past 2 years, I've been 
                        deeply immersed in AI technology, developing sophisticated automation systems.
                    </p>
                    <p>
                        My expertise includes:
                    </p>
                    <ul style="color: var(--light-gray); margin-left: 2rem; margin-bottom: 2rem;">
                        <li>Complex AI automation with N8N and PostgreSQL</li>
                        <li>Custom LLM integration and AI tool development</li>
                        <li>GoHighLevel CRM integration and workflow automation</li>
                        <li>Social media automation and content generation</li>
                        <li>Business process optimization and digital transformation</li>
                    </ul>
                    <p>
                        I specialize in helping small business owners leverage AI for sales automation, 
                        customer onboarding, administrative tasks, appointment scheduling, and comprehensive 
                        business automation solutions.
                    </p>
                </div>
                <div class="about-image">
                    <div style="background: rgba(42, 52, 65, 0.8); padding: 3rem; border-radius: 15px; text-align: center;">
                        <h3 style="color: var(--accent-gold); margin-bottom: 2rem;">Expertise Areas</h3>
                        <div style="display: grid; gap: 1rem;">
                            <div style="padding: 1rem; background: rgba(10, 22, 40, 0.5); border-radius: 8px;">
                                <strong style="color: var(--light-gold);">AI Implementation</strong>
                                <p style="margin: 0; font-size: 0.9rem;">ChatGPT, LLMs, Custom AI Tools</p>
                            </div>
                            <div style="padding: 1rem; background: rgba(10, 22, 40, 0.5); border-radius: 8px;">
                                <strong style="color: var(--light-gold);">Automation Systems</strong>
                                <p style="margin: 0; font-size: 0.9rem;">N8N, Workflows, CRM Integration</p>
                            </div>
                            <div style="padding: 1rem; background: rgba(10, 22, 40, 0.5); border-radius: 8px;">
                                <strong style="color: var(--light-gold);">Business Optimization</strong>
                                <p style="margin: 0; font-size: 0.9rem;">Process Automation, Analytics</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section class="contact-section" id="contact">
        <div class="container">
            <div class="section-title">
                <h2>Ready to Transform Your Business?</h2>
                <p>Schedule your free consultation or choose a service package</p>
            </div>
            
            <div class="contact-grid">
                <div class="contact-form">
                    <h3 style="color: var(--accent-gold); margin-bottom: 2rem;">Get Started Today</h3>
                    
                    <?php echo do_shortcode('[contact-form-7 id="1" title="Main Contact Form"]'); ?>
                    
                    <!-- Fallback form if Contact Form 7 is not active -->
                    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display: none;" id="fallback-form">
                        <input type="hidden" name="action" value="ai_agency_contact">
                        <?php wp_nonce_field('ai_agency_contact_nonce'); ?>
                        
                        <div class="form-group">
                            <label for="contact_name">Full Name *</label>
                            <input type="text" id="contact_name" name="contact_name" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="contact_email">Email Address *</label>
                            <input type="email" id="contact_email" name="contact_email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="contact_phone">Phone Number</label>
                            <input type="tel" id="contact_phone" name="contact_phone">
                        </div>
                        
                        <div class="form-group">
                            <label for="contact_company">Company Name</label>
                            <input type="text" id="contact_company" name="contact_company">
                        </div>
                        
                        <div class="form-group">
                            <label for="contact_service">Service Interest *</label>
                            <select id="contact_service" name="contact_service" required>
                                <option value="">Select a service...</option>
                                <option value="free-consultation">Free 30-min Consultation</option>
                                <option value="ai-training">AI Training Session ($350)</option>
                                <option value="custom-automation">Custom Automation</option>
                                <option value="content-packages">Content Generation Packages</option>
                                <option value="crm-integration">CRM Integration</option>
                                <option value="ai-tools-mastery">AI Tools Mastery Course</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="contact_message">Tell us about your business needs</label>
                            <textarea id="contact_message" name="contact_message" rows="5" placeholder="Describe your current challenges and what you'd like to achieve with AI automation..."></textarea>
                        </div>
                        
                        <button type="submit" class="btn-primary w-full">Send Message</button>
                    </form>
                    
                    <!-- Calendar Integration -->
                    <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid rgba(212, 175, 55, 0.2);">
                        <h4 style="color: var(--light-gold); margin-bottom: 1rem;">Or Schedule Directly:</h4>
                        <?php 
                        $calendar_url = get_option('google_calendar_url', '');
                        if (!empty($calendar_url)): ?>
                            <a href="<?php echo esc_url($calendar_url); ?>" 
                               class="btn-secondary w-full" 
                               target="_blank" 
                               style="display: block; text-align: center;">
                                Book Free Consultation
                            </a>
                        <?php else: ?>
                            <p style="color: var(--medium-gray); font-size: 0.9rem; text-align: center;">
                                Calendar integration will be available here<br>
                                <small>Configure Google Calendar URL in WordPress Admin</small>
                            </p>
                        <?php endif; ?>
                    </div>
                </div>
                
                <div class="contact-info">
                    <h3 style="color: var(--accent-gold); margin-bottom: 2rem;">Contact Information</h3>
                    
                    <div class="contact-item">
                        <div class="contact-icon">📧</div>
                        <div>
                            <h4>Email</h4>
                            <p><?php echo get_option('contact_email', 'info@bookaistudio.com'); ?></p>
                        </div>
                    </div>
                    
                    <div class="contact-item">
                        <div class="contact-icon">📞</div>
                        <div>
                            <h4>Phone</h4>
                            <p><?php echo get_option('contact_phone', '+1 (555) 123-4567'); ?></p>
                        </div>
                    </div>
                    
                    <div class="contact-item">
                        <div class="contact-icon">🌐</div>
                        <div>
                            <h4>Website</h4>
                            <p><?php echo home_url(); ?></p>
                        </div>
                    </div>
                    
                    <div class="contact-item">
                        <div class="contact-icon">⏰</div>
                        <div>
                            <h4>Business Hours</h4>
                            <p>Monday - Friday: 9:00 AM - 6:00 PM EST<br>
                            Weekend consultations available by appointment</p>
                        </div>
                    </div>
                    
                    <!-- Payment Methods -->
                    <div style="margin-top: 2rem; padding: 1.5rem; background: rgba(42, 52, 65, 0.6); border-radius: 10px;">
                        <h4 style="color: var(--light-gold); margin-bottom: 1rem;">Payment Methods</h4>
                        <p style="color: var(--light-gray); font-size: 0.9rem;">
                            We accept Stripe and PayPal for secure online payments. 
                            Payment processing is handled through encrypted, PCI-compliant systems.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>
</main>

<script>
// Show fallback form if Contact Form 7 is not loaded
document.addEventListener('DOMContentLoaded', function() {
    const cf7Form = document.querySelector('.wpcf7-form');
    const fallbackForm = document.getElementById('fallback-form');
    
    if (!cf7Form && fallbackForm) {
        fallbackForm.style.display = 'block';
    }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Header scroll effect
window.addEventListener('scroll', function() {
    const header = document.querySelector('.site-header');
    if (window.scrollY > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});
</script>

<?php get_footer(); ?>

