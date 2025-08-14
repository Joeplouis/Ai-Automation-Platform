import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Calendar, 
  MessageSquare, 
  Settings,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  Zap,
  Globe,
  Video,
  FileText,
  Mail,
  Phone,
  Building,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Briefcase,
  UserCheck,
  TrendingDown
} from 'lucide-react'
import './App.css'

// Mock data for demonstration
const mockData = {
  overview: {
    totalRevenue: 125000,
    monthlyRevenue: 15000,
    totalClients: 45,
    activeProjects: 12,
    completionRate: 94,
    growthRate: 23.5
  },
  revenueData: [
    { month: 'Jan', revenue: 8000, clients: 15 },
    { month: 'Feb', revenue: 12000, clients: 22 },
    { month: 'Mar', revenue: 15000, clients: 28 },
    { month: 'Apr', revenue: 18000, clients: 35 },
    { month: 'May', revenue: 22000, clients: 42 },
    { month: 'Jun', revenue: 25000, clients: 45 }
  ],
  serviceBreakdown: [
    { name: 'AI Training', value: 35, revenue: 43750, color: '#d4af37' },
    { name: 'Custom Automation', value: 30, revenue: 37500, color: '#f4e4a6' },
    { name: 'Content Packages', value: 20, revenue: 25000, color: '#b8941f' },
    { name: 'CRM Integration', value: 15, revenue: 18750, color: '#0a1628' }
  ],
  recentClients: [
    { id: 1, name: 'TechStart Inc', email: 'contact@techstart.com', service: 'AI Training', status: 'active', revenue: 2500 },
    { id: 2, name: 'Digital Solutions', email: 'info@digitalsol.com', service: 'Custom Automation', status: 'completed', revenue: 5000 },
    { id: 3, name: 'Marketing Pro', email: 'hello@marketingpro.com', service: 'Content Packages', status: 'active', revenue: 1200 },
    { id: 4, name: 'E-commerce Plus', email: 'support@ecomplus.com', service: 'CRM Integration', status: 'pending', revenue: 800 }
  ],
  projectMetrics: [
    { name: 'Content Created', value: 1250, target: 1500, unit: 'pieces' },
    { name: 'Videos Generated', value: 340, target: 400, unit: 'videos' },
    { name: 'Workflows Built', value: 85, target: 100, unit: 'workflows' },
    { name: 'Automations Active', value: 156, target: 200, unit: 'systems' }
  ]
}

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [dashboardData, setDashboardData] = useState(mockData)
  const [isLoading, setIsLoading] = useState(false)

  // Simulate data loading
  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }, [])

  // Lightweight global navigation handler so other panels can request a tab switch
  useEffect(() => {
    const onNav = (e) => {
      if (e?.detail?.tab) setActiveTab(e.detail.tab)
    }
    window.addEventListener('navigate-tab', onNav)
    return () => window.removeEventListener('navigate-tab', onNav)
  }, [])

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, description, color = "text-blue-600" }) => (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <div className="flex items-center text-xs text-muted-foreground">
            {trend === 'up' ? (
              <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
              {trendValue}%
            </span>
            <span className="ml-1">{description}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const ClientForm = () => {
    const [formData, setFormData] = useState({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      website: '',
      industry: '',
      projectType: '',
      budget: '',
      timeline: '',
      description: ''
    })

    const handleSubmit = (e) => {
      e.preventDefault()
      console.log('Form submitted:', formData)
      // Handle form submission
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            New Client Onboarding
          </CardTitle>
          <CardDescription>
            Add a new client to your dashboard and start tracking their project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                  placeholder="Enter contact person name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={formData.industry} onValueChange={(value) => setFormData({...formData, industry: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectType">Service Type *</Label>
                <Select value={formData.projectType} onValueChange={(value) => setFormData({...formData, projectType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai-training">AI Training Session ($350)</SelectItem>
                    <SelectItem value="custom-automation">Custom Automation</SelectItem>
                    <SelectItem value="content-packages">Content Generation Packages</SelectItem>
                    <SelectItem value="crm-integration">CRM Integration</SelectItem>
                    <SelectItem value="consultation">Free Consultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget Range</Label>
                <Select value={formData.budget} onValueChange={(value) => setFormData({...formData, budget: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-1k">Under $1,000</SelectItem>
                    <SelectItem value="1k-5k">$1,000 - $5,000</SelectItem>
                    <SelectItem value="5k-10k">$5,000 - $10,000</SelectItem>
                    <SelectItem value="10k-25k">$10,000 - $25,000</SelectItem>
                    <SelectItem value="25k-plus">$25,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Project Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the project requirements, goals, and any specific needs..."
                rows={4}
              />
            </div>
            
            <Button type="submit" className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600">
              <UserCheck className="h-4 w-4 mr-2" />
              Add Client & Start Project
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-white">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                AI Agency Dashboard
              </h1>
              <p className="text-slate-400 mt-2">
                Comprehensive analytics and client management for BookAI Studio
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                <Activity className="h-3 w-3 mr-1" />
                Live Data
              </Badge>
              <Button variant="outline" className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-slate-900">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 bg-slate-800 border border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-slate-900">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-slate-900">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="clients" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-slate-900">
              <Users className="h-4 w-4 mr-2" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-slate-900">
              <Briefcase className="h-4 w-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-slate-900">
              <UserCheck className="h-4 w-4 mr-2" />
              Add Client
            </TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-slate-900">
              <Zap className="h-4 w-4 mr-2" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-slate-900">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="corpus" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-slate-900">
              <FileText className="h-4 w-4 mr-2" />
              Corpus
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Revenue"
                value={`$${dashboardData.overview.totalRevenue.toLocaleString()}`}
                icon={DollarSign}
                trend="up"
                trendValue={dashboardData.overview.growthRate}
                description="vs last month"
                color="text-green-500"
              />
              <StatCard
                title="Monthly Revenue"
                value={`$${dashboardData.overview.monthlyRevenue.toLocaleString()}`}
                icon={TrendingUp}
                trend="up"
                trendValue="12.5"
                description="vs last month"
                color="text-blue-500"
              />
              <StatCard
                title="Total Clients"
                value={dashboardData.overview.totalClients}
                icon={Users}
                trend="up"
                trendValue="8.2"
                description="new this month"
                color="text-purple-500"
              />
              <StatCard
                title="Active Projects"
                value={dashboardData.overview.activeProjects}
                icon={Briefcase}
                trend="up"
                trendValue="15.3"
                description="in progress"
                color="text-yellow-500"
              />
            </div>

            {/* Revenue Chart */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Revenue Growth</CardTitle>
                <CardDescription className="text-slate-400">
                  Monthly revenue and client acquisition over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dashboardData.revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#EAB308" 
                      fill="url(#colorRevenue)" 
                      strokeWidth={2}
                    />
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Service Distribution</CardTitle>
                  <CardDescription className="text-slate-400">
                    Revenue breakdown by service type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={dashboardData.serviceBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {dashboardData.serviceBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F9FAFB'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Project Metrics</CardTitle>
                  <CardDescription className="text-slate-400">
                    Current progress on key deliverables
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dashboardData.projectMetrics.map((metric, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">{metric.name}</span>
                        <span className="text-yellow-500">
                          {metric.value} / {metric.target} {metric.unit}
                        </span>
                      </div>
                      <Progress 
                        value={(metric.value / metric.target) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <ChatPanel />
          </TabsContent>

          {/* Corpus Tab */}
          <TabsContent value="corpus" className="space-y-6">
            <CorpusPanel />
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-6">
            <AgentsPanel />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Client Growth</CardTitle>
                  <CardDescription className="text-slate-400">
                    Monthly client acquisition trend
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dashboardData.revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F9FAFB'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="clients" 
                        stroke="#EAB308" 
                        strokeWidth={3}
                        dot={{ fill: '#EAB308', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Revenue by Service</CardTitle>
                  <CardDescription className="text-slate-400">
                    Comparative revenue analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.serviceBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F9FAFB'
                        }} 
                      />
                      <Bar dataKey="revenue" fill="#EAB308" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Recent Clients</CardTitle>
                <CardDescription className="text-slate-400">
                  Latest client engagements and project status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg border border-slate-600">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center">
                          <Building className="h-5 w-5 text-slate-900" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{client.name}</h3>
                          <p className="text-sm text-slate-400">{client.email}</p>
                          <p className="text-xs text-slate-500">{client.service}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={client.status === 'active' ? 'default' : client.status === 'completed' ? 'secondary' : 'outline'}
                          className={
                            client.status === 'active' ? 'bg-green-600 text-white' :
                            client.status === 'completed' ? 'bg-blue-600 text-white' :
                            'border-yellow-500 text-yellow-500'
                          }
                        >
                          {client.status}
                        </Badge>
                        <p className="text-sm font-semibold text-yellow-500 mt-1">
                          ${client.revenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Video className="h-5 w-5 text-yellow-500" />
                    Content Generation
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Automated content creation projects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-300">Videos Created</span>
                      <span className="text-yellow-500 font-semibold">340</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-300">Blog Posts</span>
                      <span className="text-yellow-500 font-semibold">125</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-300">Social Media Posts</span>
                      <span className="text-yellow-500 font-semibold">785</span>
                    </div>
                    <Progress value={85} className="h-2 mt-4" />
                    <p className="text-xs text-slate-400">85% of monthly target</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-500" />
                    AI Automations
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Active automation workflows
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-300">N8N Workflows</span>
                      <span className="text-blue-500 font-semibold">85</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-300">CRM Integrations</span>
                      <span className="text-blue-500 font-semibold">23</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-300">Email Campaigns</span>
                      <span className="text-blue-500 font-semibold">48</span>
                    </div>
                    <Progress value={78} className="h-2 mt-4" />
                    <p className="text-xs text-slate-400">78% efficiency rate</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-500" />
                    Training Sessions
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    AI training and consultation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-300">Sessions Completed</span>
                      <span className="text-green-500 font-semibold">42</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-300">Avg. Rating</span>
                      <span className="text-green-500 font-semibold">4.9/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-300">Repeat Clients</span>
                      <span className="text-green-500 font-semibold">68%</span>
                    </div>
                    <Progress value={94} className="h-2 mt-4" />
                    <p className="text-xs text-slate-400">94% satisfaction rate</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Client Onboarding Tab */}
          <TabsContent value="onboarding" className="space-y-6">
            <ClientForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// --- Chat Panel Component ---
function ChatPanel() {
  // Provider/Model dynamic selection and BYOK
  const [providers, setProviders] = useState([])
  const [provider, setProvider] = useState('')
  const [models, setModels] = useState([])
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('') // BYOK placeholder
  const [temperature, setTemperature] = useState(0.7)

  // Sessions and messages
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([]) // [{role, content:{text}, created_at}]
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const eventSourceRef = useRef(null)
  const bottomRef = useRef(null)

  // Prompt review state
  const [showReview, setShowReview] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewStatus, setReviewStatus] = useState(null) // 'ready' | 'needs_clarification'
  const [reviewerQuestions, setReviewerQuestions] = useState([])
  const [reviewerAnswers, setReviewerAnswers] = useState({})
  const [revisedPrompt, setRevisedPrompt] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')
  // Reviewer LLM override
  const [reviewerProvider, setReviewerProvider] = useState('')
  const [reviewerModels, setReviewerModels] = useState([])
  const [reviewerModel, setReviewerModel] = useState('')
  const [reviewerTemperature, setReviewerTemperature] = useState(0.2)
  const [reviewerError, setReviewerError] = useState('')

  const authHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/llm/providers', { headers: { ...authHeaders() } })
      const data = await res.json()
      if (data.success) {
        setProviders(data.providers)
      }
    } catch (e) { console.error('providers error', e) }
  }

  const fetchModels = async (prov) => {
    try {
      if (!prov) return setModels([])
      const res = await fetch(`/api/llm/models/${encodeURIComponent(prov)}`, { headers: { ...authHeaders() } })
      const data = await res.json()
      if (data.success) setModels(data.models || [])
    } catch (e) { console.error('models error', e) }
  }

  const fetchReviewerModels = async (prov) => {
    try {
      if (!prov) return setReviewerModels([])
      const res = await fetch(`/api/llm/models/${encodeURIComponent(prov)}`, { headers: { ...authHeaders() } })
      const data = await res.json()
      if (data.success) setReviewerModels(data.models || [])
    } catch (e) { console.error('reviewer models error', e) }
  }

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/llm/sessions', { headers: { ...authHeaders() } })
      const data = await res.json()
      if (data.success) setSessions(data.sessions)
    } catch (e) { console.error('sessions error', e) }
  }

  const loadMessages = async (sid) => {
    try {
      if (!sid) return setMessages([])
      const res = await fetch(`/api/llm/sessions/${sid}/messages`, { headers: { ...authHeaders() } })
      const data = await res.json()
      if (data.success) setMessages(data.messages)
    } catch (e) { console.error('messages error', e) }
  }

  const saveConfig = async () => {
    try {
      if (!provider || !model) return
      await fetch('/api/llm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ provider, model, apiKey: apiKey || undefined, temperature })
      })
    } catch (e) { console.error('save config error', e) }
  }

  const startNewSession = async () => {
    try {
      const res = await fetch('/api/llm/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ title: 'Chat Session', provider, model })
      })
      const data = await res.json()
      if (data.success) {
        await loadSessions()
        setSessionId(data.session.id)
        setMessages([])
      }
    } catch (e) { console.error('new session error', e) }
  }

  const clearSession = async () => {
    try {
      if (!sessionId) return
      await fetch(`/api/llm/sessions/${sessionId}/clear`, { method: 'POST', headers: { ...authHeaders() } })
      setMessages([])
    } catch (e) { console.error('clear error', e) }
  }

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text || isStreaming) return
    if (!sessionId) await startNewSession()
    const sid = sessionId || (sessions[0]?.id ?? null)
    const userMsg = { role: 'user', content: { text }, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: { text: '' }, created_at: new Date().toISOString(), _streaming: true }])
    if (!overrideText) setInput('')
    setIsStreaming(true)

    // Save active config before chat (so backend uses this provider/model)
    await saveConfig()

    // Open SSE
    const params = new URLSearchParams()
    params.set('message', text)
    params.set('agentType', 'master')
    if (sid) params.set('sessionId', sid)
    const tok = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (tok) params.set('token', tok)
    const es = new EventSource(`/api/llm/chat/stream?${params.toString()}`, { withCredentials: false })
    eventSourceRef.current = es
    es.onmessage = (ev) => {
      // Some infra sends data on default event; handle token/done specific below
      try { const data = JSON.parse(ev.data); if (data?.token) onToken(data.token) } catch {}
    }
    es.addEventListener('token', (ev) => {
      onToken(ev.data)
    })
    es.addEventListener('done', async (_ev) => {
      es.close(); eventSourceRef.current = null; setIsStreaming(false)
      await loadSessions()
      if (!sessionId) {
        // Backend created a session; refresh sessions and pick most recent
        const latest = await (async () => {
          const res = await fetch('/api/llm/sessions', { headers: { ...authHeaders() } })
          const data = await res.json(); return data.sessions?.[0]?.id || null
        })()
        if (latest) setSessionId(latest)
      }
    })
    es.addEventListener('error', (_ev) => {
      try { es.close() } catch {}
      eventSourceRef.current = null; setIsStreaming(false)
    })
  }

  // Prompt review: step 1
  const startPromptReview = async () => {
    const text = input.trim()
    if (!text) return
    // Minimal validation for reviewer overrides
    setReviewerError('')
    if (reviewerModel && !reviewerProvider) {
      setReviewerError('Select a reviewer provider when choosing a model.')
      return
    }
    if (Number.isFinite(reviewerTemperature)) {
      if (reviewerTemperature < 0 || reviewerTemperature > 1) {
        setReviewerError('Reviewer temperature must be between 0 and 1.')
        return
      }
    }
    setShowReview(true)
    setIsReviewing(true)
    setReviewStatus(null)
    setReviewerQuestions([])
    setReviewerAnswers({})
    setRevisedPrompt('')
    setReviewNotes('')
    try {
      const res = await fetch('/api/llm/prompt/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          prompt: text,
          reviewerProvider: reviewerProvider || provider || undefined,
          reviewerModel: reviewerModel || model || undefined,
          reviewerTemperature
        })
      })
      const data = await res.json()
      if (data.success) {
        setReviewStatus(data.status || null)
        setReviewerQuestions(data.questions || [])
        setRevisedPrompt(data.revisedPrompt || '')
        setReviewNotes(data.notes || '')
      } else {
        setReviewNotes(data.error || 'Review failed')
      }
    } catch (e) {
      setReviewNotes(e.message || 'Review failed')
    } finally {
      setIsReviewing(false)
    }
  }

  // Prompt review: submit answers
  const submitReviewAnswers = async () => {
    const text = input.trim()
    if (!text) return
    setIsReviewing(true)
    try {
      const res = await fetch('/api/llm/prompt/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          prompt: text,
          answers: reviewerAnswers,
          reviewerProvider: reviewerProvider || provider || undefined,
          reviewerModel: reviewerModel || model || undefined,
          reviewerTemperature
        })
      })
      const data = await res.json()
      if (data.success) {
        setReviewStatus(data.status || null)
        setReviewerQuestions(data.questions || [])
        setRevisedPrompt(data.revisedPrompt || '')
        setReviewNotes(data.notes || '')
      } else {
        setReviewNotes(data.error || 'Review failed')
      }
    } catch (e) {
      setReviewNotes(e.message || 'Review failed')
    } finally {
      setIsReviewing(false)
    }
  }

  const approveAndSend = async () => {
    const text = (revisedPrompt || input).trim()
    if (!text) return
    setShowReview(false)
    await sendMessage(text)
  }

  const onToken = (chunk) => {
    setMessages(prev => {
      const next = [...prev]
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i]._streaming) {
          next[i] = { ...next[i], content: { text: (next[i].content?.text || '') + chunk } }
          break
        }
      }
      return next
    })
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Effects
  useEffect(() => { fetchProviders(); loadSessions() }, [])
  // Prefill chat input when triggered from Agents panel
  useEffect(() => {
    const onNav = () => {
      try {
        const t = sessionStorage.getItem('prefill_chat_text')
        if (t) {
          setInput(t)
          sessionStorage.removeItem('prefill_chat_text')
        }
      } catch {}
    }
    window.addEventListener('navigate-tab', onNav)
    // Also check once on mount
    onNav()
    return () => window.removeEventListener('navigate-tab', onNav)
  }, [])
  useEffect(() => { fetchModels(provider); setModel('') }, [provider])
  useEffect(() => { fetchReviewerModels(reviewerProvider); setReviewerModel('') }, [reviewerProvider])
  useEffect(() => { if (sessionId) loadMessages(sessionId) }, [sessionId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar: sessions */}
      <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            Sessions
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-500" onClick={startNewSession}>New</Button>
          </CardTitle>
          <CardDescription className="text-slate-400">Your conversation history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[480px] overflow-auto">
          {sessions.length === 0 && (
            <div className="text-slate-400 text-sm">No sessions yet</div>
          )}
          {sessions.map(s => (
            <div key={s.id} className={`p-2 rounded border ${sessionId === s.id ? 'border-yellow-500 bg-slate-700' : 'border-slate-700'} cursor-pointer`} onClick={() => setSessionId(s.id)}>
              <div className="text-sm text-white truncate">{s.title || 'Chat Session'}</div>
              <div className="text-xs text-slate-400">{s.provider || 'provider'} • {s.model || 'model'}</div>
            </div>
          ))}
          {sessionId && (
            <div className="pt-2">
              <Button variant="outline" size="sm" className="w-full border-yellow-600 text-yellow-500" onClick={clearSession}>Clear Session</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main chat area */}
      <div className="lg:col-span-3 space-y-4">
        {/* Provider/Model/Key Row */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Model & Provider</CardTitle>
            <CardDescription className="text-slate-400">Choose provider and model. Enter API key if required.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="space-y-1 md:col-span-1">
              <Label className="text-slate-300">Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="bg-slate-900 border-slate-700">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {providers.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-slate-300">Model</Label>
              <Select value={model} onValueChange={setModel} disabled={!provider}>
                <SelectTrigger className="bg-slate-900 border-slate-700">
                  <SelectValue placeholder={provider ? 'Select model' : 'Select provider first'} />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 max-h-72">
                  {(models || []).map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-slate-300">API Key (optional)</Label>
              <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter provider API key (stored securely)" className="bg-slate-900 border-slate-700" />
              <div className="flex items-center gap-3 pt-2">
                <Label className="text-slate-300">Temperature</Label>
                <Input type="number" step="0.1" min="0" max="1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)} className="w-24 bg-slate-900 border-slate-700" />
                <Button size="sm" onClick={saveConfig} className="bg-yellow-600 hover:bg-yellow-500">Save & Use</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Chat</CardTitle>
            <CardDescription className="text-slate-400">Talk to the agent. Streaming enabled.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[360px] overflow-auto border border-slate-700 rounded p-3 bg-slate-900/60">
              {messages.map((m, idx) => (
                <div key={idx} className={`mb-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block px-3 py-2 rounded ${m.role === 'user' ? 'bg-yellow-600 text-slate-900' : 'bg-slate-700 text-white'}`}>
                    {m.content?.text || ''}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="mt-3 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Type your message..."
                className="bg-slate-900 border-slate-700"
              />
              <Button onClick={() => sendMessage()} disabled={isStreaming} className="bg-yellow-600 hover:bg-yellow-500">
                {isStreaming ? 'Streaming...' : 'Send'}
              </Button>
              <Button variant="outline" disabled={isStreaming || !input.trim()} className="border-blue-400 text-blue-300" onClick={startPromptReview}>
                Review Prompt
              </Button>
              <Button variant="outline" className="border-yellow-600 text-yellow-500" onClick={() => setMessages([])}>Clear Screen</Button>
              {!(localStorage.getItem('token') || sessionStorage.getItem('token')) && (
                <Button
                  variant="outline"
                  className="border-green-500 text-green-400"
                  onClick={async () => {
                    try {
                      const res = await fetch('/auth/dev-quick-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'dev@example.com' }) })
                      const data = await res.json()
                      if (res.ok && data.token) {
                        localStorage.setItem('token', data.token)
                        // refresh providers/sessions quickly
                        fetchProviders(); loadSessions()
                      }
                    } catch {}
                  }}
                  title="Dev-only shortcut to get a token for chat in local/demo env"
                >Quick Dev Login</Button>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Prompt Review Modal */}
        {showReview && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div className="text-white font-semibold">Prompt Review</div>
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300" onClick={() => setShowReview(false)}>Close</Button>
              </div>
              <div className="p-4 space-y-4 max-h-[70vh] overflow-auto">
                {/* Reviewer LLM override controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-300">Reviewer Provider</Label>
                    <div className="text-xs text-slate-400">Optional override for which LLM rewrites your prompt.</div>
                    <Select value={reviewerProvider} onValueChange={setReviewerProvider}>
                      <SelectTrigger className="bg-slate-900 border-slate-700">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 max-h-72">
                        {providers.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-slate-300">Reviewer Model</Label>
                    <div className="text-xs text-slate-400">If set, make sure a matching provider is selected.</div>
                    <Select value={reviewerModel} onValueChange={setReviewerModel} disabled={!reviewerProvider}>
                      <SelectTrigger className="bg-slate-900 border-slate-700">
                        <SelectValue placeholder={reviewerProvider ? 'Select model' : 'Select provider first'} />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 max-h-72">
                        {(reviewerModels || []).map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300">Reviewer Temp</Label>
                    <div className="text-xs text-slate-400">Lower = more deterministic rewrites (recommended 0.1–0.3).</div>
                    <Input type="number" step="0.1" min="0" max="1" value={reviewerTemperature} onChange={(e) => setReviewerTemperature(parseFloat(e.target.value) || 0)} className="bg-slate-900 border-slate-700" />
                  </div>
                </div>
                {reviewerError && (
                  <div className="text-xs text-red-400">{reviewerError}</div>
                )}
                {isReviewing && (
                  <div className="text-slate-300 text-sm">Reviewing your prompt...</div>
                )}
                {!isReviewing && reviewNotes && (
                  <div className="text-xs text-slate-400">Notes: {reviewNotes}</div>
                )}
                {!isReviewing && reviewStatus === 'needs_clarification' && (
                  <div className="space-y-3">
                    <div className="text-slate-200 font-medium">Clarifying Questions</div>
                    <div className="space-y-2">
                      {(reviewerQuestions || []).map((q, i) => (
                        <div key={i} className="space-y-1">
                          <Label className="text-slate-300 text-sm">Q{i+1}. {q}</Label>
                          <Input
                            className="bg-slate-900 border-slate-700"
                            value={reviewerAnswers[i] || ''}
                            onChange={(e) => setReviewerAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                            placeholder="Type your answer"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button onClick={submitReviewAnswers} className="bg-yellow-600 hover:bg-yellow-500">Submit Answers</Button>
                      <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setShowReview(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
                {!isReviewing && reviewStatus === 'ready' && (
                  <div className="space-y-3">
                    <div className="text-slate-200 font-medium">Revised Prompt</div>
                    <Textarea
                      className="bg-slate-900 border-slate-700 min-h-[140px]"
                      value={revisedPrompt}
                      onChange={(e) => setRevisedPrompt(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button className="bg-green-600 hover:bg-green-500" onClick={approveAndSend}>Approve & Send</Button>
                      <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setShowReview(false)}>Close</Button>
                    </div>
                  </div>
                )}
                {!isReviewing && !reviewStatus && (
                  <div className="text-slate-300 text-sm">No review result yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Agents Panel Component ---
function AgentsPanel() {
  const [inventory, setInventory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [promptText, setPromptText] = useState('')
  const [providers, setProviders] = useState([])

  // Review state
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewStatus, setReviewStatus] = useState(null)
  const [reviewerQuestions, setReviewerQuestions] = useState([])
  const [reviewerAnswers, setReviewerAnswers] = useState({})
  const [revisedPrompt, setRevisedPrompt] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')
  // Reviewer LLM override
  const [reviewerProvider, setReviewerProvider] = useState('')
  const [reviewerModels, setReviewerModels] = useState([])
  const [reviewerModel, setReviewerModel] = useState('')
  const [reviewerTemperature, setReviewerTemperature] = useState(0.2)
  const [reviewerError, setReviewerError] = useState('')

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const eventSourceRef = useRef(null)

  const authHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const agentTemplates = {
    n8n: 'Create an n8n workflow that [describe trigger, inputs, steps, and outputs]. Include error handling and logging.',
    wordpress: 'On WordPress, [create/update] a post titled "..." with sections: [..]. Apply SEO best practices and schedule/publish as specified.',
    affiliate: 'Research affiliate products for [niche]. Compile a table with product, network, commission, cookie window, and suggested content angles.',
    postiz: 'Draft and schedule social posts for [platforms] promoting [topic]. Include image prompts and posting times.',
    vps: 'Prepare VPS for [stack]. Ensure firewall, Docker, NGINX, SSL via certbot. Use scripts where possible and report steps.'
  }

  const openAgent = (agentKey) => {
    setSelectedAgent(agentKey)
    setPromptText(agentTemplates[agentKey] || '')
    setShowModal(true)
    // reset review state
    setIsReviewing(false); setReviewStatus(null); setReviewerQuestions([]); setReviewerAnswers({}); setRevisedPrompt(''); setReviewNotes('')
    setIsStreaming(false); setStreamText('')
  }

  const closeModal = () => {
    try { eventSourceRef.current?.close() } catch {}
    eventSourceRef.current = null
    setShowModal(false)
  }

  const fetchInventory = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/llm/inventory', { headers: { ...authHeaders() } })
      const data = await res.json()
      if (data.success) setInventory(data.inventory)
      else setError(data.error || 'Failed to load inventory')
    } catch (e) {
      setError(e.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInventory() }, [])
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const res = await fetch('/api/llm/providers', { headers: { ...authHeaders() } })
        const data = await res.json()
        if (data.success) setProviders(data.providers || [])
      } catch (e) { console.error('agents providers error', e) }
    }
    loadProviders()
  }, [])
  useEffect(() => {
    const load = async () => {
      if (!reviewerProvider) return setReviewerModels([])
      try {
        const res = await fetch(`/api/llm/models/${encodeURIComponent(reviewerProvider)}`, { headers: { ...authHeaders() } })
        const data = await res.json()
        if (data.success) setReviewerModels(data.models || [])
      } catch (e) { console.error('agents reviewer models error', e) }
    }
    load(); setReviewerModel('')
  }, [reviewerProvider])

  const startPromptReview = async () => {
    const text = promptText.trim(); if (!text) return
    // Minimal validation
    setReviewerError('')
    if (reviewerModel && !reviewerProvider) {
      setReviewerError('Select a reviewer provider when choosing a model.')
      return
    }
    if (Number.isFinite(reviewerTemperature)) {
      if (reviewerTemperature < 0 || reviewerTemperature > 1) {
        setReviewerError('Reviewer temperature must be between 0 and 1.')
        return
      }
    }
    setIsReviewing(true); setReviewStatus(null); setReviewerQuestions([]); setReviewerAnswers({}); setRevisedPrompt(''); setReviewNotes('')
    try {
      const res = await fetch('/api/llm/prompt/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ 
          prompt: text,
          reviewerProvider: reviewerProvider || undefined,
          reviewerModel: reviewerModel || undefined,
          reviewerTemperature
        })
      })
      const data = await res.json()
      if (data.success) { setReviewStatus(data.status || null); setReviewerQuestions(data.questions || []); setRevisedPrompt(data.revisedPrompt || ''); setReviewNotes(data.notes || '') }
      else setReviewNotes(data.error || 'Review failed')
    } catch (e) { setReviewNotes(e.message || 'Review failed') }
    finally { setIsReviewing(false) }
  }

  const submitReviewAnswers = async () => {
    const text = promptText.trim(); if (!text) return
    setIsReviewing(true)
    try {
      const res = await fetch('/api/llm/prompt/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ 
          prompt: text, 
          answers: reviewerAnswers,
          reviewerProvider: reviewerProvider || undefined,
          reviewerModel: reviewerModel || undefined,
          reviewerTemperature
        })
      })
      const data = await res.json()
      if (data.success) { setReviewStatus(data.status || null); setReviewerQuestions(data.questions || []); setRevisedPrompt(data.revisedPrompt || ''); setReviewNotes(data.notes || '') }
      else setReviewNotes(data.error || 'Review failed')
    } catch (e) { setReviewNotes(e.message || 'Review failed') }
    finally { setIsReviewing(false) }
  }

  const approveAndSend = async () => {
    const text = (revisedPrompt || promptText).trim(); if (!text || isStreaming) return
    setIsStreaming(true); setStreamText('')
    // Use SSE GET endpoint; rely on current active LLM config
    const params = new URLSearchParams()
    params.set('message', text)
    params.set('agentType', 'master')
    params.set('context', JSON.stringify({ source: 'agents', agent: selectedAgent }))
  const tok = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (tok) params.set('token', tok)
  const es = new EventSource(`/api/llm/chat/stream?${params.toString()}`)
    eventSourceRef.current = es
    es.addEventListener('token', (ev) => setStreamText(prev => prev + ev.data))
    es.addEventListener('done', (_ev) => { try { es.close() } catch {}; eventSourceRef.current = null; setIsStreaming(false) })
    es.addEventListener('error', (_ev) => { try { es.close() } catch {}; eventSourceRef.current = null; setIsStreaming(false) })
  }

  const readiness = (key) => {
    const mod = inventory?.modules?.[key]
    return mod?.present ? 'Ready' : 'Missing'
  }

  const tiles = [
    { key: 'n8n', label: 'n8n', icon: Zap },
    { key: 'wordpress', label: 'WordPress', icon: Globe },
    { key: 'affiliate', label: 'Affiliate', icon: Star },
    { key: 'postiz', label: 'Postiz', icon: MessageSquare },
    { key: 'vps', label: 'VPS', icon: ServerIcon }
  ]

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Agents</CardTitle>
          <CardDescription className="text-slate-400">Kick off common tasks with guided prompts and a review step.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-slate-300 text-sm">Loading inventory...</div>}
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiles.map(t => {
              const Icon = t.icon
              const ready = inventory ? readiness(t.key) : '...'
              const readyClass = ready === 'Ready' ? 'text-green-400' : 'text-red-400'
              return (
                <div key={t.key} className="p-4 bg-slate-900/60 border border-slate-700 rounded-lg cursor-pointer hover:border-yellow-600" onClick={() => openAgent(t.key)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">{t.label}</div>
                        <div className={`text-xs ${readyClass}`}>{ready}</div>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-3xl bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div className="text-white font-semibold">{selectedAgent ? `${selectedAgent.toUpperCase()} Task` : 'Task'}</div>
              <Button variant="outline" size="sm" className="border-slate-600 text-slate-300" onClick={closeModal}>Close</Button>
            </div>
            <div className="p-4 space-y-4 max-h-[75vh] overflow-auto">
              {/* Reviewer LLM override controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-300">Reviewer Provider</Label>
                  <div className="text-xs text-slate-400">Optional override for which LLM rewrites your task.</div>
          <Select value={reviewerProvider} onValueChange={setReviewerProvider}>
                    <SelectTrigger className="bg-slate-900 border-slate-700">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 max-h-72">
            {(providers || []).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-slate-300">Reviewer Model</Label>
                  <div className="text-xs text-slate-400">If set, pick the matching provider above.</div>
                  <Select value={reviewerModel} onValueChange={setReviewerModel} disabled={!reviewerProvider}>
                    <SelectTrigger className="bg-slate-900 border-slate-700">
                      <SelectValue placeholder={reviewerProvider ? 'Select model' : 'Select provider first'} />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 max-h-72">
                      {(reviewerModels || []).map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300">Reviewer Temp</Label>
                  <div className="text-xs text-slate-400">Lower = more deterministic rewrites (0.1–0.3).</div>
                  <Input type="number" step="0.1" min="0" max="1" value={reviewerTemperature} onChange={(e) => setReviewerTemperature(parseFloat(e.target.value) || 0)} className="bg-slate-900 border-slate-700" />
                </div>
              </div>
              {reviewerError && (
                <div className="text-xs text-red-400">{reviewerError}</div>
              )}
              <div className="space-y-2">
                <Label className="text-slate-300">Describe the task</Label>
                <Textarea className="bg-slate-900 border-slate-700 min-h-[140px]" value={promptText} onChange={(e) => setPromptText(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button className="bg-blue-600 hover:bg-blue-500" onClick={startPromptReview} disabled={!promptText.trim() || isReviewing || isStreaming}>Review Prompt</Button>
                <Button variant="outline" className="border-slate-600 text-slate-300" onClick={closeModal}>Cancel</Button>
              </div>

              {/* Review area */}
              {isReviewing && <div className="text-slate-300 text-sm">Reviewing...</div>}
              {!isReviewing && reviewStatus === 'needs_clarification' && (
                <div className="space-y-3">
                  <div className="text-slate-200 font-medium">Clarifying Questions</div>
                  {(reviewerQuestions || []).map((q, i) => (
                    <div key={i} className="space-y-1">
                      <Label className="text-slate-300 text-sm">Q{i+1}. {q}</Label>
                      <Input className="bg-slate-900 border-slate-700" value={reviewerAnswers[i] || ''} onChange={(e) => setReviewerAnswers(prev => ({ ...prev, [i]: e.target.value }))} />
                    </div>
                  ))}
                  <div className="pt-2 flex gap-2">
                    <Button className="bg-yellow-600 hover:bg-yellow-500" onClick={submitReviewAnswers}>Submit Answers</Button>
                    <Button variant="outline" className="border-slate-600 text-slate-300" onClick={closeModal}>Cancel</Button>
                  </div>
                </div>
              )}
              {!isReviewing && reviewStatus === 'ready' && (
                <div className="space-y-3">
                  <div className="text-slate-200 font-medium">Revised Prompt</div>
                  <Textarea className="bg-slate-900 border-slate-700 min-h-[140px]" value={revisedPrompt} onChange={(e) => setRevisedPrompt(e.target.value)} />
                  <div className="flex gap-2">
                    <Button className="bg-green-600 hover:bg-green-500" onClick={approveAndSend} disabled={isStreaming}>Approve & Execute</Button>
                    <Button variant="outline" className="border-blue-400 text-blue-300" onClick={() => {
                      // Quick-switch: open Chat tab and prefill input via a CustomEvent
                      const detail = { tab: 'chat', text: revisedPrompt || promptText }
                      window.dispatchEvent(new CustomEvent('navigate-tab', { detail }))
                      // Also store text for Chat to pick up
                      try { sessionStorage.setItem('prefill_chat_text', detail.text || '') } catch {}
                      closeModal()
                    }}>Approve & Send (Chat)</Button>
                    <Button variant="outline" className="border-slate-600 text-slate-300" onClick={closeModal}>Close</Button>
                  </div>
                </div>
              )}
              {!isReviewing && reviewNotes && (
                <div className="text-xs text-slate-400">Notes: {reviewNotes}</div>
              )}

              {/* Streaming output */}
              {isStreaming && (
                <div className="space-y-2">
                  <div className="text-slate-200 font-medium">Execution Output</div>
                  <div className="min-h-[120px] p-3 bg-slate-900 border border-slate-700 rounded text-slate-200 whitespace-pre-wrap">
                    {streamText}
                  </div>
                </div>
              )}

              {/* Hardened n8n Sandbox Provisioning */}
              {selectedAgent === 'n8n' && (
                <N8nSandboxPanel onClose={closeModal} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Small inline icon for servers if not imported from a lib
function ServerIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="8" rx="2" ry="2"></rect>
      <rect x="3" y="12" width="18" height="8" rx="2" ry="2"></rect>
      <line x1="7" y1="8" x2="7" y2="8"></line>
      <line x1="7" y1="16" x2="7" y2="16"></line>
    </svg>
  )
}

export default App

// --- N8n Sandbox Panel ---
function N8nSandboxPanel({ onClose }) {
  const [serverId, setServerId] = useState('')
  const [domain, setDomain] = useState('')
  const [agentIPs, setAgentIPs] = useState('')
  const [whitelistDomains, setWhitelistDomains] = useState('')
  const [progress, setProgress] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [installTimer, setInstallTimer] = useState(false)

  const authHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const addLine = (t) => setProgress((p) => (p ? p + "\n" + t : t))

  const provision = async () => {
    if (!serverId) { addLine('Please provide a serverId'); return }
    setIsBusy(true); setProgress(''); setResult(null)
    try {
      addLine('Provisioning hardened n8n...')
      const body = {
        domain: domain || undefined,
        agentIPs: agentIPs.split(/[,\s]+/).map(s => s.trim()).filter(Boolean),
        whitelistDomains: whitelistDomains.split(/\n|,|\s+/).map(s => s.trim()).filter(Boolean),
        applyNginx: !!domain,
        applyEgressLockdown: true,
        applyAppArmor: false,
        start: true
      }
      const res = await fetch(`/api/llm/vps/${encodeURIComponent(serverId)}/n8n/sandbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Provisioning failed')
      setResult(data.result)
      addLine('Sandbox provisioned successfully.')

      if (installTimer) {
        addLine('Installing systemd timer for whitelist refresh...')
        const timerRes = await fetch(`/api/llm/vps/${encodeURIComponent(serverId)}/n8n/whitelist/timer`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ onCalendar: 'hourly' })
        })
        const timerData = await timerRes.json()
        if (timerData.success) addLine('Timer installed: ' + (timerData.result?.timer || ''))
        else addLine('Timer install failed: ' + (timerData.error || 'unknown'))
      }
    } catch (e) {
      addLine('Error: ' + (e.message || String(e)))
    } finally {
      setIsBusy(false)
    }
  }

  const refreshWhitelist = async () => {
    if (!serverId) { addLine('Please provide a serverId'); return }
    setIsBusy(true)
    try {
      addLine('Refreshing whitelist...')
      const domains = whitelistDomains.split(/\n|,|\s+/).map(s => s.trim()).filter(Boolean)
      const res = await fetch(`/api/llm/vps/${encodeURIComponent(serverId)}/n8n/whitelist/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ whitelistDomains: domains })
      })
      const data = await res.json()
      if (data.success) addLine('Whitelist refreshed.\n' + (data.result?.logs || ''))
      else addLine('Refresh failed: ' + (data.error || 'unknown'))
    } catch (e) {
      addLine('Error: ' + (e.message || String(e)))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Card className="bg-slate-900/60 border border-slate-700 mt-4">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" /> Hardened n8n Sandbox
        </CardTitle>
        <CardDescription className="text-slate-400">
          Provision a locked-down n8n instance on your VPS, then manage the egress whitelist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-slate-300">Server ID</Label>
            <Input className="bg-slate-900 border-slate-700" value={serverId} onChange={(e) => setServerId(e.target.value)} placeholder="UUID of your server" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300">Public Domain (optional)</Label>
            <Input className="bg-slate-900 border-slate-700" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="n8n.example.com (requires DNS + cert)" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-slate-300">Agent IPs allowlist (comma or space separated)</Label>
            <Input className="bg-slate-900 border-slate-700" value={agentIPs} onChange={(e) => setAgentIPs(e.target.value)} placeholder="1.2.3.4, 5.6.7.8" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-slate-300">Whitelist Domains (one per line)</Label>
            <Textarea className="bg-slate-900 border-slate-700 min-h-[120px]" value={whitelistDomains} onChange={(e) => setWhitelistDomains(e.target.value)} placeholder="api.openai.com\napi.github.com" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-slate-300 text-sm">
            <input type="checkbox" className="accent-yellow-500" checked={installTimer} onChange={(e) => setInstallTimer(e.target.checked)} />
            Install hourly whitelist refresh timer (systemd)
          </label>
        </div>
        <div className="flex gap-2">
          <Button className="bg-yellow-600 hover:bg-yellow-500" onClick={provision} disabled={isBusy}>Provision Sandbox</Button>
          <Button variant="outline" className="border-blue-400 text-blue-300" onClick={refreshWhitelist} disabled={isBusy}>Refresh Whitelist</Button>
          <Button variant="outline" className="border-slate-600 text-slate-300" onClick={onClose}>Close</Button>
        </div>
        <div className="min-h-[120px] p-3 bg-slate-900 border border-slate-700 rounded text-slate-200 whitespace-pre-wrap">
          {progress || 'Progress output will appear here.'}
        </div>
        {result && (
          <div className="text-xs text-slate-400">
            API: {result.api?.baseUrl} • Data: {result.paths?.dataDir} • Whitelist file: {result.paths?.whitelistFile}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Corpus Management Panel ---
function CorpusPanel() {
  const [serverId, setServerId] = useState('')
  const [targetDir, setTargetDir] = useState('/opt/docniz_corpus')
  const [sources, setSources] = useState('')
  const [progress, setProgress] = useState('')
  const [tree, setTree] = useState('')
  const [counts, setCounts] = useState(null)
  const [isBusy, setIsBusy] = useState(false)

  const authHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const addLine = (t) => setProgress((p) => (p ? p + "\n" + t : t))

  const parseSources = () => {
    // Expect JSON array or simple newline list of git URLs
    const raw = sources.trim()
    if (!raw) return undefined
    try {
      const json = JSON.parse(raw)
      if (Array.isArray(json)) return json
    } catch (_) {}
    const lines = raw.split(/\n|,|\s+/).map(s => s.trim()).filter(Boolean)
    return lines.map((url, i) => ({ url, type: 'git', destSubdir: `src_${i}`, include: ['**/*'], exclude: ['.git/**','**/node_modules/**','**/dist/**'] }))
  }

  const stage = async () => {
    if (!serverId) return addLine('Please provide a serverId')
    setIsBusy(true); setProgress('')
    try {
      addLine('Staging learning corpus...')
      const body = { targetDir, sources: parseSources() }
      const res = await fetch(`/api/llm/vps/${encodeURIComponent(serverId)}/corpus/stage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Stage failed')
      addLine('Staged. Summary: ' + JSON.stringify(data.result?.counts || {}, null, 2))
    } catch (e) { addLine('Error: ' + (e.message || String(e))) }
    finally { setIsBusy(false) }
  }

  const analyze = async () => {
    if (!serverId) return addLine('Please provide a serverId')
    setIsBusy(true)
    try {
      addLine('Analyzing corpus...')
      const res = await fetch(`/api/llm/vps/${encodeURIComponent(serverId)}/corpus/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ targetDir })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Analyze failed')
      addLine('Analyze complete. Logs:\n' + (data.result?.logs || ''))
    } catch (e) { addLine('Error: ' + (e.message || String(e))) }
    finally { setIsBusy(false) }
  }

  const list = async () => {
    if (!serverId) return addLine('Please provide a serverId')
    setIsBusy(true)
    try {
      addLine('Listing corpus...')
      const res = await fetch(`/api/llm/vps/${encodeURIComponent(serverId)}/corpus?targetDir=${encodeURIComponent(targetDir)}`, { headers: { ...authHeaders() } })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'List failed')
      setTree(data.result?.tree || '')
      setCounts(data.result?.counts || null)
      addLine('List complete.')
    } catch (e) { addLine('Error: ' + (e.message || String(e))) }
    finally { setIsBusy(false) }
  }

  const snapshot = async () => {
    if (!serverId) return addLine('Please provide a serverId')
    setIsBusy(true)
    try {
      addLine('Creating snapshot...')
      const res = await fetch(`/api/llm/vps/${encodeURIComponent(serverId)}/corpus/snapshot`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ targetDir })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Snapshot failed')
      addLine('Snapshot created: ' + (data.result?.snapshot || ''))
    } catch (e) { addLine('Error: ' + (e.message || String(e))) }
    finally { setIsBusy(false) }
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2"><FileText className="h-5 w-5" /> Learning Corpus</CardTitle>
        <CardDescription className="text-slate-400">Stage an offline, read-only corpus on your VPS. No code execution.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-slate-300">Server ID</Label>
            <Input className="bg-slate-900 border-slate-700" value={serverId} onChange={(e) => setServerId(e.target.value)} placeholder="UUID of your server" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300">Target Dir</Label>
            <Input className="bg-slate-900 border-slate-700" value={targetDir} onChange={(e) => setTargetDir(e.target.value)} placeholder="/opt/docniz_corpus" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-slate-300">Sources (JSON array or newline URLs)</Label>
          <Textarea className="bg-slate-900 border-slate-700 min-h-[120px]" value={sources} onChange={(e) => setSources(e.target.value)} placeholder='[\n  {"url":"https://github.com/n8n-io/n8n.git","type":"git","destSubdir":"n8n/nodes","include":["packages/**/nodes/**"],"exclude":["**/dist/**","**/node_modules/**"]}\n]' />
        </div>
        <div className="flex gap-2">
          <Button className="bg-yellow-600 hover:bg-yellow-500" onClick={stage} disabled={isBusy}>Stage</Button>
          <Button variant="outline" className="border-blue-400 text-blue-300" onClick={analyze} disabled={isBusy}>Analyze</Button>
          <Button variant="outline" className="border-slate-600 text-slate-300" onClick={list} disabled={isBusy}>List</Button>
          <Button variant="outline" className="border-green-500 text-green-400" onClick={snapshot} disabled={isBusy}>Snapshot</Button>
        </div>
        <div className="min-h-[120px] p-3 bg-slate-900 border border-slate-700 rounded text-slate-200 whitespace-pre-wrap">{progress || 'Progress output will appear here.'}</div>
        {counts && (
          <div className="text-xs text-slate-400">Counts: JSON {counts.json} • Code {counts.code} • MD {counts.md} • PHP {counts.php}</div>
        )}
        {tree && (
          <div className="max-h-[260px] overflow-auto p-3 bg-slate-900 border border-slate-700 rounded text-slate-200 whitespace-pre">{tree}</div>
        )}
      </CardContent>
    </Card>
  )
}

