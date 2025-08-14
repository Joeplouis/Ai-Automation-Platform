// VPS Integration Configuration
// Connect AI Automation Platform with existing BookAI Studio infrastructure

export const VPS_CONFIG = {
  // Main VPS Details
  vps: {
    ip: '168.231.74.188',
    mainDomain: 'bookaistudio.com',
    sshPort: 22
  },

  // Domain Configuration
  domains: {
    main: 'bookaistudio.com',
    chat: 'chat.bookaistudio.com',
    wordpress: 'wrp.bookaistudio.com',
    postiz: 'postiz.bookaistudio.com',
    email: 'mail.bookaistudio.com',
    n8n: 'n8n.bookaistudio.com'
  },

  // Service Endpoints
  services: {
    // Web Services
    nginx: {
      http: 'http://168.231.74.188:80',
      https: 'https://168.231.74.188:443'
    },
    
    // AI Services
    ollama: {
      main: 'http://168.231.74.188:11434',
      proxy: 'http://168.231.74.188:11435',
      models: ['llama3.1:8b', 'codellama', 'mistral']
    },

    // Automation Services
    n8n: {
      main: 'http://168.231.74.188:5678',
      domain: 'https://n8n.bookaistudio.com',
      mcp: 'http://168.231.74.188:3000'
    },

    // Platform Management
    platform: {
      mcp: 'http://168.231.74.188:8002',
      wordpress_mcp: 'http://168.231.74.188:8003',
      agency: 'http://168.231.74.188:8080'
    },

    // Monitoring
    monitoring: {
      streamlit: 'http://168.231.74.188:8501',
      internal: 'http://168.231.74.188:3001'
    },

    // Social Media
    postiz: {
      domain: 'https://postiz.bookaistudio.com',
      api: 'https://postiz.bookaistudio.com/api'
    },

    // WordPress
    wordpress: {
      domain: 'https://wrp.bookaistudio.com',
      api: 'https://wrp.bookaistudio.com/wp-json/wp/v2',
      multisite: true
    },

    // Email Services
    email: {
      domain: 'https://mail.bookaistudio.com',
      smtp: 'mail.bookaistudio.com:587',
      imap: 'mail.bookaistudio.com:993'
    },

    // Chat Interface
    chat: {
      domain: 'https://chat.bookaistudio.com',
      websocket: 'wss://chat.bookaistudio.com/ws'
    }
  },

  // Database Configuration
  databases: {
    mysql: {
      host: 'localhost',
      port: 3306,
      database: 'bookai_analytics'
    },
    postgresql: {
      host: 'localhost',
      port: 5432,
      database: 'bookai_workflows'
    },
    redis: {
      host: 'localhost',
      port: 6379,
      database: 0
    }
  },

  // API Integration Points
  integrations: {
    // N8N Workflow Integration
    n8n: {
      webhookBase: 'https://n8n.bookaistudio.com/webhook',
      apiBase: 'https://n8n.bookaistudio.com/api/v1',
      credentials: {
        endpoint: '/credentials',
        workflows: '/workflows',
        executions: '/executions'
      }
    },

    // WordPress Integration
    wordpress: {
      restApi: 'https://wrp.bookaistudio.com/wp-json/wp/v2',
      customApi: 'https://wrp.bookaistudio.com/wp-json/bookai/v1',
      endpoints: {
        sites: '/sites',
        posts: '/posts',
        media: '/media',
        users: '/users'
      }
    },

    // Postiz Integration
    postiz: {
      apiBase: 'https://postiz.bookaistudio.com/api',
      endpoints: {
        posts: '/posts',
        accounts: '/accounts',
        analytics: '/analytics',
        schedule: '/schedule'
      }
    },

    // Email Integration
    email: {
      apiBase: 'https://mail.bookaistudio.com/api',
      endpoints: {
        send: '/send',
        campaigns: '/campaigns',
        lists: '/lists',
        analytics: '/analytics'
      }
    },

    // Ollama Integration
    ollama: {
      apiBase: 'http://168.231.74.188:11434/api',
      endpoints: {
        generate: '/generate',
        chat: '/chat',
        models: '/tags',
        pull: '/pull'
      }
    }
  },

  // MCP Server Configuration
  mcp: {
    platform: {
      url: 'http://168.231.74.188:8002',
      tools: [
        'vps_manage_services',
        'vps_monitor_resources',
        'vps_deploy_application',
        'vps_backup_data'
      ]
    },
    wordpress: {
      url: 'http://168.231.74.188:8003',
      tools: [
        'wp_create_site',
        'wp_manage_content',
        'wp_install_plugins',
        'wp_manage_users'
      ]
    },
    n8n: {
      url: 'http://168.231.74.188:3000',
      tools: [
        'n8n_create_workflow',
        'n8n_execute_workflow',
        'n8n_manage_credentials',
        'n8n_monitor_executions'
      ]
    }
  },

  // Revenue Tracking Configuration
  revenue: {
    sources: [
      'affiliate_commissions',
      'course_sales',
      'book_sales',
      'video_monetization',
      'subscription_revenue',
      'consulting_fees'
    ],
    platforms: [
      'tiktok',
      'instagram',
      'youtube',
      'facebook',
      'reddit',
      'linkedin',
      'twitter'
    ]
  },

  // Content Creation Pipeline
  content: {
    sources: ['tiktok_trending', 'youtube_viral', 'instagram_popular'],
    platforms: ['tiktok', 'instagram', 'youtube', 'facebook', 'reddit', 'linkedin'],
    types: ['video', 'image', 'text', 'carousel', 'story'],
    niches: ['ai', 'business', 'marketing', 'technology', 'finance', 'health']
  },

  // Affiliate Marketing Configuration
  affiliate: {
    networks: [
      'amazon_associates',
      'clickbank',
      'commission_junction',
      'shareasale',
      'impact',
      'partnerstack'
    ],
    tracking: {
      clicks: true,
      conversions: true,
      revenue: true,
      roi: true
    }
  },

  // Monitoring & Analytics
  monitoring: {
    metrics: [
      'revenue_per_minute',
      'content_creation_rate',
      'engagement_rates',
      'conversion_rates',
      'cost_per_acquisition',
      'lifetime_value'
    ],
    alerts: {
      revenue_drop: 10, // 10% drop triggers alert
      error_rate: 5,    // 5% error rate triggers alert
      cost_spike: 20    // 20% cost increase triggers alert
    }
  }
};

