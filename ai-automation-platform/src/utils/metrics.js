// Metrics and monitoring utilities for AI Automation Platform

/**
 * Calculate the 95th percentile of an array of numbers
 * @param {number[]} values - Array of numeric values
 * @returns {number} - 95th percentile value
 */
export function calcP95(values) {
  if (!values || values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor(0.95 * (sorted.length - 1));
  return sorted[index] || 0;
}

/**
 * Calculate the 99th percentile of an array of numbers
 * @param {number[]} values - Array of numeric values
 * @returns {number} - 99th percentile value
 */
export function calcP99(values) {
  if (!values || values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor(0.99 * (sorted.length - 1));
  return sorted[index] || 0;
}

/**
 * Calculate basic statistics for an array of numbers
 * @param {number[]} values - Array of numeric values
 * @returns {Object} - Statistics object
 */
export function calculateStats(values) {
  if (!values || values.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p95: 0,
      p99: 0,
      sum: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];

  return {
    count: values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(mean * 100) / 100,
    median,
    p95: calcP95(values),
    p99: calcP99(values),
    sum
  };
}

/**
 * Create a metrics collector for various platform components
 * @param {Object} pool - PostgreSQL connection pool
 * @returns {Object} - Metrics collector object
 */
export function createMetricsCollector(pool) {
  return {
    /**
     * Get chat/AI usage metrics
     * @param {string} timeframe - '1h', '24h', '7d', '30d'
     * @returns {Object} - Chat metrics
     */
    async getChatMetrics(timeframe = '24h') {
      const intervals = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days'
      };

      const interval = intervals[timeframe] || '24 hours';

      try {
        const [totalResult, errorResult, latencyResult, providerResult, tokenResult] = await Promise.all([
          // Total requests
          pool.query(`
            SELECT COUNT(*)::int as count
            FROM chat_logs
            WHERE created_at > now() - interval '${interval}'
          `),
          
          // Error count
          pool.query(`
            SELECT COUNT(*)::int as count
            FROM chat_logs
            WHERE created_at > now() - interval '${interval}'
            AND ok = false
          `),
          
          // Latency data
          pool.query(`
            SELECT latency_ms
            FROM chat_logs
            WHERE created_at > now() - interval '${interval}'
            AND latency_ms IS NOT NULL
          `),
          
          // Per-provider stats
          pool.query(`
            SELECT 
              provider,
              COUNT(*)::int as requests,
              COUNT(*) FILTER (WHERE ok = false)::int as errors,
              AVG(latency_ms)::int as avg_latency
            FROM chat_logs
            WHERE created_at > now() - interval '${interval}'
            GROUP BY provider
            ORDER BY requests DESC
          `),
          
          // Token usage
          pool.query(`
            SELECT 
              SUM(input_tokens)::bigint as total_input_tokens,
              SUM(output_tokens)::bigint as total_output_tokens,
              SUM(total_tokens)::bigint as total_tokens,
              AVG(input_tokens)::int as avg_input_tokens,
              AVG(output_tokens)::int as avg_output_tokens
            FROM chat_logs
            WHERE created_at > now() - interval '${interval}'
            AND total_tokens IS NOT NULL
          `)
        ]);

        const latencies = latencyResult.rows.map(r => r.latency_ms);
        const latencyStats = calculateStats(latencies);

        return {
          timeframe,
          total_requests: totalResult.rows[0].count,
          error_count: errorResult.rows[0].count,
          error_rate: totalResult.rows[0].count > 0 
            ? Math.round((errorResult.rows[0].count / totalResult.rows[0].count) * 10000) / 100
            : 0,
          latency: latencyStats,
          providers: providerResult.rows,
          tokens: tokenResult.rows[0] || {
            total_input_tokens: 0,
            total_output_tokens: 0,
            total_tokens: 0,
            avg_input_tokens: 0,
            avg_output_tokens: 0
          }
        };
      } catch (error) {
        console.error('Error fetching chat metrics:', error);
        throw error;
      }
    },

    /**
     * Get task execution metrics
     * @param {string} timeframe - '1h', '24h', '7d', '30d'
     * @returns {Object} - Task metrics
     */
    async getTaskMetrics(timeframe = '24h') {
      const intervals = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days'
      };

      const interval = intervals[timeframe] || '24 hours';

      try {
        const [totalResult, statusResult, typeResult, durationResult] = await Promise.all([
          // Total executions
          pool.query(`
            SELECT COUNT(*)::int as count
            FROM task_executions
            WHERE created_at > now() - interval '${interval}'
          `),
          
          // By status
          pool.query(`
            SELECT 
              status,
              COUNT(*)::int as count
            FROM task_executions
            WHERE created_at > now() - interval '${interval}'
            GROUP BY status
            ORDER BY count DESC
          `),
          
          // By task type
          pool.query(`
            SELECT 
              t.type,
              COUNT(*)::int as executions,
              COUNT(*) FILTER (WHERE te.status = 'completed')::int as successful,
              COUNT(*) FILTER (WHERE te.status = 'failed')::int as failed
            FROM task_executions te
            JOIN tasks t ON te.task_id = t.id
            WHERE te.created_at > now() - interval '${interval}'
            GROUP BY t.type
            ORDER BY executions DESC
          `),
          
          // Execution duration stats
          pool.query(`
            SELECT 
              EXTRACT(EPOCH FROM (completed_at - started_at))::int as duration_seconds
            FROM task_executions
            WHERE created_at > now() - interval '${interval}'
            AND started_at IS NOT NULL
            AND completed_at IS NOT NULL
          `)
        ]);

        const durations = durationResult.rows.map(r => r.duration_seconds);
        const durationStats = calculateStats(durations);

        return {
          timeframe,
          total_executions: totalResult.rows[0].count,
          by_status: statusResult.rows,
          by_type: typeResult.rows,
          duration: durationStats
        };
      } catch (error) {
        console.error('Error fetching task metrics:', error);
        throw error;
      }
    },

    /**
     * Get VPS monitoring metrics
     * @param {string} timeframe - '1h', '24h', '7d', '30d'
     * @returns {Object} - VPS metrics
     */
    async getVPSMetrics(timeframe = '24h') {
      const intervals = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days'
      };

      const interval = intervals[timeframe] || '24 hours';

      try {
        const [serverResult, monitoringResult] = await Promise.all([
          // Server counts by status
          pool.query(`
            SELECT 
              status,
              COUNT(*)::int as count
            FROM vps_servers
            GROUP BY status
            ORDER BY count DESC
          `),
          
          // Average resource usage
          pool.query(`
            SELECT 
              vs.name as server_name,
              AVG(vm.cpu_usage)::decimal(5,2) as avg_cpu,
              AVG(vm.memory_usage)::decimal(5,2) as avg_memory,
              AVG(vm.disk_usage)::decimal(5,2) as avg_disk,
              MAX(vm.cpu_usage)::decimal(5,2) as max_cpu,
              MAX(vm.memory_usage)::decimal(5,2) as max_memory,
              MAX(vm.disk_usage)::decimal(5,2) as max_disk
            FROM vps_monitoring vm
            JOIN vps_servers vs ON vm.server_id = vs.id
            WHERE vm.recorded_at > now() - interval '${interval}'
            GROUP BY vs.id, vs.name
            ORDER BY avg_cpu DESC
          `)
        ]);

        return {
          timeframe,
          servers_by_status: serverResult.rows,
          resource_usage: monitoringResult.rows
        };
      } catch (error) {
        console.error('Error fetching VPS metrics:', error);
        throw error;
      }
    },

    /**
     * Get social media metrics
     * @param {string} timeframe - '1h', '24h', '7d', '30d'
     * @returns {Object} - Social media metrics
     */
    async getSocialMetrics(timeframe = '24h') {
      const intervals = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days'
      };

      const interval = intervals[timeframe] || '24 hours';

      try {
        const [postsResult, platformResult, engagementResult] = await Promise.all([
          // Posts by status
          pool.query(`
            SELECT 
              status,
              COUNT(*)::int as count
            FROM social_posts
            WHERE created_at > now() - interval '${interval}'
            GROUP BY status
            ORDER BY count DESC
          `),
          
          // Posts by platform
          pool.query(`
            SELECT 
              unnest(platforms) as platform,
              COUNT(*)::int as posts
            FROM social_posts
            WHERE created_at > now() - interval '${interval}'
            GROUP BY platform
            ORDER BY posts DESC
          `),
          
          // Engagement stats
          pool.query(`
            SELECT 
              AVG((engagement_data->>'likes')::int) as avg_likes,
              AVG((engagement_data->>'shares')::int) as avg_shares,
              AVG((engagement_data->>'comments')::int) as avg_comments,
              SUM((engagement_data->>'likes')::int) as total_likes,
              SUM((engagement_data->>'shares')::int) as total_shares,
              SUM((engagement_data->>'comments')::int) as total_comments
            FROM social_posts
            WHERE created_at > now() - interval '${interval}'
            AND engagement_data IS NOT NULL
          `)
        ]);

        return {
          timeframe,
          posts_by_status: postsResult.rows,
          posts_by_platform: platformResult.rows,
          engagement: engagementResult.rows[0] || {
            avg_likes: 0,
            avg_shares: 0,
            avg_comments: 0,
            total_likes: 0,
            total_shares: 0,
            total_comments: 0
          }
        };
      } catch (error) {
        console.error('Error fetching social metrics:', error);
        throw error;
      }
    },

    /**
     * Get affiliate marketing metrics
     * @param {string} timeframe - '1h', '24h', '7d', '30d'
     * @returns {Object} - Affiliate metrics
     */
    async getAffiliateMetrics(timeframe = '24h') {
      const intervals = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days'
      };

      const interval = intervals[timeframe] || '24 hours';

      try {
        const [campaignResult, networkResult, performanceResult] = await Promise.all([
          // Campaigns by status
          pool.query(`
            SELECT 
              status,
              COUNT(*)::int as count,
              SUM(revenue)::decimal(10,2) as total_revenue,
              SUM(spent)::decimal(10,2) as total_spent
            FROM affiliate_campaigns
            WHERE created_at > now() - interval '${interval}'
            GROUP BY status
            ORDER BY total_revenue DESC
          `),
          
          // Performance by network
          pool.query(`
            SELECT 
              an.name as network_name,
              COUNT(ac.id)::int as campaigns,
              SUM(ac.clicks)::int as total_clicks,
              SUM(ac.conversions)::int as total_conversions,
              SUM(ac.revenue)::decimal(10,2) as total_revenue,
              AVG(ac.conversions::decimal / NULLIF(ac.clicks, 0) * 100)::decimal(5,2) as avg_conversion_rate
            FROM affiliate_campaigns ac
            JOIN affiliate_products ap ON ac.product_id = ap.id
            JOIN affiliate_networks an ON ap.network_id = an.id
            WHERE ac.created_at > now() - interval '${interval}'
            GROUP BY an.id, an.name
            ORDER BY total_revenue DESC
          `),
          
          // Top performing products
          pool.query(`
            SELECT 
              ap.name as product_name,
              ap.category,
              COUNT(ac.id)::int as campaigns,
              SUM(ac.revenue)::decimal(10,2) as revenue,
              AVG(ac.conversions::decimal / NULLIF(ac.clicks, 0) * 100)::decimal(5,2) as conversion_rate
            FROM affiliate_campaigns ac
            JOIN affiliate_products ap ON ac.product_id = ap.id
            WHERE ac.created_at > now() - interval '${interval}'
            GROUP BY ap.id, ap.name, ap.category
            ORDER BY revenue DESC
            LIMIT 10
          `)
        ]);

        return {
          timeframe,
          campaigns_by_status: campaignResult.rows,
          performance_by_network: networkResult.rows,
          top_products: performanceResult.rows
        };
      } catch (error) {
        console.error('Error fetching affiliate metrics:', error);
        throw error;
      }
    },

    /**
     * Get comprehensive platform overview
     * @returns {Object} - Platform overview metrics
     */
    async getPlatformOverview() {
      try {
        const [chatMetrics, taskMetrics, vpsMetrics, socialMetrics, affiliateMetrics] = await Promise.all([
          this.getChatMetrics('24h'),
          this.getTaskMetrics('24h'),
          this.getVPSMetrics('24h'),
          this.getSocialMetrics('24h'),
          this.getAffiliateMetrics('24h')
        ]);

        return {
          timestamp: new Date().toISOString(),
          chat: {
            total_requests: chatMetrics.total_requests,
            error_rate: chatMetrics.error_rate,
            avg_latency: chatMetrics.latency.mean
          },
          tasks: {
            total_executions: taskMetrics.total_executions,
            success_rate: taskMetrics.by_status.find(s => s.status === 'completed')?.count || 0,
            avg_duration: taskMetrics.duration.mean
          },
          vps: {
            total_servers: vpsMetrics.servers_by_status.reduce((sum, s) => sum + s.count, 0),
            online_servers: vpsMetrics.servers_by_status.find(s => s.status === 'online')?.count || 0
          },
          social: {
            total_posts: socialMetrics.posts_by_status.reduce((sum, s) => sum + s.count, 0),
            published_posts: socialMetrics.posts_by_status.find(s => s.status === 'published')?.count || 0
          },
          affiliate: {
            active_campaigns: affiliateMetrics.campaigns_by_status.find(s => s.status === 'active')?.count || 0,
            total_revenue: affiliateMetrics.campaigns_by_status.reduce((sum, s) => sum + (parseFloat(s.total_revenue) || 0), 0)
          }
        };
      } catch (error) {
        console.error('Error fetching platform overview:', error);
        throw error;
      }
    }
  };
}

