// frontend/src/pages/shared/Home.tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  FilePlus, FileText, Users, TrendingUp, UserPlus, Calendar, 
  BookOpen, Users as UsersIcon, Briefcase, 
  PieChart as PieChartIcon, BarChart3, Download, Clock,
  UserCheck, UserX, Award, Loader2, ArrowUp,
  ArrowDown, Minus, Eye, EyeOff, ChevronRight, GraduationCap,
  CalendarRange, ChevronDown, Filter, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, CartesianGrid,
  AreaChart, Area
} from 'recharts';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Date range options
const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisQuarter', label: 'This Quarter' },
  { value: 'lastQuarter', label: 'Last Quarter' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

// Types
interface Stats {
  total: number;
  today: number;
  this_month: number;
  by_course: Array<{ course: string; count: number }>;
  monthly: Array<{ month: number; year: number; count: number }>;
  growth_rate?: number;
}

interface EmploymentStats {
  employed: number;
  unemployed: number;
  self_employed: number;
  underemployed: number;
  total_employed: number;
  employment_rate: number;
}

interface TimelineData {
  month: string;
  registrations: number;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  admins: number;
  encoders: number;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  label: string;
}

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ForwardRefExoticComponent<any>;
  color: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

export default function Home() {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isAdmin = user?.role === 'admin';
  const [exporting, setExporting] = useState(false);
  const [showCharts, setShowCharts] = useState(true);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [monthlyViewMode, setMonthlyViewMode] = useState<'total' | 'course'>('total');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  
  // Date range state
  const [dateRangeType, setDateRangeType] = useState<string>('last30days');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  // Calculate date range based on selection
  const dateRange = useMemo((): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRangeType) {
      case 'today':
        return {
          startDate: today,
          endDate: today,
          label: 'Today'
        };
      
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          startDate: yesterday,
          endDate: yesterday,
          label: 'Yesterday'
        };
      }
      
      case 'last7days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 7);
        return {
          startDate: start,
          endDate: today,
          label: 'Last 7 Days'
        };
      }
      
      case 'last30days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 30);
        return {
          startDate: start,
          endDate: today,
          label: 'Last 30 Days'
        };
      }
      
      case 'thisMonth': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          startDate: start,
          endDate: today,
          label: 'This Month'
        };
      }
      
      case 'lastMonth': {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          startDate: start,
          endDate: end,
          label: 'Last Month'
        };
      }
      
      case 'thisQuarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        const start = new Date(today.getFullYear(), quarter * 3, 1);
        return {
          startDate: start,
          endDate: today,
          label: 'This Quarter'
        };
      }
      
      case 'lastQuarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        const start = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
        const end = new Date(today.getFullYear(), quarter * 3, 0);
        return {
          startDate: start,
          endDate: end,
          label: 'Last Quarter'
        };
      }
      
      case 'thisYear': {
        const start = new Date(today.getFullYear(), 0, 1);
        return {
          startDate: start,
          endDate: today,
          label: 'This Year'
        };
      }
      
      case 'lastYear': {
        const start = new Date(today.getFullYear() - 1, 0, 1);
        const end = new Date(today.getFullYear() - 1, 11, 31);
        return {
          startDate: start,
          endDate: end,
          label: 'Last Year'
        };
      }
      
      case 'custom':
        return {
          startDate: customStartDate,
          endDate: customEndDate,
          label: 'Custom Range'
        };
      
      default:
        return {
          startDate: null,
          endDate: null,
          label: 'All Time'
        };
    }
  }, [dateRangeType, customStartDate, customEndDate]);

  // Format dates for API
  const dateFrom = dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : undefined;
  const dateTo = dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : undefined;

  // Main stats query with date filtering
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<Stats>({
    queryKey: ['stats', dateFrom, dateTo],
    queryFn: () => api.get('/registrations/stats', {
      params: { date_from: dateFrom, date_to: dateTo }
    }).then(r => r.data.stats),
  });

  // Employment stats with date filtering
  const { data: employmentStats, isLoading: employmentLoading } = useQuery<EmploymentStats>({
    queryKey: ['employment-stats', dateFrom, dateTo],
    queryFn: () => api.get('/registrations/employment-stats', {
      params: { date_from: dateFrom, date_to: dateTo }
    }).then(r => r.data),
    enabled: isAdmin,
  });

  // Timeline with date filtering
  const { data: timelineData, isLoading: timelineLoading } = useQuery<TimelineData[]>({
    queryKey: ['timeline', dateFrom, dateTo],
    queryFn: () => api.get('/registrations/timeline', { 
      params: { date_from: dateFrom, date_to: dateTo }
    }).then(r => r.data),
    enabled: isAdmin,
  });

  // User stats (no date filtering needed)
  const { data: userStats, isLoading: userStatsLoading } = useQuery<UserStats>({
    queryKey: ['user-stats'],
    queryFn: () => api.get('/admin/users/stats').then(r => r.data),
    enabled: isAdmin,
  });

  // Theme-aware styling
  const tooltipBg = theme === 'dark' ? '#1a2133' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#1e2d3d' : '#e2e8f0';
  const tooltipColor = theme === 'dark' ? '#f0f6ff' : '#0f172a';
  const gridColor = theme === 'dark' ? '#1e2d3d' : '#e2e8f0';

  const tooltipStyle = {
    background: tooltipBg,
    border: `1px solid ${tooltipBorder}`,
    borderRadius: 10,
    fontSize: 12,
    color: tooltipColor,
    padding: '8px 12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  };

  // Prepare chart data
  const monthlyData = (stats?.monthly || []).map((m: any) => ({
    name: MONTHS[m.month - 1],
    count: m.count,
    fullDate: `${MONTHS[m.month - 1]} ${m.year}`,
  }));

  // Employment data for chart
  const employmentData = employmentStats ? [
    { name: 'Wage-Employed', value: employmentStats.employed, color: '#22c55e', icon: '💼' },
    { name: 'Self-Employed', value: employmentStats.self_employed, color: '#8b5cf6', icon: '🏢' },
    { name: 'Underemployed', value: employmentStats.underemployed, color: '#f59e0b', icon: '⚠️' },
    { name: 'Unemployed', value: employmentStats.unemployed, color: '#ef4444', icon: '🔍' },
  ].filter(item => item.value > 0) : [];

  // Course data
  const courseData = stats?.by_course || [];

  // Calculate percentages
  const calculatePercentage = (value: number, total: number) => 
    total > 0 ? ((value / total) * 100).toFixed(1) : '0';

  const totalRegistrations = stats?.total || 0;

  // Format date range display
  const formatDateRange = () => {
    if (dateRangeType === 'custom' && customStartDate && customEndDate) {
      return `${customStartDate.toLocaleDateString()} - ${customEndDate.toLocaleDateString()}`;
    }
    return dateRange.label;
  };

  // Clear custom date range
  const clearCustomRange = () => {
    setCustomStartDate(null);
    setCustomEndDate(null);
    setDateRangeType('last30days');
  };

  // Handle date change with proper typing
  const handleStartDateChange = (date: Date | null) => {
    setCustomStartDate(date);
  };

  const handleEndDateChange = (date: Date | null) => {
    setCustomEndDate(date);
  };

  // Admin stat cards
  const adminStatCards: StatCard[] = [
    { 
      label: 'Total Registrations', 
      value: stats?.total ?? '—', 
      icon: UsersIcon, 
      color: '#22c55e',
      trend: stats?.growth_rate ? { 
        value: stats.growth_rate, 
        direction: stats.growth_rate > 0 ? 'up' : stats.growth_rate < 0 ? 'down' : 'neutral' 
      } : undefined
    },
    { 
      label: 'Registered Today', 
      value: stats?.today ?? '—', 
      icon: UserPlus,  
      color: '#3b82f6' 
    },
    { 
      label: 'This Month', 
      value: stats?.this_month ?? '—', 
      icon: Calendar,  
      color: '#f59e0b' 
    },
    { 
      label: 'Active Courses', 
      value: courseData.length ?? '—', 
      icon: GraduationCap,  
      color: '#8b5cf6' 
    },
  ];

  // User stats cards
  const userStatCards: StatCard[] = userStats ? [
    { label: 'Total Users', value: userStats.total, icon: Users, color: '#3b82f6' },
    { label: 'Active Users', value: userStats.active, icon: UserCheck, color: '#22c55e' },
    { label: 'Inactive Users', value: userStats.inactive, icon: UserX, color: '#94a3b8' },
    { label: 'Admins', value: userStats.admins, icon: UsersIcon, color: '#8b5cf6' },
    { label: 'Encoders', value: userStats.encoders, icon: UsersIcon, color: '#f59e0b' },
  ] : [];

  // Encoder stat cards
  const encoderStatCards: StatCard[] = [
    { label: 'Total Registrations', value: stats?.total ?? '—', icon: UsersIcon, color: '#22c55e' },
    { label: 'Encoded Today', value: stats?.today ?? '—', icon: TrendingUp, color: '#3b82f6' },
    { label: 'This Month', value: stats?.this_month ?? '—', icon: FileText, color: '#f59e0b' },
  ];

  // Navigation links
  const encoderNavLinks = [
    { to: '/encoder/register', icon: FilePlus, label: 'New Registration', desc: 'Register a new learner/trainee', color: '#22c55e' },
    { to: '/encoder/applicants', icon: UsersIcon, label: 'View Applicants', desc: 'Browse and search all registrations', color: '#3b82f6' },
    { to: '/encoder/reports', icon: FileText, label: 'Reports', desc: 'Generate training reports', color: '#8b5cf6' },
  ];

  const adminNavLinks = [
    { to: '/admin/applicants', icon: UsersIcon, label: 'Manage Applicants', desc: 'View and manage all registrations', color: '#22c55e' },
    { to: '/admin/reports', icon: FileText, label: 'Reports', desc: 'Generate and manage reports', color: '#3b82f6' },
    { to: '/admin/users', icon: Users, label: 'User Management', desc: 'Manage system users', color: '#8b5cf6' },
    { to: '/admin/audit', icon: Clock, label: 'Audit Trail', desc: 'View system activity logs', color: '#f59e0b' },
  ];

  const navLinks = isAdmin ? adminNavLinks : encoderNavLinks;
  const statCards = isAdmin ? adminStatCards : encoderStatCards;
  const greeting = isAdmin ? 'Good day' : 'Hello';

  // Export analytics to Excel
  const handleExportAnalytics = async () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      
      // Overview sheet
      const overviewData = [
        ['NOVELETA TRAINING CENTER - ANALYTICS REPORT'],
        [`Generated on: ${new Date().toLocaleString('en-PH')}`],
        [`Date Range: ${formatDateRange()}`],
        [],
        ['OVERVIEW STATISTICS'],
        ['Metric', 'Value'],
        ['Total Registrations', stats?.total || 0],
        ['Registered Today', stats?.today || 0],
        ['This Month', stats?.this_month || 0],
        ['Active Courses', courseData.length || 0],
        [],
        ['EMPLOYMENT STATUS'],
        ['Status', 'Count', 'Percentage'],
        ['Wage-Employed', employmentStats?.employed || 0, 
          `${calculatePercentage(employmentStats?.employed || 0, stats?.total || 0)}%`],
        ['Self-Employed', employmentStats?.self_employed || 0,
          `${calculatePercentage(employmentStats?.self_employed || 0, stats?.total || 0)}%`],
        ['Underemployed', employmentStats?.underemployed || 0,
          `${calculatePercentage(employmentStats?.underemployed || 0, stats?.total || 0)}%`],
        ['Unemployed', employmentStats?.unemployed || 0,
          `${calculatePercentage(employmentStats?.unemployed || 0, stats?.total || 0)}%`],
        [],
        ['COURSE DISTRIBUTION'],
        ['Course', 'Count', 'Percentage'],
        ...courseData.map(c => [
          c.course || 'Not Specified', 
          c.count, 
          `${calculatePercentage(c.count, stats?.total || 0)}%`
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, ws, 'Overview');

      XLSX.writeFile(wb, `TESDA_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Analytics exported successfully!');
    } catch (error) {
      toast.error('Failed to export analytics');
    } finally {
      setExporting(false);
    }
  };

  // Render trend indicator
  const renderTrend = (trend?: { value: number; direction: 'up' | 'down' | 'neutral' }) => {
    if (!trend) return null;
    
    const Icon = trend.direction === 'up' ? ArrowUp : trend.direction === 'down' ? ArrowDown : Minus;
    const color = trend.direction === 'up' ? 'text-green-500' : trend.direction === 'down' ? 'text-red-500' : 'text-yellow-500';
    
    return (
      <div className={`flex items-center gap-1 text-xs ${color} mt-1`}>
        <Icon size={12} />
        <span>{Math.abs(trend.value)}% vs last month</span>
      </div>
    );
  };

    return (
    <div className={clsx(
        'animate-stagger mx-auto px-4 py-6',
        isAdmin ? 'max-w-7xl' : 'max-w-5xl'
    )}>
        {/* Header with gradient background */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-accent/20 to-accent/5 p-8"
        >
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
            <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
                {greeting}, {user?.full_name} 👋
            </h1>
            <p className="text-text-secondary">
                {isAdmin 
                ? "Here's what's happening at Noveleta Training Center."
                : "Ready to register new learners today?"}
            </p>
            </div>
            {isAdmin && (
            <div className="flex items-center gap-3">
                <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={clsx(
                    'btn-ghost text-sm h-10 px-4 flex items-center gap-2',
                    showDateFilter && 'border-accent text-accent'
                )}
                >
                <CalendarRange size={14} />
                <span className="hidden sm:inline">Date Range</span>
                <ChevronDown size={14} className={clsx('transition-transform', showDateFilter && 'rotate-180')} />
                </button>
                <button
                onClick={() => setShowCharts(!showCharts)}
                className="btn-ghost text-sm h-10 px-4 flex items-center gap-2"
                title={showCharts ? 'Hide charts' : 'Show charts'}
                >
                {showCharts ? <EyeOff size={14} /> : <Eye size={14} />}
                <span className="hidden sm:inline">{showCharts ? 'Hide' : 'Show'}</span>
                </button>
                {/* <button
                onClick={handleExportAnalytics}
                disabled={exporting}
                className="btn-primary text-sm h-10 px-4 flex items-center gap-2"
                >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export'}</span>
                </button> */}
            </div>
            )}
        </div>
        </motion.div>

        {/* Date Range Filter - MOVED OUTSIDE gradient div */}
        {isAdmin && showDateFilter && (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 -mt-4 relative z-20"
        >
            <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
            <div className="space-y-4">
                {/* Filter label and preset buttons */}
                <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-text-secondary shrink-0">
                    <Filter size={14} />
                    <span className="font-medium">Filter by date:</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {DATE_RANGE_OPTIONS.filter(opt => opt.value !== 'custom').map(option => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => setDateRangeType(option.value)}
                        className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                        dateRangeType === option.value
                            ? 'bg-accent text-white shadow-lg'
                            : 'bg-bg-input text-text-secondary hover:text-text-primary hover:bg-bg-input/80'
                        )}
                    >
                        {option.label}
                    </button>
                    ))}
                </div>
                </div>

                {/* Custom Range Section */}
                <div className="flex flex-wrap items-center gap-4">
                <button
                    type="button"
                    onClick={() => setDateRangeType('custom')}
                    className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                    dateRangeType === 'custom'
                        ? 'bg-accent text-white shadow-lg'
                        : 'bg-bg-input text-text-secondary hover:text-text-primary hover:bg-bg-input/80'
                    )}
                >
                    Custom Range
                </button>

                {dateRangeType === 'custom' && (
                    <div className="flex items-center gap-3 bg-bg-input/50 p-2 rounded-lg">
                    <DatePicker
                        selected={customStartDate}
                        onChange={handleStartDateChange}
                        selectsStart
                        startDate={customStartDate}
                        endDate={customEndDate}
                        placeholderText="Start Date"
                        className="input-base text-sm w-28 lg:w-32 cursor-pointer"
                        dateFormat="MM/dd/yyyy"
                    />
                    <span className="text-text-muted text-sm">—</span>
                    <DatePicker
                        selected={customEndDate}
                        onChange={handleEndDateChange}
                        selectsEnd
                        startDate={customStartDate}
                        endDate={customEndDate}
                        minDate={customStartDate || undefined}
                        placeholderText="End Date"
                        className="input-base text-sm w-28 lg:w-32 cursor-pointer"
                        dateFormat="MM/dd/yyyy"
                    />
                    {(customStartDate || customEndDate) && (
                        <button
                        onClick={clearCustomRange}
                        className="p-1.5 rounded-lg hover:bg-bg-input text-text-muted hover:text-text-primary cursor-pointer"
                        type="button"
                        title="Clear custom range"
                        >
                        <X size={14} />
                        </button>
                    )}
                    </div>
                )}

                {/* Selected range display */}
                <div className="text-sm text-text-secondary bg-accent/10 px-3 py-1.5 rounded-lg ml-auto">
                    <span className="font-medium text-accent">{formatDateRange()}</span>
                </div>
                </div>
            </div>
            </div>
        </motion.div>
        )}

        {/* Quick action CTA - Only for encoder */}
        {!isAdmin && (
        <motion.div
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent/70 p-6"
        >
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="relative flex items-center justify-between">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Register a New Learner</h2>
                <p className="text-white/80 text-sm">Fill out the TESDA MIS 03-01 Form digitally</p>
            </div>
            <Link
                to="/encoder/register"
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-accent bg-white hover:bg-white/90 transition-all shadow-lg hover:shadow-xl"
            >
                <FilePlus size={16} /> New Registration <ChevronRight size={16} />
            </Link>
            </div>
        </motion.div>
        )}

        {/* Main Stats Cards */}
        <div className={clsx(
        'grid gap-4 mb-8',
        isAdmin ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3'
        )}>
        {statCards.map((s, i) => (
            <motion.div 
            key={s.label} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }} 
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-card to-card/50 p-6 border border-border hover:border-accent/50 transition-all duration-300 hover:shadow-lg"
            >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-start justify-between">
                <div>
                <p className="text-sm font-medium text-text-muted mb-2">{s.label}</p>
                <p className="text-3xl font-bold text-text-primary">
                    {statsLoading ? <span className="animate-pulse">...</span> : s.value}
                </p>
                {renderTrend(s.trend)}
                </div>
                <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3"
                style={{ background: `${s.color}20` }}
                >
                <s.icon size={24} style={{ color: s.color }} />
                </div>
            </div>
            </motion.div>
        ))}
        </div>

        {/* User Statistics - Admin Only */}
        {isAdmin && userStats && showCharts && (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 rounded-xl bg-gradient-to-br from-card to-card/50 p-6 border border-border"
        >
            <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
                <Users size={20} className="text-accent" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">User Statistics</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {userStatCards.map((s) => (
                <div key={s.label} className="text-center group">
                <div className="relative mb-3 inline-block">
                    <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 group-hover:rotate-3"
                    style={{ background: `${s.color}20` }}
                    >
                    <s.icon size={24} style={{ color: s.color }} />
                    </div>
                </div>
                <div className="text-2xl font-bold text-text-primary">
                    {userStatsLoading ? '...' : s.value}
                </div>
                <div className="text-xs text-text-muted mt-1">{s.label}</div>
                </div>
            ))}
            </div>
        </motion.div>
        )}

        {/* Charts Section - Admin Only */}
        {isAdmin && showCharts && (
          <div className="space-y-6">
            {/* First row: Employment Outcomes and Course Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Employment Outcomes Chart */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }} 
                className="rounded-xl bg-gradient-to-br from-card to-card/50 p-6 border border-border"
            >
                <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                    <Briefcase size={20} className="text-accent" />
                    </div>
                    <h3 className="font-semibold text-text-primary">Employment Status</h3>
                </div>
                {employmentStats && (
                    <div className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
                    {employmentStats.employment_rate}% Employed
                    </div>
                )}
                </div>
                
                {employmentLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-accent" />
                </div>
                ) : employmentData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Chart */}
                    <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                        <Pie
                            data={employmentData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            label={({ name, percent }) => 
                            percent && percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                            }
                            labelLine={false}
                        >
                            {employmentData.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                    </ResponsiveContainer>
                    </div>
                    
                    {/* Legend */}
                    <div className="space-y-3">
                    {employmentData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-bg-input/50">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                            <span className="text-sm text-text-secondary">{item.name}</span>
                        </div>
                        <div className="text-right">
                            <span className="font-semibold text-text-primary">{item.value}</span>
                            <span className="text-xs text-text-muted ml-2">
                            ({calculatePercentage(item.value, totalRegistrations)}%)
                            </span>
                        </div>
                        </div>
                    ))}
                    </div>
                </div>
                ) : (
                <div className="h-[300px] flex items-center justify-center text-text-muted">
                    No employment data available
                </div>
                )}
            </motion.div>

            {/* Course Distribution Chart */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }} 
                className="rounded-xl bg-gradient-to-br from-card to-card/50 p-6 border border-border"
            >
                <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-accent/10">
                    <GraduationCap size={20} className="text-accent" />
                </div>
                <h3 className="font-semibold text-text-primary">Course Distribution</h3>
                </div>
                
                {courseData.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {courseData
                    .sort((a, b) => b.count - a.count)
                    .map((item, i) => {
                        const percentage = calculatePercentage(item.count, totalRegistrations);
                        return (
                        <div key={item.course} className="group hover:bg-bg-input/50 p-2 rounded-lg transition-colors">
                            <div className="flex justify-between text-sm mb-1">
                            <span className="text-text-secondary truncate max-w-[200px]" title={item.course}>
                                {item.course || 'Not Specified'}
                            </span>
                            <span className="font-medium text-text-primary">
                                {item.count} ({percentage}%)
                            </span>
                            </div>
                            <div className="h-2 rounded-full bg-bg-input overflow-hidden">
                            <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                width: `${percentage}%`,
                                backgroundColor: COLORS[i % COLORS.length]
                                }}
                            />
                            </div>
                        </div>
                        );
                    })}
                </div>
                ) : (
                <div className="h-[300px] flex items-center justify-center text-text-muted">
                    No course data available
                </div>
                )}
            </motion.div>
            </div>

            {/* Second row: Monthly Registrations Timeline */}
            <div className="grid grid-cols-1 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }} 
                className="rounded-xl bg-gradient-to-br from-card to-card/50 p-6 border border-border"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <BarChart3 size={20} className="text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">Monthly Registrations</h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        {monthlyViewMode === 'total'
                          ? 'Total applicants registered per month'
                          : selectedCourseFilter === 'all'
                            ? 'Applicants per course per month'
                            : `Applicants for "${selectedCourseFilter}" per month`}
                      </p>
                    </div>
                  </div>

                  {/* Toggle + Course selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* View toggle */}
                    <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
                      <button
                        onClick={() => setMonthlyViewMode('total')}
                        className={clsx(
                          'px-3 py-1.5 transition-all',
                          monthlyViewMode === 'total'
                            ? 'bg-accent text-white'
                            : 'bg-bg-input text-text-secondary hover:text-text-primary'
                        )}
                      >
                        All Applicants
                      </button>
                      <button
                        onClick={() => setMonthlyViewMode('course')}
                        className={clsx(
                          'px-3 py-1.5 transition-all border-l border-border',
                          monthlyViewMode === 'course'
                            ? 'bg-accent text-white'
                            : 'bg-bg-input text-text-secondary hover:text-text-primary'
                        )}
                      >
                        By Course
                      </button>
                    </div>

                    {/* Course filter dropdown — only when "By Course" */}
                    {monthlyViewMode === 'course' && courseData.length > 0 && (
                      <select
                        value={selectedCourseFilter}
                        onChange={e => setSelectedCourseFilter(e.target.value)}
                        className="h-8 px-2 rounded-lg border border-border bg-bg-input text-text-primary text-xs focus:border-accent outline-none transition-all"
                      >
                        <option value="all">All Courses</option>
                        {courseData.map((c: any) => (
                          <option key={c.course} value={c.course}>
                            {c.course || 'Not Specified'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Chart: All Applicants (total monthly) */}
                {monthlyViewMode === 'total' && (
                  monthlyData.length > 0 ? (
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#22c55e" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#16a34a" stopOpacity={0.8}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                          <XAxis dataKey="name" stroke={gridColor} tick={{ fill: tooltipColor, fontSize: 12 }} axisLine={{ stroke: gridColor }} />
                          <YAxis stroke={gridColor} tick={{ fill: tooltipColor, fontSize: 12 }} axisLine={{ stroke: gridColor }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            cursor={{ fill: 'rgba(34,197,94,0.1)' }}
                            formatter={(value: any) => [value, 'Applicants']}
                            labelFormatter={(label) => `Month: ${label}`}
                          />
                          <Bar dataKey="count" fill="url(#barGradient)" radius={[8, 8, 0, 0]} barSize={50} animationDuration={1500} animationEasing="ease-in-out" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-text-muted">
                      No registration data available
                    </div>
                  )
                )}

                {/* Chart: By Course */}
                {monthlyViewMode === 'course' && (() => {
                  // Filter courses to show
                  const coursesToShow = selectedCourseFilter === 'all'
                    ? courseData.slice(0, 6).map((c: any) => c.course) // cap at 6 for readability
                    : [selectedCourseFilter];

                  // Build per-month data keyed by month label
                  const monthMap: Record<string, Record<string, number>> = {};
                  monthlyData.forEach(m => { monthMap[m.name] = {}; });

                  // Use courseData counts spread evenly per month as approximation
                  // (real per-course-per-month needs a new backend endpoint)
                  // For now we show the course distribution scaled to monthly totals
                  const perCourseMonthly = monthlyData.map(m => {
                    const row: any = { name: m.name };
                    const monthTotal = m.count;
                    const grandTotal = totalRegistrations || 1;
                    coursesToShow.forEach((course: string) => {
                      const courseCount = courseData.find((c: any) => c.course === course)?.count || 0;
                      // proportional estimate per month
                      row[course] = Math.round((courseCount / grandTotal) * monthTotal);
                    });
                    return row;
                  });

                  return perCourseMonthly.length > 0 ? (
                    <div>
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={perCourseMonthly} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                            <XAxis dataKey="name" stroke={gridColor} tick={{ fill: tooltipColor, fontSize: 12 }} axisLine={{ stroke: gridColor }} />
                            <YAxis stroke={gridColor} tick={{ fill: tooltipColor, fontSize: 12 }} axisLine={{ stroke: gridColor }} allowDecimals={false} />
                            <Tooltip
                              contentStyle={tooltipStyle}
                              cursor={{ fill: 'rgba(34,197,94,0.05)' }}
                              formatter={(value: any, name: string | undefined) => [value, name ?? '']}
                              labelFormatter={(label) => `Month: ${label}`}
                            />
                            {coursesToShow.map((course: string, i: number) => (
                              <Bar
                                key={course}
                                dataKey={course}
                                fill={COLORS[i % COLORS.length]}
                                radius={[4, 4, 0, 0]}
                                barSize={selectedCourseFilter === 'all' ? 14 : 50}
                                animationDuration={1200}
                                animationEasing="ease-in-out"
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Course legend */}
                      <div className="flex flex-wrap gap-3 mt-4">
                        {coursesToShow.map((course: string, i: number) => (
                          <div key={course} className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="truncate max-w-[160px]" title={course}>{course || 'Not Specified'}</span>
                          </div>
                        ))}
                        {selectedCourseFilter === 'all' && courseData.length > 6 && (
                          <span className="text-xs text-text-muted italic">+{courseData.length - 6} more (select a specific course to view)</span>
                        )}
                      </div>
                      {selectedCourseFilter === 'all' && (
                        <p className="text-xs text-text-muted mt-2 italic">
                          * Per-course monthly values are proportionally estimated. Select a specific course for focused view.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-text-muted">
                      No course data available
                    </div>
                  );
                })()}
              </motion.div>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className={clsx(
        'grid gap-4 mt-8',
        isAdmin ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'
        )}>
        {navLinks.map((item, i) => (
            <motion.div
            key={item.to}
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            >
            <Link
                to={item.to}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-card to-card/50 p-6 border border-border hover:border-accent transition-all duration-300 hover:shadow-lg block"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex flex-col items-center text-center">
                <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3"
                    style={{ background: `${item.color}20` }}
                >
                    <item.icon size={28} style={{ color: item.color }} />
                </div>
                <h4 className="font-semibold text-text-primary mb-1">{item.label}</h4>
                <p className="text-xs text-text-muted">{item.desc}</p>
                </div>
            </Link>
            </motion.div>
        ))}
        </div>

        {/* Add CSS for grid pattern and datepicker */}
        <style>{`
        .bg-grid-pattern {
            background-image: 
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 20px 20px;
        }
        .react-datepicker {
            font-family: 'DM Sans', sans-serif !important;
            border-color: var(--border) !important;
            background-color: var(--bg-card) !important;
        }
        .react-datepicker__header {
            background-color: var(--bg-input) !important;
            border-bottom-color: var(--border) !important;
        }
        .react-datepicker__current-month,
        .react-datepicker__day-name {
            color: var(--text-primary) !important;
        }
        .react-datepicker__day {
            color: var(--text-secondary) !important;
        }
        .react-datepicker__day:hover {
            background-color: var(--accent) !important;
            color: white !important;
        }
        .react-datepicker__day--selected,
        .react-datepicker__day--in-range {
            background-color: var(--accent) !important;
            color: white !important;
        }
        .react-datepicker__day--in-selecting-range {
            background-color: var(--accent-light) !important;
            color: var(--text-primary) !important;
        }
        `}</style>
    </div>
    );
}