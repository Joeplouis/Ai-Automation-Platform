// BookAI Studio Integration Connector
// Seamless integration with existing VPS infrastructure

import axios from 'axios';
import { VPS_CONFIG, API_AUTH, HEALTH_CHECKS } from '../config/vps-integration.js';

export class BookAIStudioConnector {
  constructor() {
    this.config = VPS_CONFIG;
    this.healthStatus = new Map();
    this.lastHealthCheck = null;
    
    // Initialize service connections
    this.initializeConnections();
    
    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Initialize connections to all VPS services
   */
  async initializeConnections() {
    try {
      console.log('🚀 Initializing BookAI Studio connections...');
      
      // Test Ollama AI connection
      await this.testOllamaConnection();
      
      // Test N8N connection
      await this.testN8NConnection();
      
      // Test WordPress connection
      await this.testWordPressConnection();
      
      // Test Postiz connection
      await this.testPostizConnection();
      
      // Test Email server connection
      await this.testEmailConnection();
      
      console.log('✅ All BookAI Studio services connected successfully!');
      
    } catch (error) {
      console.error('❌ Error initializing connections:', error);
      throw error;
    }
  }

  /**
   * Test Ollama AI connection and available models
   */
  async testOllamaConnection() {
    try {
      const response = await axios.get(`${this.config.services.ollama.main}/api/tags`, {
        timeout: 5000
      });
      
      const models = response.data.models || [];
      console.log(`✅ Ollama AI connected - ${models.length} models available:`, 
        models.map(m => m.name).join(', '));
      
      this.healthStatus.set('ollama', { status: 'healthy', models: models });
      return models;
      
    } catch (error) {
      console.error('❌ Ollama connection failed:', error.message);
      this.healthStatus.set('ollama', { status: 'unhealthy', error: error.message });
      throw error;
    }
  }

  /**
   * Test N8N automation platform connection
   */
  async testN8NConnection() {
    try {
      // Test main N8N service
      const response = await axios.get(`${this.config.services.n8n.main}/healthz`, {
        timeout: 5000
      });
      
      console.log('✅ N8N Automation platform connected');
      this.healthStatus.set('n8n', { status: 'healthy' });
      
      // Test domain access
      try {
        await axios.get(`${this.config.domains.n8n}`, { timeout: 3000 });
        console.log(`✅ N8N domain accessible: ${this.config.domains.n8n}`);
      } catch (domainError) {
        console.warn(`⚠️ N8N domain not accessible: ${this.config.domains.n8n}`);
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ N8N connection failed:', error.message);
      this.healthStatus.set('n8n', { status: 'unhealthy', error: error.message });
      throw error;
    }
  }

  /**
   * Test WordPress multisite connection
   */
  async testWordPressConnection() {
    try {
      const response = await axios.get(`${this.config.services.wordpress.api}`, {
        timeout: 5000
      });
      
      console.log('✅ WordPress multisite connected');
      this.healthStatus.set('wordpress', { status: 'healthy' });
      
      // Test MCP server
      try {
        await axios.get(`${this.config.services.platform.wordpress_mcp}/health`, {
          timeout: 3000
        });
        console.log('✅ WordPress MCP server connected');
      } catch (mcpError) {
        console.warn('⚠️ WordPress MCP server not responding');
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ WordPress connection failed:', error.message);
      this.healthStatus.set('wordpress', { status: 'unhealthy', error: error.message });
      throw error;
    }
  }

  /**
   * Test Postiz social media automation connection
   */
  async testPostizConnection() {
    try {
      const response = await axios.get(`${this.config.services.postiz.api}/health`, {
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accept 4xx as valid response
      });
      
      console.log('✅ Postiz social media automation connected');
      this.healthStatus.set('postiz', { status: 'healthy' });
      
      return true;
      
    } catch (error) {
      console.error('❌ Postiz connection failed:', error.message);
      this.healthStatus.set('postiz', { status: 'unhealthy', error: error.message });
      // Don't throw - Postiz might not have health endpoint
    }
  }

  /**
   * Test Email server connection
   */
  async testEmailConnection() {
    try {
      const response = await axios.get(`${this.config.services.email.domain}`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      console.log('✅ Email server connected');
      this.healthStatus.set('email', { status: 'healthy' });
      
      return true;
      
    } catch (error) {
      console.error('❌ Email server connection failed:', error.message);
      this.healthStatus.set('email', { status: 'unhealthy', error: error.message });
      // Don't throw - Email server might not have API endpoint
    }
  }

  /**
   * Start continuous health monitoring
   */
  startHealthMonitoring() {
    setInterval(async () => {
      await this.performHealthChecks();
    }, HEALTH_CHECKS.interval);
    
    console.log(`🔍 Health monitoring started - checking every ${HEALTH_CHECKS.interval/1000}s`);
  }

  /**
   * Perform health checks on all services
   */
  async performHealthChecks() {
    const results = [];
    
    for (const service of HEALTH_CHECKS.services) {
      try {
        const startTime = Date.now();
        
        await axios({
          method: service.method,
          url: service.url,
          timeout: service.timeout,
          validateStatus: (status) => status < 500
        });
        
        const responseTime = Date.now() - startTime;
        
        results.push({
          name: service.name,
          status: 'healthy',
          responseTime: responseTime,
          critical: service.critical
        });
        
      } catch (error) {
        results.push({
          name: service.name,
          status: 'unhealthy',
          error: error.message,
          critical: service.critical
        });
        
        if (service.critical) {
          console.error(`🚨 Critical service down: ${service.name} - ${error.message}`);
        }
      }
    }
    
    this.lastHealthCheck = {
      timestamp: new Date(),
      results: results,
      healthyServices: results.filter(r => r.status === 'healthy').length,
      totalServices: results.length
    };
    
    // Log summary
    const healthy = results.filter(r => r.status === 'healthy').length;
    const total = results.length;
    console.log(`💚 Health Check: ${healthy}/${total} services healthy`);
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    return {
      lastCheck: this.lastHealthCheck,
      serviceStatus: Object.fromEntries(this.healthStatus),
      overallHealth: this.calculateOverallHealth()
    };
  }

  /**
   * Calculate overall system health percentage
   */
  calculateOverallHealth() {
    if (!this.lastHealthCheck) return 0;
    
    const { healthyServices, totalServices } = this.lastHealthCheck;
    return Math.round((healthyServices / totalServices) * 100);
  }

  /**
   * Create content using the integrated pipeline
   */
  async createContent(contentRequest) {
    try {
      const {
        niche,
        platforms = ['tiktok', 'instagram', 'youtube'],
        contentType = 'video',
        targetAudience,
        affiliateProducts = []
      } = contentRequest;

      console.log(`🎬 Creating content for niche: ${niche}`);

      // Step 1: Research trending content
      const trendingContent = await this.researchTrendingContent(niche);

      // Step 2: Generate new script using Ollama
      const script = await this.generateContentScript(trendingContent, targetAudience);

      // Step 3: Create content for each platform
      const contentResults = [];
      
      for (const platform of platforms) {
        const platformContent = await this.createPlatformContent({
          script,
          platform,
          contentType,
          niche
        });
        
        contentResults.push(platformContent);
      }

      // Step 4: Schedule posts via Postiz
      const scheduledPosts = await this.scheduleContent(contentResults);

      // Step 5: Setup affiliate tracking
      if (affiliateProducts.length > 0) {
        await this.setupAffiliateTracking(contentResults, affiliateProducts);
      }

      // Step 6: Track in analytics
      await this.trackContentCreation({
        niche,
        platforms,
        contentCount: contentResults.length,
        affiliateProducts: affiliateProducts.length
      });

      return {
        success: true,
        contentCreated: contentResults.length,
        platforms: platforms,
        scheduledPosts: scheduledPosts,
        affiliateTracking: affiliateProducts.length > 0,
        estimatedReach: this.calculateEstimatedReach(contentResults)
      };

    } catch (error) {
      console.error('❌ Content creation failed:', error);
      throw error;
    }
  }

  /**
   * Research trending content in a specific niche
   */
  async researchTrendingContent(niche) {
    try {
      // Use N8N workflow to research trending content
      const workflowResponse = await axios.post(
        `${this.config.services.n8n.main}/webhook/research-trending`,
        {
          niche: niche,
          platforms: ['tiktok', 'youtube', 'instagram'],
          timeframe: '24h',
          minViews: 100000
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return workflowResponse.data;

    } catch (error) {
      console.error('❌ Trending content research failed:', error);
      // Fallback to manual research
      return {
        trending: [
          {
            title: `Top ${niche} trends`,
            views: 500000,
            engagement: 8.5,
            platform: 'tiktok'
          }
        ]
      };
    }
  }

  /**
   * Generate content script using Ollama AI
   */
  async generateContentScript(trendingContent, targetAudience) {
    try {
      const prompt = `
        Create a viral content script based on this trending content:
        ${JSON.stringify(trendingContent, null, 2)}
        
        Target audience: ${targetAudience}
        
        Requirements:
        - Hook viewers in first 3 seconds
        - Include trending elements but make it original
        - Add call-to-action for engagement
        - Keep it under 60 seconds for TikTok/Instagram
        - Make it educational and entertaining
        
        Return only the script content.
      `;

      const response = await axios.post(
        `${this.config.services.ollama.main}/api/generate`,
        {
          model: 'llama3.1:8b',
          prompt: prompt,
          stream: false
        }
      );

      return response.data.response;

    } catch (error) {
      console.error('❌ Script generation failed:', error);
      throw error;
    }
  }

  /**
   * Create platform-specific content
   */
  async createPlatformContent({ script, platform, contentType, niche }) {
    try {
      // Use N8N workflow to create platform-specific content
      const workflowResponse = await axios.post(
        `${this.config.services.n8n.main}/webhook/create-content`,
        {
          script: script,
          platform: platform,
          contentType: contentType,
          niche: niche,
          optimization: {
            aspectRatio: platform === 'youtube' ? '16:9' : '9:16',
            duration: platform === 'youtube' ? 120 : 60,
            hashtags: true,
            captions: true
          }
        }
      );

      return {
        platform: platform,
        contentId: workflowResponse.data.contentId,
        url: workflowResponse.data.url,
        metadata: workflowResponse.data.metadata
      };

    } catch (error) {
      console.error(`❌ ${platform} content creation failed:`, error);
      throw error;
    }
  }

  /**
   * Schedule content across platforms using Postiz
   */
  async scheduleContent(contentResults) {
    try {
      const scheduledPosts = [];

      for (const content of contentResults) {
        const scheduleResponse = await axios.post(
          `${this.config.services.postiz.api}/schedule`,
          {
            platform: content.platform,
            contentUrl: content.url,
            caption: content.metadata.caption,
            hashtags: content.metadata.hashtags,
            scheduleTime: this.calculateOptimalPostTime(content.platform)
          },
          {
            headers: {
              'Authorization': `Bearer ${API_AUTH.postiz.token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        scheduledPosts.push({
          platform: content.platform,
          postId: scheduleResponse.data.postId,
          scheduledTime: scheduleResponse.data.scheduledTime
        });
      }

      return scheduledPosts;

    } catch (error) {
      console.error('❌ Content scheduling failed:', error);
      throw error;
    }
  }

  /**
   * Setup affiliate product tracking
   */
  async setupAffiliateTracking(contentResults, affiliateProducts) {
    try {
      for (const content of contentResults) {
        for (const product of affiliateProducts) {
          // Create tracking links and associate with content
          await axios.post(
            `${this.config.services.platform.mcp}/affiliate/track`,
            {
              contentId: content.contentId,
              platform: content.platform,
              productId: product.id,
              affiliateNetwork: product.network,
              commissionRate: product.commission
            }
          );
        }
      }

      console.log(`✅ Affiliate tracking setup for ${affiliateProducts.length} products`);

    } catch (error) {
      console.error('❌ Affiliate tracking setup failed:', error);
      throw error;
    }
  }

  /**
   * Track content creation in analytics
   */
  async trackContentCreation(data) {
    try {
      await axios.post(
        `${this.config.services.monitoring.streamlit}/api/track`,
        {
          event: 'content_created',
          timestamp: new Date().toISOString(),
          data: data
        }
      );

      console.log('✅ Content creation tracked in analytics');

    } catch (error) {
      console.error('❌ Analytics tracking failed:', error);
      // Don't throw - analytics failure shouldn't stop content creation
    }
  }

  /**
   * Calculate optimal posting time for platform
   */
  calculateOptimalPostTime(platform) {
    const now = new Date();
    const optimal = {
      tiktok: { hour: 18, minute: 0 }, // 6 PM
      instagram: { hour: 19, minute: 0 }, // 7 PM
      youtube: { hour: 20, minute: 0 }, // 8 PM
      facebook: { hour: 15, minute: 0 }, // 3 PM
      linkedin: { hour: 12, minute: 0 }, // 12 PM
      reddit: { hour: 10, minute: 0 } // 10 AM
    };

    const platformTime = optimal[platform] || optimal.tiktok;
    const scheduleTime = new Date(now);
    scheduleTime.setHours(platformTime.hour, platformTime.minute, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (scheduleTime <= now) {
      scheduleTime.setDate(scheduleTime.getDate() + 1);
    }

    return scheduleTime.toISOString();
  }

  /**
   * Calculate estimated reach for content
   */
  calculateEstimatedReach(contentResults) {
    const platformReach = {
      tiktok: 50000,
      instagram: 30000,
      youtube: 100000,
      facebook: 25000,
      linkedin: 15000,
      reddit: 20000
    };

    return contentResults.reduce((total, content) => {
      return total + (platformReach[content.platform] || 10000);
    }, 0);
  }

  /**
   * Get real-time revenue metrics
   */
  async getRevenueMetrics(timeRange = '24h') {
    try {
      const response = await axios.get(
        `${this.config.services.monitoring.streamlit}/api/revenue`,
        {
          params: { timeRange }
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Failed to get revenue metrics:', error);
      return {
        totalRevenue: 0,
        affiliateRevenue: 0,
        contentRevenue: 0,
        costs: 0,
        profit: 0,
        roi: 0
      };
    }
  }

  /**
   * Execute custom N8N workflow
   */
  async executeWorkflow(workflowName, data) {
    try {
      const response = await axios.post(
        `${this.config.services.n8n.main}/webhook/${workflowName}`,
        data,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;

    } catch (error) {
      console.error(`❌ Workflow execution failed: ${workflowName}`, error);
      throw error;
    }
  }
}

export default BookAIStudioConnector;