// Service Health Check Configuration
export const HEALTH_CHECKS = {
  services: [
    {
      name: 'Ollama AI',
      url: 'http://168.231.74.188:11434/api/tags',
      method: 'GET',
      timeout: 5000,
      critical: true
    },
    {
      name: 'N8N Automation',
      url: 'http://168.231.74.188:5678/healthz',
      method: 'GET',
      timeout: 5000,
      critical: true
    },
    {
      name: 'Platform MCP',
      url: 'http://168.231.74.188:8002/health',
      method: 'GET',
      timeout: 3000,
      critical: true
    },
    {
      name: 'WordPress MCP',
      url: 'http://168.231.74.188:8003/health',
      method: 'GET',
      timeout: 3000,
      critical: false
    },
    {
      name: 'Streamlit Monitor',
      url: 'http://168.231.74.188:8501',
      method: 'GET',
      timeout: 3000,
      critical: false
    },
    {
      name: 'WordPress Multisite',
      url: 'https://wrp.bookaistudio.com/wp-json/wp/v2',
      method: 'GET',
      timeout: 5000,
      critical: true
    },
    {
      name: 'Postiz Social',
      url: 'https://postiz.bookaistudio.com/api/health',
      method: 'GET',
      timeout: 5000,
      critical: true
    },
    {
      name: 'Email Server',
      url: 'https://mail.bookaistudio.com/api/health',
      method: 'GET',
      timeout: 5000,
      critical: true
    },
    {
      name: 'Chat Interface',
      url: 'https://chat.bookaistudio.com/health',
      method: 'GET',
      timeout: 3000,
      critical: false
    }
  ],
  interval: 30000, // Check every 30 seconds
  retries: 3,
  alertOnFailure: true
};

// Database Connection Strings
export const DATABASE_URLS = {
  mysql: `mysql://root:${process.env.MYSQL_PASSWORD}@localhost:3306/bookai_analytics`,
  postgresql: `postgresql://postgres:${process.env.POSTGRES_PASSWORD}@localhost:5432/bookai_workflows`,
  redis: `redis://localhost:6379/0`
};

// API Authentication Configuration
export const API_AUTH = {
  n8n: {
    type: 'api_key',
    header: 'X-N8N-API-KEY',
    key: process.env.N8N_API_KEY
  },
  wordpress: {
    type: 'jwt',
    endpoint: 'https://wrp.bookaistudio.com/wp-json/jwt-auth/v1/token',
    username: process.env.WP_USERNAME,
    password: process.env.WP_PASSWORD
  },
  postiz: {
    type: 'bearer',
    token: process.env.POSTIZ_API_TOKEN
  },
  email: {
    type: 'api_key',
    key: process.env.EMAIL_API_KEY
  },
  ollama: {
    type: 'none' // Local service, no auth needed
  }
};

// Workflow Templates for Integration
export const WORKFLOW_TEMPLATES = {
  content_creation: {
    name: 'Viral Content Creation Pipeline',
    description: 'Find trending content, recreate with AI, post across all platforms',
    steps: [
      'search_trending_content',
      'analyze_engagement_metrics',
      'generate_new_script',
      'create_video_content',
      'optimize_for_platforms',
      'schedule_posts',
      'track_performance'
    ]
  },
  affiliate_marketing: {
    name: 'Affiliate Product Promotion',
    description: 'Research high-converting products, create marketing content, track ROI',
    steps: [
      'research_affiliate_products',
      'analyze_competition',
      'create_landing_pages',
      'generate_marketing_videos',
      'setup_tracking_links',
      'launch_campaigns',
      'monitor_conversions'
    ]
  },
  email_campaigns: {
    name: 'Automated Email Marketing',
    description: 'Create and send targeted email campaigns with AI-generated content',
    steps: [
      'segment_audience',
      'generate_email_content',
      'design_email_templates',
      'schedule_campaigns',
      'track_open_rates',
      'optimize_performance'
    ]
  }
};

export default VPS_CONFIG;

