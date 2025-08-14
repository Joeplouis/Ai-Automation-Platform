<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="<?php echo get_option('site_description', 'Expert AI consulting and automation solutions for small businesses. 20+ years of software engineering experience.'); ?>">
    <meta name="keywords" content="AI consulting, business automation, ChatGPT training, custom AI solutions, N8N workflows, CRM integration">
    <meta name="author" content="BookAI Studio">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="<?php wp_title('|', true, 'right'); ?>">
    <meta property="og:description" content="<?php echo get_option('site_description', 'Expert AI consulting and automation solutions for small businesses.'); ?>">
    <meta property="og:type" content="website">
    <meta property="og:url" content="<?php echo home_url(); ?>">
    <meta property="og:image" content="<?php echo get_template_directory_uri(); ?>/assets/images/og-image.jpg">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?php wp_title('|', true, 'right'); ?>">
    <meta name="twitter:description" content="<?php echo get_option('site_description', 'Expert AI consulting and automation solutions for small businesses.'); ?>">
    <meta name="twitter:image" content="<?php echo get_template_directory_uri(); ?>/assets/images/og-image.jpg">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="<?php echo get_template_directory_uri(); ?>/assets/images/favicon.ico">
    <link rel="apple-touch-icon" href="<?php echo get_template_directory_uri(); ?>/assets/images/apple-touch-icon.png">
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    
    <!-- Font Awesome for Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Theme Styles -->
    <link rel="stylesheet" href="<?php echo get_stylesheet_uri(); ?>">
    
    <!-- Custom CSS from Admin -->
    <style>
        <?php echo get_option('custom_css', ''); ?>
    </style>
    
    <?php wp_head(); ?>
    
    <!-- Schema.org Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "name": "BookAI Studio",
        "description": "Expert AI consulting and automation solutions for small businesses",
        "url": "<?php echo home_url(); ?>",
        "telephone": "<?php echo get_option('contact_phone', '+1-555-123-4567'); ?>",
        "email": "<?php echo get_option('contact_email', 'info@bookaistudio.com'); ?>",
        "address": {
            "@type": "PostalAddress",
            "addressCountry": "US"
        },
        "serviceType": [
            "AI Consulting",
            "Business Automation",
            "ChatGPT Training",
            "Custom AI Solutions",
            "CRM Integration"
        ],
        "priceRange": "$350-$$$",
        "founder": {
            "@type": "Person",
            "name": "BookAI Studio Founder",
            "description": "Software engineer with 20+ years of experience and 2+ years of AI expertise"
        }
    }
    </script>
</head>

