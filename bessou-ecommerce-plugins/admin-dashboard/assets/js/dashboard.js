/**
 * Bessou Hair Beauty - Dashboard JavaScript
 */

(function($) {
    'use strict';
    
    let charts = {};
    let refreshInterval;
    
    $(document).ready(function() {
        initDashboard();
        loadDashboardStats();
        setupEventHandlers();
        startAutoRefresh();
    });
    
    /**
     * Initialize dashboard
     */
    function initDashboard() {
        // Initialize date picker if present
        if ($.fn.datepicker) {
            $('.datepicker').datepicker({
                dateFormat: 'yy-mm-dd',
                minDate: 0
            });
        }
        
        // Initialize tooltips
        $('[data-tooltip]').each(function() {
            $(this).attr('title', $(this).data('tooltip'));
        });
    }
    
    /**
     * Load dashboard statistics
     */
    function loadDashboardStats() {
        $.ajax({
            url: bessou_dashboard.ajax_url,
            type: 'POST',
            data: {
                action: 'get_dashboard_stats',
                nonce: bessou_dashboard.nonce
            },
            success: function(response) {
                if (response.success) {
                    updateStatsCards(response.data);
                    updateRecentActivity(response.data.recent_activity);
                    loadCharts();
                }
            },
            error: function() {
                showNotification('Error loading dashboard statistics', 'error');
            }
        });
    }
    
    /**
     * Update statistics cards
     */
    function updateStatsCards(data) {
        // Update visitor stats
        $('#total-visitors').text(formatNumber(data.visitors_today));
        updateChangeIndicator('#visitors-change', data.visitors_change);
        
        // Update booking stats
        $('#total-bookings').text(formatNumber(data.bookings_today));
        updateChangeIndicator('#bookings-change', data.bookings_change);
        
        // Update revenue stats
        $('#total-revenue').text(bessou_dashboard.currency_symbol + data.revenue_today);
        
        // Update conversion rate
        $('#conversion-rate').text(data.conversion_rate + '%');
        
        // Animate counters
        animateCounters();
    }
    
    /**
     * Update change indicators
     */
    function updateChangeIndicator(selector, change) {
        const $indicator = $(selector);
        const isPositive = change >= 0;
        
        $indicator
            .removeClass('positive negative')
            .addClass(isPositive ? 'positive' : 'negative')
            .text((isPositive ? '+' : '') + change + '%');
    }
    
    /**
     * Animate counters
     */
    function animateCounters() {
        $('.stat-content h3').each(function() {
            const $this = $(this);
            const text = $this.text();
            const number = parseFloat(text.replace(/[^0-9.-]+/g, ''));
            
            if (!isNaN(number)) {
                $this.prop('Counter', 0).animate({
                    Counter: number
                }, {
                    duration: 1000,
                    easing: 'swing',
                    step: function(now) {
                        if (text.includes('%')) {
                            $this.text(Math.ceil(now) + '%');
                        } else if (text.includes('$')) {
                            $this.text(bessou_dashboard.currency_symbol + formatNumber(Math.ceil(now)));
                        } else {
                            $this.text(formatNumber(Math.ceil(now)));
                        }
                    }
                });
            }
        });
    }
    
    /**
     * Update recent activity
     */
    function updateRecentActivity(activities) {
        const $container = $('#recent-activity');
        
        if (!activities || activities.length === 0) {
            $container.html('<div class="no-activity">No recent activity</div>');
            return;
        }
        
        let html = '';
        activities.forEach(function(activity) {
            const iconClass = getActivityIconClass(activity.type);
            const iconColor = getActivityIconColor(activity.type);
            
            html += `
                <div class="activity-item">
                    <div class="activity-icon" style="background: ${iconColor};">
                        <span class="dashicons dashicons-${activity.icon}"></span>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-time">${activity.time}</div>
                    </div>
                </div>
            `;
        });
        
        $container.html(html);
    }
    
    /**
     * Load charts
     */
    function loadCharts() {
        loadTrafficChart();
        loadBookingsChart();
        loadRevenueChart();
        loadServicesChart();
        loadVisitorAnalytics();
    }
    
    /**
     * Load traffic chart
     */
    function loadTrafficChart() {
        const ctx = document.getElementById('traffic-chart');
        if (!ctx) return;
        
        // Sample data - replace with actual AJAX call
        const data = {
            labels: getLast7Days(),
            datasets: [{
                label: 'Visitors',
                data: [45, 52, 38, 67, 73, 89, 95],
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };
        
        charts.traffic = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Load bookings chart
     */
    function loadBookingsChart() {
        const ctx = document.getElementById('bookings-chart');
        if (!ctx) return;
        
        // Sample data - replace with actual AJAX call
        const data = {
            labels: getLast7Days(),
            datasets: [{
                label: 'Bookings',
                data: [3, 5, 2, 8, 6, 9, 7],
                backgroundColor: '#7b1fa2',
                borderColor: '#7b1fa2',
                borderWidth: 2
            }]
        };
        
        charts.bookings = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Load revenue chart
     */
    function loadRevenueChart() {
        const ctx = document.getElementById('revenue-chart');
        if (!ctx) return;
        
        // Sample data - replace with actual AJAX call
        const data = {
            labels: ['Bookings', 'Hair Products', 'Hair Care', 'Accessories'],
            datasets: [{
                data: [65, 20, 10, 5],
                backgroundColor: [
                    '#388e3c',
                    '#1976d2',
                    '#7b1fa2',
                    '#f57c00'
                ],
                borderWidth: 0
            }]
        };
        
        charts.revenue = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Load services chart
     */
    function loadServicesChart() {
        const ctx = document.getElementById('services-chart');
        if (!ctx) return;
        
        // Sample data - replace with actual AJAX call
        const data = {
            labels: ['Box Braids', 'Cornrows', 'Twists', 'Locs', 'Weaves'],
            datasets: [{
                data: [35, 25, 20, 12, 8],
                backgroundColor: [
                    '#8B4513',
                    '#D2691E',
                    '#CD853F',
                    '#DEB887',
                    '#F4A460'
                ],
                borderWidth: 0
            }]
        };
        
        charts.services = new Chart(ctx, {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Load visitor analytics
     */
    function loadVisitorAnalytics() {
        if (!$('#visitor-type-chart').length) return;
        
        // New vs Returning Visitors
        const visitorTypeCtx = document.getElementById('visitor-type-chart');
        if (visitorTypeCtx) {
            charts.visitorType = new Chart(visitorTypeCtx, {
                type: 'doughnut',
                data: {
                    labels: ['New Visitors', 'Returning Visitors'],
                    datasets: [{
                        data: [70, 30],
                        backgroundColor: ['#1976d2', '#388e3c'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        // Traffic Sources
        const trafficSourcesCtx = document.getElementById('traffic-sources-chart');
        if (trafficSourcesCtx) {
            charts.trafficSources = new Chart(trafficSourcesCtx, {
                type: 'pie',
                data: {
                    labels: ['Direct', 'Search', 'Social Media', 'Referrals'],
                    datasets: [{
                        data: [40, 35, 15, 10],
                        backgroundColor: ['#f57c00', '#7b1fa2', '#1976d2', '#388e3c'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        // Device Types
        const deviceCtx = document.getElementById('device-chart');
        if (deviceCtx) {
            charts.device = new Chart(deviceCtx, {
                type: 'bar',
                data: {
                    labels: ['Mobile', 'Desktop', 'Tablet'],
                    datasets: [{
                        data: [65, 30, 5],
                        backgroundColor: ['#1976d2', '#388e3c', '#f57c00'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Setup event handlers
     */
    function setupEventHandlers() {
        // Refresh activity button
        $('#refresh-activity').on('click', function() {
            loadDashboardStats();
        });
        
        // Export analytics button
        $('#export-analytics').on('click', function(e) {
            e.preventDefault();
            exportAnalytics();
        });
        
        // Chart period selectors
        $('#traffic-period, #booking-period').on('change', function() {
            const period = $(this).val();
            const chartType = $(this).attr('id').replace('-period', '');
            updateChartPeriod(chartType, period);
        });
        
        // Real-time toggle
        $('#realtime-toggle').on('change', function() {
            if ($(this).is(':checked')) {
                startAutoRefresh();
            } else {
                stopAutoRefresh();
            }
        });
    }
    
    /**
     * Start auto refresh
     */
    function startAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
        
        refreshInterval = setInterval(function() {
            loadDashboardStats();
        }, bessou_dashboard.refresh_interval);
    }
    
    /**
     * Stop auto refresh
     */
    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }
    
    /**
     * Export analytics
     */
    function exportAnalytics() {
        const $button = $('#export-analytics');
        const originalText = $button.text();
        
        $button.text('Exporting...').prop('disabled', true);
        
        $.ajax({
            url: bessou_dashboard.ajax_url,
            type: 'POST',
            data: {
                action: 'export_analytics',
                nonce: bessou_dashboard.nonce,
                format: 'csv',
                period: '30'
            },
            success: function(response) {
                if (response.success) {
                    // Create download link
                    const link = document.createElement('a');
                    link.href = response.data.download_url;
                    link.download = response.data.filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    showNotification('Analytics exported successfully!', 'success');
                } else {
                    showNotification('Export failed: ' + response.data, 'error');
                }
            },
            error: function() {
                showNotification('Export failed. Please try again.', 'error');
            },
            complete: function() {
                $button.text(originalText).prop('disabled', false);
            }
        });
    }
    
    /**
     * Update chart period
     */
    function updateChartPeriod(chartType, period) {
        // This would typically make an AJAX call to get new data
        // For now, we'll just show a loading state
        showNotification(`Updating ${chartType} chart for ${period} days...`, 'info');
    }
    
    /**
     * Utility functions
     */
    function formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }
    
    function getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        return days;
    }
    
    function getActivityIconClass(type) {
        const icons = {
            'booking': 'calendar-alt',
            'order': 'cart',
            'payment': 'money-alt',
            'visitor': 'visibility'
        };
        return icons[type] || 'admin-generic';
    }
    
    function getActivityIconColor(type) {
        const colors = {
            'booking': '#7b1fa2',
            'order': '#1976d2',
            'payment': '#388e3c',
            'visitor': '#f57c00'
        };
        return colors[type] || '#666';
    }
    
    function showNotification(message, type) {
        const $notification = $('<div class="notice notice-' + type + ' is-dismissible"><p>' + message + '</p></div>');
        $('.wrap').prepend($notification);
        
        setTimeout(function() {
            $notification.fadeOut(function() {
                $(this).remove();
            });
        }, 5000);
    }
    
    // Cleanup on page unload
    $(window).on('beforeunload', function() {
        stopAutoRefresh();
    });
    
})(jQuery);

