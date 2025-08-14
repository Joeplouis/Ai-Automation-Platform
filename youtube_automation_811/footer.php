    <!-- Fixed Footer -->
    <footer class="site-footer">
        <div class="footer-container">
            <!-- Copyright -->
            <div class="footer-copyright">
                <p>&copy; <?php echo date('Y'); ?> <?php echo get_option('site_title', 'BookAI Studio'); ?>. All rights reserved.</p>
            </div>
            
            <!-- Footer Links -->
            <nav class="footer-links">
                <ul>
                    <li><a href="<?php echo home_url('/privacy-policy'); ?>">Privacy Policy</a></li>
                    <li><a href="<?php echo home_url('/terms-of-service'); ?>">Terms of Service</a></li>
                    <li><a href="#contact">Contact</a></li>
                    <?php if (get_option('show_blog_link', false)): ?>
                    <li><a href="<?php echo home_url('/blog'); ?>">Blog</a></li>
                    <?php endif; ?>
                </ul>
            </nav>
            
            <!-- Social Media Links -->
            <div class="footer-social">
                <?php 
                $social_links = array(
                    'linkedin' => get_option('linkedin_url', ''),
                    'twitter' => get_option('twitter_url', ''),
                    'facebook' => get_option('facebook_url', ''),
                    'youtube' => get_option('youtube_url', ''),
                    'instagram' => get_option('instagram_url', '')
                );
                
                foreach ($social_links as $platform => $url):
                    if (!empty($url)):
                        $icon_class = '';
                        switch ($platform) {
                            case 'linkedin':
                                $icon_class = 'fab fa-linkedin-in';
                                break;
                            case 'twitter':
                                $icon_class = 'fab fa-twitter';
                                break;
                            case 'facebook':
                                $icon_class = 'fab fa-facebook-f';
                                break;
                            case 'youtube':
                                $icon_class = 'fab fa-youtube';
                                break;
                            case 'instagram':
                                $icon_class = 'fab fa-instagram';
                                break;
                        }
                ?>
                    <a href="<?php echo esc_url($url); ?>" 
                       class="social-link" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       aria-label="<?php echo ucfirst($platform); ?>">
                        <i class="<?php echo $icon_class; ?>"></i>
                    </a>
                <?php 
                    endif;
                endforeach; 
                ?>
            </div>
        </div>
    </footer>

    <!-- Back to Top Button -->
    <button id="back-to-top" class="back-to-top" style="display: none;">
        <i class="fas fa-chevron-up"></i>
    </button>

    <!-- Loading Overlay -->
    <div id="loading-overlay" class="loading-overlay" style="display: none;">
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    </div>

    <!-- Cookie Consent Banner -->
    <?php if (get_option('show_cookie_consent', true)): ?>
    <div id="cookie-consent" class="cookie-consent" style="display: none;">
        <div class="cookie-content">
            <p>
                We use cookies to enhance your experience and analyze our website traffic. 
                By continuing to use our site, you consent to our use of cookies.
            </p>
            <div class="cookie-buttons">
                <button id="accept-cookies" class="btn-primary">Accept</button>
                <button id="decline-cookies" class="btn-secondary">Decline</button>
                <a href="<?php echo home_url('/privacy-policy'); ?>" class="cookie-link">Learn More</a>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <!-- Custom JavaScript -->
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        // Back to Top Button
        const backToTopBtn = document.getElementById('back-to-top');
        
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                backToTopBtn.style.display = 'block';
            } else {
                backToTopBtn.style.display = 'none';
            }
        });
        
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
        
        // Cookie Consent
        const cookieConsent = document.getElementById('cookie-consent');
        const acceptCookies = document.getElementById('accept-cookies');
        const declineCookies = document.getElementById('decline-cookies');
        
        // Check if user has already made a choice
        if (!localStorage.getItem('cookieConsent') && cookieConsent) {
            setTimeout(() => {
                cookieConsent.style.display = 'block';
            }, 2000);
        }
        
        if (acceptCookies) {
            acceptCookies.addEventListener('click', function() {
                localStorage.setItem('cookieConsent', 'accepted');
                cookieConsent.style.display = 'none';
                
                // Enable analytics or other tracking here
                if (typeof gtag !== 'undefined') {
                    gtag('consent', 'update', {
                        'analytics_storage': 'granted'
                    });
                }
            });
        }
        
        if (declineCookies) {
            declineCookies.addEventListener('click', function() {
                localStorage.setItem('cookieConsent', 'declined');
                cookieConsent.style.display = 'none';
            });
        }
        
        // Form Validation Enhancement
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', function(e) {
                const requiredFields = form.querySelectorAll('[required]');
                let isValid = true;
                
                requiredFields.forEach(field => {
                    if (!field.value.trim()) {
                        isValid = false;
                        field.style.borderColor = '#ff4444';
                        field.addEventListener('input', function() {
                            this.style.borderColor = '';
                        }, { once: true });
                    }
                });
                
                if (!isValid) {
                    e.preventDefault();
                    alert('Please fill in all required fields.');
                }
            });
        });
        
        // Loading Overlay for Form Submissions
        const loadingOverlay = document.getElementById('loading-overlay');
        const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
        
        submitButtons.forEach(button => {
            button.addEventListener('click', function() {
                if (loadingOverlay) {
                    setTimeout(() => {
                        loadingOverlay.style.display = 'flex';
                    }, 100);
                }
            });
        });
        
        // Hide loading overlay after page load
        window.addEventListener('load', function() {
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        });
        
        // Intersection Observer for Animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        // Observe elements for animation
        const animatedElements = document.querySelectorAll('.service-card, .contact-item, .about-content');
        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
        
        // Dynamic Year Update
        const yearElements = document.querySelectorAll('.current-year');
        yearElements.forEach(el => {
            el.textContent = new Date().getFullYear();
        });
        
        // External Link Handling
        const externalLinks = document.querySelectorAll('a[href^="http"]:not([href*="' + window.location.hostname + '"])');
        externalLinks.forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
        
        // Performance Monitoring
        if ('performance' in window) {
            window.addEventListener('load', function() {
                setTimeout(function() {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    if (perfData && perfData.loadEventEnd > 3000) {
                        console.warn('Page load time is slow:', perfData.loadEventEnd + 'ms');
                    }
                }, 0);
            });
        }
    });
    
    // Global utility functions
    window.AIAgency = {
        showLoading: function() {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.style.display = 'flex';
        },
        
        hideLoading: function() {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.style.display = 'none';
        },
        
        showNotification: function(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <div class="notification-content">
                    <span>${message}</span>
                    <button class="notification-close">&times;</button>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => {
                notification.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            });
            
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        document.body.removeChild(notification);
                    }, 300);
                }
            }, 5000);
        }
    };
    </script>

    <!-- Additional Styles for Footer Components -->
    <style>
    /* Back to Top Button */
    .back-to-top {
        position: fixed;
        bottom: 100px;
        right: 30px;
        z-index: 998;
        background: var(--gradient-gold);
        color: var(--primary-dark-blue);
        border: none;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        cursor: pointer;
        transition: var(--transition-medium);
        box-shadow: var(--shadow-gold);
        font-size: 1.2rem;
    }
    
    .back-to-top:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(212, 175, 55, 0.4);
    }
    
    /* Loading Overlay */
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(10, 22, 40, 0.9);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .loading-spinner {
        text-align: center;
        color: var(--white);
    }
    
    .spinner {
        width: 50px;
        height: 50px;
        border: 3px solid rgba(212, 175, 55, 0.3);
        border-top: 3px solid var(--accent-gold);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    /* Cookie Consent */
    .cookie-consent {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 1001;
        background: rgba(10, 22, 40, 0.98);
        border-top: 2px solid var(--accent-gold);
        padding: 1rem;
        backdrop-filter: blur(10px);
    }
    
    .cookie-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 1rem;
    }
    
    .cookie-content p {
        color: var(--light-gray);
        margin: 0;
        flex: 1;
        min-width: 300px;
    }
    
    .cookie-buttons {
        display: flex;
        gap: 1rem;
        align-items: center;
    }
    
    .cookie-buttons .btn-primary,
    .cookie-buttons .btn-secondary {
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
        white-space: nowrap;
    }
    
    .cookie-link {
        color: var(--accent-gold);
        text-decoration: underline;
        font-size: 0.9rem;
    }
    
    /* Notifications */
    .notification {
        position: fixed;
        top: 100px;
        right: 30px;
        z-index: 1002;
        max-width: 400px;
        background: rgba(42, 52, 65, 0.95);
        border-radius: 10px;
        border-left: 4px solid var(--accent-gold);
        box-shadow: var(--shadow-heavy);
        transform: translateX(100%);
        transition: var(--transition-medium);
        backdrop-filter: blur(10px);
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification-content {
        padding: 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--white);
    }
    
    .notification-close {
        background: none;
        border: none;
        color: var(--accent-gold);
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: 1rem;
    }
    
    .notification-info {
        border-left-color: var(--accent-gold);
    }
    
    .notification-success {
        border-left-color: #28a745;
    }
    
    .notification-warning {
        border-left-color: #ffc107;
    }
    
    .notification-error {
        border-left-color: #dc3545;
    }
    
    /* Mobile Responsive Adjustments */
    @media (max-width: 768px) {
        .back-to-top {
            bottom: 120px;
            right: 20px;
            width: 45px;
            height: 45px;
        }
        
        .cookie-content {
            flex-direction: column;
            text-align: center;
        }
        
        .cookie-buttons {
            justify-content: center;
        }
        
        .notification {
            right: 20px;
            left: 20px;
            max-width: none;
        }
    }
    </style>

    <!-- Google Analytics (if enabled) -->
    <?php if (get_option('google_analytics_id', '')): ?>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=<?php echo get_option('google_analytics_id'); ?>"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        
        // Initialize with denied consent
        gtag('consent', 'default', {
            'analytics_storage': 'denied'
        });
        
        gtag('config', '<?php echo get_option('google_analytics_id'); ?>');
        
        // Grant consent if user has accepted cookies
        if (localStorage.getItem('cookieConsent') === 'accepted') {
            gtag('consent', 'update', {
                'analytics_storage': 'granted'
            });
        }
    </script>
    <?php endif; ?>

    <!-- Facebook Pixel (if enabled) -->
    <?php if (get_option('facebook_pixel_id', '')): ?>
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    fbq('init', '<?php echo get_option('facebook_pixel_id'); ?>');
    fbq('track', 'PageView');
    </script>
    <noscript>
        <img height="1" width="1" style="display:none" 
             src="https://www.facebook.com/tr?id=<?php echo get_option('facebook_pixel_id'); ?>&ev=PageView&noscript=1"/>
    </noscript>
    <?php endif; ?>

    <?php wp_footer(); ?>
</body>
</html>

