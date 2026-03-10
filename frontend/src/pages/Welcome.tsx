// frontend/src/pages/Welcome.tsx
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Shield, Users, FileText, BarChart3 } from 'lucide-react';

const features = [
  { icon: Users,    label: 'Learner Registration', desc: 'Complete TESDA MIS form digitally' },
  { icon: Shield,   label: 'Role-based Access',     desc: 'Admin & Encoder access control' },
  { icon: FileText, label: 'Digital Records',       desc: 'Organized, searchable database' },
  { icon: BarChart3,label: 'Reports & Analytics',   desc: 'Insights on registrations & courses' },
];

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-bg min-h-screen relative overflow-hidden flex flex-col">
      <div className="grid-overlay absolute inset-0 pointer-events-none" />
      <div className="welcome-orb-1" />
      <div className="welcome-orb-2" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent text-white text-lg font-bold">
            T
          </div>
          <div>
            <div className="font-bold text-sm text-text-primary">TESDA</div>
            <div className="text-xs text-text-muted">Noveleta Training Center</div>
          </div>
        </motion.div>
        <motion.button initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          onClick={() => navigate('/login')} className="btn-ghost text-sm">
          Sign In <ChevronRight size={14} />
        </motion.button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-12">

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6 bg-accent-light text-accent-text border border-accent/30">
            <span className="w-2 h-2 rounded-full bg-accent animate-[pulse_2s_infinite]" />
            MIS Form Digital Registration System
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
          className="font-extrabold leading-[1.1] mb-6 text-text-primary max-w-[800px] [font-size:clamp(2.5rem,6vw,4.5rem)]"
        >
          TESDA Learner<br />
          <span className="text-accent">Registration</span> System
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }}
          className="text-lg mb-10 max-w-lg text-text-secondary leading-relaxed"
        >
          Streamlined digital enrollment for Noveleta Training Center. Fast, organized, and always accessible.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="flex flex-wrap gap-4 justify-center">
          <button onClick={() => navigate('/login')} className="btn-primary text-base px-8 py-3">
            Get Started <ChevronRight size={16} />
          </button>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 w-full max-w-3xl"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + i * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="card p-5 text-left cursor-default"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-accent-light">
                <f.icon size={18} className="text-accent" />
              </div>
              <div className="font-semibold text-sm mb-1 text-text-primary">{f.label}</div>
              <div className="text-xs text-text-muted leading-relaxed">{f.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </main>

      <footer className="relative z-10 text-xs text-text-muted text-center py-6">
        Technical Education and Skills Development Authority — Noveleta Training Center
      </footer>
    </div>
  );
}