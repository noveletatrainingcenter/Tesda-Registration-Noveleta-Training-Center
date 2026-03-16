// frontend/src/pages/admin/Home.tsx
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, UserPlus, Calendar, TrendingUp, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AdminHome() {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/registrations/stats').then(r => r.data.stats),
  });

  const tooltipBg     = theme === 'dark' ? '#1a2133' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#1e2d3d' : '#e2e8f0';
  const tooltipColor  = theme === 'dark' ? '#f0f6ff' : '#0f172a';

  const tooltipStyle = {
    background:   tooltipBg,
    border:       `1px solid ${tooltipBorder}`,
    borderRadius: 10,
    fontSize:     12,
    color:        tooltipColor,
  };

  const statCards = [
    { label: 'Total Registrations', value: data?.total ?? '—',             icon: Users,    color: '#22c55e' },
    { label: 'Registered Today',    value: data?.today ?? '—',             icon: UserPlus, color: '#3b82f6' },
    { label: 'This Month',          value: data?.this_month ?? '—',        icon: Calendar, color: '#f59e0b' },
    { label: 'Active Courses',      value: data?.by_course?.length ?? '—', icon: BookOpen, color: '#8b5cf6' },
  ];

  const monthlyData = (data?.monthly || []).map((m: any) => ({
    name: MONTHS[m.month - 1],
    count: m.count,
  }));

  const accentColor = theme === 'dark' ? '#22c55e' : '#16a34a';
  const cursorFill  = theme === 'dark' ? 'rgba(34,197,94,0.08)' : 'rgba(22,163,74,0.08)';
  const tickColor   = theme === 'dark' ? '#4a5a7a' : '#94a3b8';

  // Calculate exact pie chart height: chart + legend rows
  const courseCount   = data?.by_course?.length ?? 0;
  const legendRows    = Math.min(courseCount, 4);
  const legendHeight  = legendRows * 32; // 32px per row (py-1.5 + text)
  const pieChartHeight = 200;

  return (
    <div className="animate-stagger max-w-7xl mx-auto">

      <div className="mb-8">
        <h1 className="section-title">Good day, {user?.full_name} 👋</h1>
        <p className="text-sm mt-1 text-text-muted">Here's what's happening at Noveleta Training Center.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="label mb-1">{s.label}</div>
                <div className="font-bold text-3xl text-text-primary">
                  {isLoading ? <span className="animate-pulse">...</span> : s.value}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${s.color}20` }}>
                <s.icon size={20} style={{ color: s.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">

        {/* Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }} className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-accent" />
            <span className="font-semibold text-text-primary">Monthly Registrations</span>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={monthlyData}
                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                style={{ background: 'transparent' }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: tickColor }}
                  axisLine={false}
                  tickLine={false}
                  padding={{ left: 20, right: 20 }}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => Math.max(dataMax + 1, 4)]}
                  tick={{ fontSize: 12, fill: tickColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: cursorFill }}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: tooltipColor, fontWeight: 600 }}
                  itemStyle={{ color: accentColor }}
                />
                <Bar dataKey="count" fill={accentColor} radius={[6, 6, 0, 0]} maxBarSize={56} background={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-text-muted">
              No data available yet
            </div>
          )}
        </motion.div>

        {/* Pie Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }} className="card p-6 flex flex-col lg:self-start">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-accent" />
            <span className="font-semibold text-text-primary">By Course</span>
          </div>

          {data?.by_course?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={pieChartHeight}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={data.by_course}
                    dataKey="count"
                    nameKey="course"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={({ percent }) =>
                      percent !== undefined && percent < 0.999
                        ? `${(percent * 100).toFixed(0)}%`
                        : ''
                    }
                    labelLine={false}
                  >
                    {data.by_course.map((_: any, i: number) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: tooltipColor, fontWeight: 600 }}
                    itemStyle={{ color: tooltipColor }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend — sits flush below chart, no gap */}
              <div className="mt-3 flex flex-col gap-0.5">
                {data.by_course.slice(0, 4).map((c: any, i: number) => (
                  <div key={c.course} className="flex items-center justify-between text-xs py-1.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-text-secondary leading-snug truncate">
                        {c.course || 'Not specified'}
                      </span>
                    </div>
                    <span className="font-semibold text-text-primary shrink-0 ml-2">{c.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-text-muted min-h-[220px]">
              No data available yet
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}