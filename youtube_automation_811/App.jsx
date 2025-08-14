import { useState, useEffect } from 'react'
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
          <TabsList className="grid w-full grid-cols-5 bg-slate-800 border border-slate-700">
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

export default App

