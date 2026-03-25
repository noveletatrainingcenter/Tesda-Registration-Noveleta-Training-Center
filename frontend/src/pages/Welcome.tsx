// frontend/src/pages/Welcome.tsx
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Shield, Users, FileText, BarChart3 } from 'lucide-react';

const features = [
  { icon: Users,     label: 'Learner Registration', desc: 'Complete TESDA MIS form digitally'      },
  { icon: Shield,    label: 'Role-based Access',     desc: 'Admin & Encoder access control'         },
  { icon: FileText,  label: 'Digital Records',       desc: 'Organized, searchable database'         },
  { icon: BarChart3, label: 'Reports & Analytics',   desc: 'Insights on registrations & courses'   },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.9 } },
};

const cardVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },  // ← after
};

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-bg min-h-screen relative overflow-hidden flex flex-col">
      {/* Grid + orbs */}
      <div className="grid-overlay absolute inset-0 pointer-events-none" />
      <div className="welcome-orb-1" />
      <div className="welcome-orb-2" />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent text-white font-bold text-base select-none">
            T
          </div>
          <div className="leading-tight">
            <p className="font-bold text-sm text-text-primary">TESDA</p>
            <p className="text-xs text-text-muted">Noveleta Training Center</p>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          onClick={() => navigate('/login')}
          className="btn-ghost text-sm"
        >
          Sign In <ChevronRight size={14} />
        </motion.button>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-16">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.45 }}
        >
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border"
            style={{
              background: 'var(--accent-light)',
              color: 'var(--accent-text)',
              borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: 'var(--accent)',
                animation: 'pulse 2s infinite',
              }}
            />
            MIS Form Digital Registration System
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.5 }}
          className="font-extrabold leading-[1.1] mb-5 text-text-primary max-w-[760px]"
          style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(2.2rem, 5.5vw, 4rem)' }}
        >
          TESDA Learner<br />
          <span style={{ color: 'var(--accent)' }}>Registration</span> System
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.45 }}
          className="text-base sm:text-lg mb-10 max-w-md text-text-secondary leading-relaxed"
        >
          Streamlined digital enrollment for Noveleta Training Center.
          Fast, organized, and always accessible.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
        >
          <button
            onClick={() => navigate('/login')}
            className="btn-primary text-base px-8 py-3"
          >
            Get Started <ChevronRight size={16} />
          </button>
        </motion.div>

        {/* ── Feature cards ── */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-16 w-full max-w-3xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {features.map(f => (
            <motion.div
              key={f.label}
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.18 } }}
              className="card p-5 text-left cursor-default"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: 'var(--accent-light)' }}
              >
                <f.icon size={17} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="font-semibold text-sm mb-1 text-text-primary leading-snug">{f.label}</p>
              <p className="text-xs text-text-muted leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 text-xs text-text-muted text-center py-5 px-6">
        Technical Education and Skills Development Authority — Noveleta Training Center
      </footer>
    </div>
  );
}