// frontend/src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Shield, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type Step = 'identify' | 'login' | 'forgot-admin' | 'forgot-encoder';
type Role = 'admin' | 'encoder' | null;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [step, setStep]           = useState<Step>('identify');
  const [role, setRole]           = useState<Role>(null);
  const [fullName, setFullName]   = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const [fpEmail, setFpEmail]     = useState('');
  const [fpQuestion, setFpQuestion] = useState('');
  const [fpAnswer, setFpAnswer]   = useState('');
  const [fpNewPass, setFpNewPass] = useState('');
  const [fpStep, setFpStep]       = useState<'email' | 'answer' | 'done'>('email');

  const [ticket, setTicket]       = useState('');
  const [rtNewPass, setRtNewPass] = useState('');
  const [rtConfirm, setRtConfirm] = useState('');

  async function handleDetect() {
    if (!identifier.trim()) return setError('Please enter your Employee ID, Username, or Email.');
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/detect', { identifier: identifier.trim() });
      setRole(data.role); setFullName(data.full_name); setStep('login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Account not found.');
    } finally { setLoading(false); }
  }

  async function handleLogin() {
    if (!password) return setError('Please enter your password.');
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { identifier, password, remember_me: rememberMe });
      setAuth(data.user, data.token, rememberMe);
      toast.success(`Welcome back, ${data.user.full_name}!`);
      navigate(data.user.role === 'admin' ? '/admin' : '/encoder');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally { setLoading(false); }
  }

  async function handleForgotAdmin() {
    setError(''); setLoading(true);
    try {
      if (fpStep === 'email') {
        const { data } = await api.post('/auth/forgot-password/question', { email: fpEmail });
        setFpQuestion(data.question); setFpStep('answer');
      } else if (fpStep === 'answer') {
        await api.post('/auth/forgot-password/reset', { email: fpEmail, answer: fpAnswer, new_password: fpNewPass });
        setFpStep('done');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed.');
    } finally { setLoading(false); }
  }

  async function handleResetTicket() {
    if (rtNewPass !== rtConfirm) return setError('Passwords do not match.');
    if (!ticket.trim()) return setError('Please enter your reset ticket.');
    setError(''); setLoading(true);
    try {
      await api.post('/auth/reset-ticket/use', { identifier, ticket: ticket.trim().toUpperCase(), new_password: rtNewPass });
      toast.success('Password reset! You can now login.');
      setStep('login'); setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid ticket.');
    } finally { setLoading(false); }
  }

  const slideVariants = {
    enter:  { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit:   { opacity: 0, x: -40 },
  };

  return (
    <div className="welcome-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="grid-overlay absolute inset-0 pointer-events-none" />

      <button onClick={() => navigate('/')} className="absolute top-6 left-6 btn-ghost text-sm z-10">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-accent text-white text-3xl font-bold mx-auto mb-4"
            style={{ boxShadow: '0 8px 32px color-mix(in srgb, var(--accent) 40%, transparent)' }}>
            T
          </div>
          <h1 className="font-bold text-2xl text-text-primary">TESDA Registration</h1>
          <p className="text-sm text-text-muted mt-1">Noveleta Training Center</p>
        </motion.div>

        <div className="card p-8 overflow-hidden">
          <AnimatePresence mode="wait">

            {/* STEP 1: IDENTIFY */}
            {step === 'identify' && (
              <motion.div key="identify" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="font-bold text-xl text-text-primary mb-1">Welcome back</h2>
                <p className="text-sm text-text-muted mb-6">Enter your Employee ID, username, or email to continue.</p>
                <label className="label">Employee ID / Username / Email</label>
                <input className="input-base mb-4" placeholder="e.g. 202500001 or admin"
                  value={identifier} onChange={e => setIdentifier(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleDetect()} autoFocus />
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-500 mb-4">
                    <AlertCircle size={14} />{error}
                  </div>
                )}
                <button className="btn-primary w-full justify-center" onClick={handleDetect} disabled={loading}>
                  {loading ? 'Checking...' : <>Continue <ArrowRight size={15} /></>}
                </button>
              </motion.div>
            )}

            {/* STEP 2: LOGIN */}
            {step === 'login' && (
              <motion.div key="login" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <button
                  onClick={() => { setStep('identify'); setError(''); }}
                  className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 bg-transparent border-none cursor-pointer p-0"
                >
                  <ArrowLeft size={13} /> Back
                </button>

                <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-bg-input">
                  <div className={clsx(
                    'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white',
                    role === 'admin' ? 'bg-accent' : 'bg-blue-500'
                  )}>
                    {fullName[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-text-primary">{fullName}</div>
                    <div className="text-xs text-text-muted flex items-center gap-1">
                      {role === 'admin' ? <><Shield size={10} /> Administrator</> : <><KeyRound size={10} /> Encoder</>}
                    </div>
                  </div>
                </div>

                <label className="label">Employee ID / Username / Email</label>
                <input className="input-base mb-4 opacity-70" value={identifier} readOnly />

                <label className="label">Password</label>
                <div className="relative mb-4">
                  <input className="input-base pr-10" type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted bg-transparent border-none cursor-pointer flex items-center"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="flex items-center justify-between mb-5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
                    <input type="checkbox" className="w-4 h-4 accent-accent"
                      checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                    Remember me
                  </label>
                  <button
                    type="button"
                    className="text-sm font-medium text-accent bg-transparent border-none cursor-pointer p-0"
                    onClick={() => { setStep(role === 'admin' ? 'forgot-admin' : 'forgot-encoder'); setError(''); }}
                  >
                    {role === 'admin' ? 'Forgot Password' : 'Use Reset Ticket'}
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-500 mb-4">
                    <AlertCircle size={14} />{error}
                  </div>
                )}
                <button className="btn-primary w-full justify-center" onClick={handleLogin} disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </motion.div>
            )}

            {/* FORGOT PASSWORD - ADMIN */}
            {step === 'forgot-admin' && (
              <motion.div key="forgot-admin" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <button
                  onClick={() => { setStep('login'); setError(''); setFpStep('email'); }}
                  className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 bg-transparent border-none cursor-pointer p-0"
                >
                  <ArrowLeft size={13} /> Back
                </button>
                <h2 className="font-bold text-xl text-text-primary mb-1">Reset Password</h2>
                <p className="text-sm text-text-muted mb-6">Answer your security question to reset your password.</p>

                {fpStep === 'done' ? (
                  <div className="text-center py-4">
                    <CheckCircle size={40} className="text-accent mx-auto mb-3" />
                    <p className="font-semibold text-text-primary">Password Reset!</p>
                    <p className="text-sm text-text-muted mt-1 mb-4">You can now log in with your new password.</p>
                    <button className="btn-primary w-full justify-center"
                      onClick={() => { setStep('login'); setFpStep('email'); }}>
                      Back to Login
                    </button>
                  </div>
                ) : fpStep === 'email' ? (
                  <>
                    <label className="label">Admin Email</label>
                    <input className="input-base mb-4" type="email" placeholder="admin@tesda.gov.ph"
                      value={fpEmail} onChange={e => setFpEmail(e.target.value)} autoFocus />
                    {error && <div className="flex items-center gap-2 text-sm text-red-500 mb-4"><AlertCircle size={14} />{error}</div>}
                    <button className="btn-primary w-full justify-center" onClick={handleForgotAdmin} disabled={loading}>
                      {loading ? 'Checking...' : 'Continue'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-3 rounded-xl bg-bg-input border border-border mb-4">
                      <p className="text-xs text-text-muted mb-1">Security Question:</p>
                      <p className="font-medium text-sm text-text-primary">{fpQuestion}</p>
                    </div>
                    <label className="label">Your Answer</label>
                    <input className="input-base mb-4" placeholder="Answer (case-insensitive)"
                      value={fpAnswer} onChange={e => setFpAnswer(e.target.value)} />
                    <label className="label">New Password</label>
                    <input className="input-base mb-4" type="password" placeholder="New password"
                      value={fpNewPass} onChange={e => setFpNewPass(e.target.value)} />
                    {error && <div className="flex items-center gap-2 text-sm text-red-500 mb-4"><AlertCircle size={14} />{error}</div>}
                    <button className="btn-primary w-full justify-center" onClick={handleForgotAdmin} disabled={loading}>
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {/* RESET TICKET - ENCODER */}
            {step === 'forgot-encoder' && (
              <motion.div key="forgot-encoder" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <button
                  onClick={() => { setStep('login'); setError(''); }}
                  className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 bg-transparent border-none cursor-pointer p-0"
                >
                  <ArrowLeft size={13} /> Back
                </button>
                <h2 className="font-bold text-xl text-text-primary mb-1">Use Reset Ticket</h2>
                <p className="text-sm text-text-muted mb-6">Enter the 8-character ticket provided by your Admin.</p>
                <label className="label">Reset Ticket (8 characters)</label>
                <input
                  className="input-base mb-4 font-mono tracking-[0.2em] text-center text-lg uppercase"
                  placeholder="XXXX-XXXX" maxLength={8} value={ticket}
                  onChange={e => setTicket(e.target.value.toUpperCase())} autoFocus
                />
                <label className="label">New Password</label>
                <input className="input-base mb-4" type="password" placeholder="New password"
                  value={rtNewPass} onChange={e => setRtNewPass(e.target.value)} />
                <label className="label">Confirm Password</label>
                <input className="input-base mb-4" type="password" placeholder="Confirm password"
                  value={rtConfirm} onChange={e => setRtConfirm(e.target.value)} />
                {error && <div className="flex items-center gap-2 text-sm text-red-500 mb-4"><AlertCircle size={14} />{error}</div>}
                <button className="btn-primary w-full justify-center" onClick={handleResetTicket} disabled={loading}>
                  {loading ? 'Processing...' : 'Reset Password'}
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}