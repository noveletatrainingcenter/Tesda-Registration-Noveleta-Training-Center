import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FilePlus, FileText, Users, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function EncoderHome() {
  const { user } = useAuthStore();
  const { data } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/registrants/stats').then(r => r.data.stats),
  });

  const cards = [
    { label: 'Total Registrants', value: data?.total ?? '—', icon: Users, color: '#22c55e' },
    { label: 'Encoded Today', value: data?.today ?? '—', icon: TrendingUp, color: '#3b82f6' },
    { label: 'This Month', value: data?.this_month ?? '—', icon: FileText, color: '#f59e0b' },
  ];

  return (
    <div className="max-w-5xl mx-auto animate-stagger">
      <div className="mb-8">
        <h1 className="section-title text-2xl">Hello, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Ready to register new learners today?</p>
      </div>

      {/* Quick action */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card p-6 mb-6 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #000))' }}>
        <div>
          <div className="font-display font-bold text-xl text-white mb-1">Register a New Learner</div>
          <div className="text-sm text-white/70">Fill out the TESDA MIS 03-01 Form digitally</div>
        </div>
        <Link to="/encoder/register" className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all">
          <FilePlus size={16} /> New Registration
        </Link>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{c.label}</div>
                <div className="font-display font-bold text-3xl" style={{ color: 'var(--text-primary)' }}>{c.value}</div>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${c.color}20` }}>
                <c.icon size={18} style={{ color: c.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Navigation links */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { to: '/encoder/register', icon: FilePlus, label: 'New Registration', desc: 'Register a new learner/trainee', color: 'var(--accent)' },
          { to: '/encoder/reports', icon: FileText, label: 'View Records', desc: 'Browse and search all registrations', color: '#3b82f6' },
        ].map((item, i) => (
          <motion.div key={item.to} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }}>
            <Link to={item.to} className="card p-5 flex items-center gap-4 hover:border-current transition-all group block"
              style={{ borderColor: 'var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = item.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${item.color}20` }}>
                <item.icon size={22} style={{ color: item.color }} />
              </div>
              <div>
                <div className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