<body <?php body_class(); ?>>
    <?php wp_body_open(); ?>
    
    <!-- Fixed Header -->
    <header class="site-header">
        <div class="header-container">
            <!-- Logo -->
            <a href="<?php echo home_url(); ?>" class="site-logo">
                <?php 
                $custom_logo = get_option('site_logo', '');
                if (!empty($custom_logo)): ?>
                    <img src="<?php echo esc_url($custom_logo); ?>" alt="<?php bloginfo('name'); ?>" style="height: 40px;">
                <?php else: ?>
                    <?php echo get_option('site_title', 'BookAI Studio'); ?>
                <?php endif; ?>
            </a>
            
            <!-- Main Navigation -->
            <nav class="main-navigation">
                <ul>
                    <li><a href="#home" class="nav-link">Home</a></li>
                    <li><a href="#services" class="nav-link">Services</a></li>
                    <li><a href="#ai-demo" class="nav-link">AI Demo</a></li>
                    <li><a href="#about" class="nav-link">About</a></li>
                    <li><a href="#contact" class="nav-link">Contact</a></li>
                    <?php if (get_option('show_packages_menu', true)): ?>
                    <li><a href="#packages" class="nav-link">Packages</a></li>
                    <?php endif; ?>
                </ul>
            </nav>
            
            <!-- CTA Button -->
            <a href="#contact" class="cta-button">
                Book Free Consultation
            </a>
            
            <!-- Mobile Menu Toggle -->
            <button class="mobile-menu-toggle" id="mobile-menu-toggle" style="display: none;">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </header>
    
    <!-- Mobile Navigation Overlay -->
    <div class="mobile-nav-overlay" id="mobile-nav-overlay" style="display: none;">
        <div class="mobile-nav-content">
            <button class="mobile-nav-close" id="mobile-nav-close">&times;</button>
            <nav class="mobile-navigation">
                <ul>
                    <li><a href="#home" class="mobile-nav-link">Home</a></li>
                    <li><a href="#services" class="mobile-nav-link">Services</a></li>
                    <li><a href="#ai-demo" class="mobile-nav-link">AI Demo</a></li>
                    <li><a href="#about" class="mobile-nav-link">About</a></li>
                    <li><a href="#contact" class="mobile-nav-link">Contact</a></li>
                    <?php if (get_option('show_packages_menu', true)): ?>
                    <li><a href="#packages" class="mobile-nav-link">Packages</a></li>
                    <?php endif; ?>
                </ul>
                <div class="mobile-nav-cta">
                    <a href="#contact" class="btn-primary">Book Free Consultation</a>
                </div>
            </nav>
        </div>
    </div>

    <style>
    /* Mobile Navigation Styles */
    @media (max-width: 768px) {
        .main-navigation {
            display: none;
        }
        
        .mobile-menu-toggle {
            display: flex !important;
            flex-direction: column;
            justify-content: space-around;
            width: 30px;
            height: 30px;
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 0;
        }
        
        .mobile-menu-toggle span {
            width: 100%;
            height: 3px;
            background: var(--accent-gold);
            border-radius: 2px;
            transition: var(--transition-fast);
        }
        
        .mobile-menu-toggle.active span:nth-child(1) {
            transform: rotate(45deg) translate(8px, 8px);
        }
        
        .mobile-menu-toggle.active span:nth-child(2) {
            opacity: 0;
        }
        
        .mobile-menu-toggle.active span:nth-child(3) {
            transform: rotate(-45deg) translate(8px, -8px);
        }
        
        .mobile-nav-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(10, 22, 40, 0.98);
            backdrop-filter: blur(10px);
            z-index: 9999;
            opacity: 0;
            visibility: hidden;
            transition: var(--transition-medium);
        }
        
        .mobile-nav-overlay.active {
            opacity: 1;
            visibility: visible;
        }
        
        .mobile-nav-content {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100%;
            padding: 2rem;
            position: relative;
        }
        
        .mobile-nav-close {
            position: absolute;
            top: 2rem;
            right: 2rem;
            background: transparent;
            border: none;
            color: var(--accent-gold);
            font-size: 2rem;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .mobile-navigation ul {
            list-style: none;
            text-align: center;
            margin-bottom: 2rem;
        }
        
        .mobile-navigation li {
            margin-bottom: 1.5rem;
        }
        
        .mobile-nav-link {
            color: var(--white);
            font-size: 1.5rem;
            font-weight: 500;
            text-decoration: none;
            transition: var(--transition-fast);
        }
        
        .mobile-nav-link:hover {
            color: var(--accent-gold);
        }
        
        .mobile-nav-cta {
            margin-top: 2rem;
        }
    }
    </style>

    <script>
    // Mobile Navigation Toggle
    document.addEventListener('DOMContentLoaded', function() {
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const mobileOverlay = document.getElementById('mobile-nav-overlay');
        const mobileClose = document.getElementById('mobile-nav-close');
        const mobileLinks = document.querySelectorAll('.mobile-nav-link');
        
        if (mobileToggle && mobileOverlay) {
            mobileToggle.addEventListener('click', function() {
                mobileToggle.classList.toggle('active');
                mobileOverlay.classList.toggle('active');
                document.body.style.overflow = mobileOverlay.classList.contains('active') ? 'hidden' : '';
            });
            
            mobileClose.addEventListener('click', function() {
                mobileToggle.classList.remove('active');
                mobileOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
            
            // Close mobile menu when clicking on links
            mobileLinks.forEach(link => {
                link.addEventListener('click', function() {
                    mobileToggle.classList.remove('active');
                    mobileOverlay.classList.remove('active');
                    document.body.style.overflow = '';
                });
            });
            
            // Close mobile menu when clicking outside
            mobileOverlay.addEventListener('click', function(e) {
                if (e.target === mobileOverlay) {
                    mobileToggle.classList.remove('active');
                    mobileOverlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
        
        // Active navigation highlighting
        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
        const sections = document.querySelectorAll('section[id]');
        
        function highlightActiveNav() {
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 100;
                const sectionHeight = section.offsetHeight;
                if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                    current = section.getAttribute('id');
                }
            });
            
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        }
        
        window.addEventListener('scroll', highlightActiveNav);
        highlightActiveNav(); // Initial call
    });
    </script>

