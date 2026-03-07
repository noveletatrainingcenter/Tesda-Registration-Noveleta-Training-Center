// frontend/src/pages/admin/Home.tsx
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, UserPlus, Calendar, TrendingUp, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie } from 'recharts';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AdminHome() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/registrants/stats').then(r => r.data.stats),
  });

  const statCards = [
    { label: 'Total Registrants', value: data?.total ?? '—', icon: Users, color: '#22c55e' },
    { label: 'Registered Today', value: data?.today ?? '—', icon: UserPlus, color: '#3b82f6' },
    { label: 'This Month', value: data?.this_month ?? '—', icon: Calendar, color: '#f59e0b' },
    { label: 'Active Courses', value: data?.by_course?.length ?? '—', icon: BookOpen, color: '#8b5cf6' },
  ];

  const monthlyData = (data?.monthly || []).map((m: any) => ({
    name: MONTHS[m.month - 1],
    count: m.count,
  }));

  return (
    <div className="animate-stagger max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="section-title text-2xl">Good day, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Here's what's happening at Noveleta Training Center.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                <div className="font-display font-bold text-3xl" style={{ color: 'var(--text-primary)' }}>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly registrations */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
            <span className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Monthly Registrations</span>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barSize={32}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No data available yet
            </div>
          )}
        </motion.div>

        {/* By course pie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen size={18} style={{ color: 'var(--accent)' }} />
            <span className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>By Course</span>
          </div>
          {data?.by_course?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.by_course.map((entry: any, i: number) => ({ ...entry, fill: COLORS[i % COLORS.length] }))}
                  dataKey="count"
                  nameKey="course"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ percent }) => percent !== undefined ? `${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false}
                />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No data available yet
            </div>
          )}
          {data?.by_course?.slice(0, 4).map((c: any, i: number) => (
            <div key={c.course} className="flex items-center justify-between text-xs py-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="truncate max-w-[140px]" style={{ color: 'var(--text-secondary)' }}>{c.course || 'Not specified'}</span>
              </div>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{c.count}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
