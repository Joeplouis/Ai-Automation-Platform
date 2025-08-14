// Revenue & Analytics Dashboard
// Comprehensive tracking of revenue, costs, and performance across all automations

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Analytics as AnalyticsIcon,
  VideoLibrary as VideoIcon,
  ShoppingCart as AffiliateIcon,
  Book as BookIcon,
  School as CourseIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  ThumbUp as EngagementIcon,
  Share as ShareIcon,
  AccountBalance as RevenueIcon,
  CreditCard as CostIcon,
  Assessment as ROIIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const RevenueAnalyticsDashboard = ({ userId }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    overview: {},
    revenue: {},
    costs: {},
    workflows: [],
    affiliates: [],
    videos: [],
    products: []
  });

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/analytics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load dashboard data');
      
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('en-US').format(number || 0);
  };

  const getROIColor = (roi) => {
    if (roi >= 300) return '#4caf50'; // Green
    if (roi >= 200) return '#8bc34a'; // Light Green
    if (roi >= 100) return '#ffeb3b'; // Yellow
    if (roi >= 50) return '#ff9800';  // Orange
    return '#f44336'; // Red
  };

  // Overview Cards Component
  const OverviewCards = () => (
    <Grid container spacing={3}>
      {/* Total Revenue */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(dashboardData.overview.totalRevenue)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Total Revenue
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                  +{dashboardData.overview.revenueGrowth}% vs last period
                </Typography>
              </Box>
              <RevenueIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Total Costs */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(dashboardData.overview.totalCosts)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Total Costs
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                  {dashboardData.overview.costChange > 0 ? '+' : ''}{dashboardData.overview.costChange}% vs last period
                </Typography>
              </Box>
              <CostIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Net Profit */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(dashboardData.overview.netProfit)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Net Profit
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                  {dashboardData.overview.profitMargin}% margin
                </Typography>
              </Box>
              <TrendingUpIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ROI */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {dashboardData.overview.roi}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Return on Investment
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                  {dashboardData.overview.roiTrend > 0 ? '↗' : '↘'} {Math.abs(dashboardData.overview.roiTrend)}% trend
                </Typography>
              </Box>
              <ROIIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Revenue Breakdown Component
  const RevenueBreakdown = () => (
    <Grid container spacing={3}>
      {/* Revenue Sources Chart */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Revenue Sources
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.revenue.sources}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dashboardData.revenue.sources?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Revenue Trend */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Revenue Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dashboardData.revenue.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Area type="monotone" dataKey="profit" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Performing Products */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Performing Products
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Revenue</TableCell>
                    <TableCell>Costs</TableCell>
                    <TableCell>Profit</TableCell>
                    <TableCell>ROI</TableCell>
                    <TableCell>Performance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData.products?.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {product.type === 'affiliate' && <AffiliateIcon sx={{ mr: 1, color: '#ff9800' }} />}
                          {product.type === 'course' && <CourseIcon sx={{ mr: 1, color: '#2196f3' }} />}
                          {product.type === 'book' && <BookIcon sx={{ mr: 1, color: '#4caf50' }} />}
                          {product.type === 'video' && <VideoIcon sx={{ mr: 1, color: '#e91e63' }} />}
                          <Box>
                            <Typography variant="body2" fontWeight="bold">{product.name}</Typography>
                            <Typography variant="caption" color="textSecondary">{product.niche}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={product.type} 
                          size="small" 
                          color={product.type === 'affiliate' ? 'warning' : 'primary'}
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(product.revenue)}</TableCell>
                      <TableCell>{formatCurrency(product.costs)}</TableCell>
                      <TableCell>
                        <Typography color={product.profit > 0 ? 'success.main' : 'error.main'}>
                          {formatCurrency(product.profit)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography style={{ color: getROIColor(product.roi) }}>
                          {product.roi}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(product.performance, 100)} 
                          sx={{ width: 100 }}
                        />
                        <Typography variant="caption">{product.performance}%</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Workflow Analytics Component
  const WorkflowAnalytics = () => (
    <Grid container spacing={3}>
      {/* Workflow Performance */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Workflow Performance & Revenue Attribution
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Workflow</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Executions</TableCell>
                    <TableCell>Success Rate</TableCell>
                    <TableCell>Revenue Generated</TableCell>
                    <TableCell>Execution Costs</TableCell>
                    <TableCell>Net Profit</TableCell>
                    <TableCell>ROI</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData.workflows?.map((workflow) => (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{workflow.name}</Typography>
                          <Typography variant="caption" color="textSecondary">{workflow.description}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={workflow.type} 
                          size="small" 
                          color={workflow.type === 'content_creation' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>{formatNumber(workflow.executions)}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <LinearProgress 
                            variant="determinate" 
                            value={workflow.successRate} 
                            sx={{ width: 60, mr: 1 }}
                            color={workflow.successRate >= 95 ? 'success' : workflow.successRate >= 80 ? 'warning' : 'error'}
                          />
                          <Typography variant="caption">{workflow.successRate}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography color="success.main" fontWeight="bold">
                          {formatCurrency(workflow.revenueGenerated)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography color="error.main">
                          {formatCurrency(workflow.executionCosts)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography color={workflow.netProfit > 0 ? 'success.main' : 'error.main'} fontWeight="bold">
                          {formatCurrency(workflow.netProfit)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography style={{ color: getROIColor(workflow.roi) }} fontWeight="bold">
                          {workflow.roi}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => viewWorkflowDetails(workflow.id)}>
                          <ViewIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => optimizeWorkflow(workflow.id)}>
                          <TrendingUpIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Workflow Revenue Trend */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Workflow Revenue Trend
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dashboardData.workflows?.revenueHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="contentCreation" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="affiliateMarketing" stroke="#82ca9d" strokeWidth={2} />
                <Line type="monotone" dataKey="socialMedia" stroke="#ffc658" strokeWidth={2} />
                <Line type="monotone" dataKey="ecommerce" stroke="#ff7300" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Cost Breakdown */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cost Breakdown
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={dashboardData.costs?.breakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dashboardData.costs?.breakdown?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Video Analytics Component
  const VideoAnalytics = () => (
    <Grid container spacing={3}>
      {/* Video Performance Metrics */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Video Performance Across Platforms
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dashboardData.videos?.platformPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="platform" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="views" fill="#8884d8" />
                <Bar dataKey="engagement" fill="#82ca9d" />
                <Bar dataKey="revenue" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Videos */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Performing Videos
            </Typography>
            {dashboardData.videos?.topVideos?.map((video, index) => (
              <Box key={video.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="bold" noWrap>{video.title}</Typography>
                <Typography variant="caption" color="textSecondary">{video.niche}</Typography>
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Box display="flex" alignItems="center">
                    <ViewIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption">{formatNumber(video.views)}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <MoneyIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption">{formatCurrency(video.revenue)}</Typography>
                  </Box>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(video.revenue / video.maxRevenue) * 100} 
                  sx={{ mt: 1 }}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      {/* Video Revenue by Niche */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Video Revenue by Niche
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Niche</TableCell>
                    <TableCell>Videos Created</TableCell>
                    <TableCell>Total Views</TableCell>
                    <TableCell>Avg. Engagement</TableCell>
                    <TableCell>Revenue</TableCell>
                    <TableCell>Cost per Video</TableCell>
                    <TableCell>Profit</TableCell>
                    <TableCell>ROI</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData.videos?.nichePerformance?.map((niche) => (
                    <TableRow key={niche.name}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">{niche.name}</Typography>
                      </TableCell>
                      <TableCell>{formatNumber(niche.videoCount)}</TableCell>
                      <TableCell>{formatNumber(niche.totalViews)}</TableCell>
                      <TableCell>{niche.avgEngagement}%</TableCell>
                      <TableCell>
                        <Typography color="success.main">
                          {formatCurrency(niche.revenue)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography color="error.main">
                          {formatCurrency(niche.costPerVideo)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography color={niche.profit > 0 ? 'success.main' : 'error.main'}>
                          {formatCurrency(niche.profit)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography style={{ color: getROIColor(niche.roi) }}>
                          {niche.roi}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Affiliate Analytics Component
  const AffiliateAnalytics = () => (
    <Grid container spacing={3}>
      {/* Affiliate Performance */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Affiliate Product Performance
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Network</TableCell>
                    <TableCell>Niche</TableCell>
                    <TableCell>Clicks</TableCell>
                    <TableCell>Conversions</TableCell>
                    <TableCell>Conversion Rate</TableCell>
                    <TableCell>Commission</TableCell>
                    <TableCell>Revenue</TableCell>
                    <TableCell>Marketing Cost</TableCell>
                    <TableCell>Net Profit</TableCell>
                    <TableCell>ROI</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData.affiliates?.map((affiliate) => (
                    <TableRow key={affiliate.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{affiliate.productName}</Typography>
                          <Typography variant="caption" color="textSecondary">{affiliate.merchant}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={affiliate.network} size="small" />
                      </TableCell>
                      <TableCell>{affiliate.niche}</TableCell>
                      <TableCell>{formatNumber(affiliate.clicks)}</TableCell>
                      <TableCell>{formatNumber(affiliate.conversions)}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <LinearProgress 
                            variant="determinate" 
                            value={affiliate.conversionRate} 
                            sx={{ width: 60, mr: 1 }}
                            color={affiliate.conversionRate >= 5 ? 'success' : affiliate.conversionRate >= 2 ? 'warning' : 'error'}
                          />
                          <Typography variant="caption">{affiliate.conversionRate}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{affiliate.commissionRate}%</TableCell>
                      <TableCell>
                        <Typography color="success.main">
                          {formatCurrency(affiliate.revenue)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography color="error.main">
                          {formatCurrency(affiliate.marketingCost)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography color={affiliate.netProfit > 0 ? 'success.main' : 'error.main'}>
                          {formatCurrency(affiliate.netProfit)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography style={{ color: getROIColor(affiliate.roi) }}>
                          {affiliate.roi}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const viewWorkflowDetails = (workflowId) => {
    // Navigate to workflow details
    console.log('View workflow details:', workflowId);
  };

  const optimizeWorkflow = (workflowId) => {
    // Optimize workflow performance
    console.log('Optimize workflow:', workflowId);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          💰 Revenue & Analytics Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select value={timeRange} onChange={handleTimeRangeChange} label="Time Range">
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
              <MenuItem value="1y">Last Year</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadDashboardData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => console.log('Export data')}
          >
            Export
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Overview Cards */}
      <Box mb={3}>
        <OverviewCards />
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Revenue Breakdown" icon={<MoneyIcon />} />
          <Tab label="Workflow Analytics" icon={<AnalyticsIcon />} />
          <Tab label="Video Performance" icon={<VideoIcon />} />
          <Tab label="Affiliate Tracking" icon={<AffiliateIcon />} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && <RevenueBreakdown />}
      {activeTab === 1 && <WorkflowAnalytics />}
      {activeTab === 2 && <VideoAnalytics />}
      {activeTab === 3 && <AffiliateAnalytics />}
    </Box>
  );
};

export default RevenueAnalyticsDashboard;

