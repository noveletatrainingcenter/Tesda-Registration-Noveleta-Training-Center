// frontend/src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Shield, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import emailjs from '@emailjs/browser';

type Step = 'identify' | 'login' | 'forgot-method' | 'forgot-admin' | 'forgot-encoder' | 'forgot-otp';
type Role = 'admin' | 'encoder' | null;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [step, setStep]             = useState<Step>('identify');
  const [role, setRole]             = useState<Role>(null);
  const [fullName, setFullName]     = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  // Admin forgot password
  const [fpQuestion, setFpQuestion]         = useState('');
  const [fpAnswer, setFpAnswer]             = useState('');
  const [fpNewPass, setFpNewPass]           = useState('');
  const [fpConfirm, setFpConfirm]           = useState('');
  const [fpStep, setFpStep]                 = useState<'answer' | 'verified' | 'newpass' | 'done'>('answer');
  const [showFpPass, setShowFpPass]         = useState(false);
  const [showFpConfirm, setShowFpConfirm]   = useState(false);

  // Encoder reset ticket
  const [ticket, setTicket]                 = useState('');
  const [rtNewPass, setRtNewPass]           = useState('');
  const [rtConfirm, setRtConfirm]           = useState('');
  const [rtStep, setRtStep]                 = useState<'ticket' | 'password' | 'done'>('ticket');
  const [showRtPass, setShowRtPass]         = useState(false);
  const [showRtConfirm, setShowRtConfirm]   = useState(false);

  // OTP recovery
  const [otpEmailInput,  setOtpEmailInput]  = useState('');
  const [otpMaskedEmail, setOtpMaskedEmail] = useState('');
  const [otpCode,        setOtpCode]        = useState('');
  const [otpInput,       setOtpInput]       = useState('');
  const [otpNewPass,     setOtpNewPass]     = useState('');
  const [otpConfirm,     setOtpConfirm]     = useState('');
  const [otpStep,        setOtpStep]        = useState<'send' | 'verify' | 'password' | 'done'>('send');
  const [otpSending,     setOtpSending]     = useState(false);
  const [showOtpPass,    setShowOtpPass]    = useState(false);
  const [showOtpConfirm, setShowOtpConfirm] = useState(false);

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
      if (fpStep === 'answer') {
        if (!fpQuestion)      { setError('Please select your security question.'); setLoading(false); return; }
        if (!fpAnswer.trim()) { setError('Please enter your answer.'); setLoading(false); return; }
        await api.post('/auth/forgot-password/verify-answer', { identifier, question: fpQuestion, answer: fpAnswer });
        setFpStep('verified');
      } else if (fpStep === 'newpass') {
        if (!fpNewPass)              { setError('Please enter a new password.'); setLoading(false); return; }
        if (fpNewPass.length < 6)    { setError('Password must be at least 6 characters.'); setLoading(false); return; }
        if (fpNewPass !== fpConfirm) { setError('Passwords do not match.'); setLoading(false); return; }
        await api.post('/auth/forgot-password/reset', { identifier, question: fpQuestion, answer: fpAnswer, new_password: fpNewPass });
        setFpStep('done');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed.');
    } finally { setLoading(false); }
  }

  async function handleResetTicket() {
    if (rtNewPass !== rtConfirm) return setError('Passwords do not match.');
    if (!rtNewPass) return setError('Please enter a new password.');
    setError(''); setLoading(true);
    try {
      await api.post('/auth/reset-ticket/use', {
        identifier,
        ticket: ticket.trim().toUpperCase(),
        new_password: rtNewPass,
      });
      setRtStep('done');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid ticket.');
    } finally { setLoading(false); }
  }

  async function handleSendOtp() {
    if (!otpEmailInput.trim()) return setError('Please enter your email address.');
    setError(''); setOtpSending(true);
    try {
      const { data } = await api.post('/auth/otp/send', { identifier, email: otpEmailInput.trim() });

      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          to_email: data.to_email,
          passcode: data.otp,
          time:     new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );

      setOtpMaskedEmail(data.masked_email);
      setOtpCode(data.otp);
      setOtpStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally { setOtpSending(false); }
  }

  async function handleVerifyOtp() {
    if (!otpInput.trim()) return setError('Please enter the OTP.');
    if (otpInput.trim() !== otpCode) return setError('Incorrect OTP. Please try again.');
    setError(''); setLoading(true);
    try {
      await api.post('/auth/otp/verify', { identifier, otp: otpInput.trim() });
      setOtpStep('password');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally { setLoading(false); }
  }

  async function handleOtpResetPassword() {
    if (!otpNewPass)               return setError('Please enter a new password.');
    if (otpNewPass.length < 6)     return setError('Password must be at least 6 characters.');
    if (otpNewPass !== otpConfirm) return setError('Passwords do not match.');
    setError(''); setLoading(true);
    try {
      await api.post('/auth/otp/reset-password', { identifier, new_password: otpNewPass });
      setOtpStep('done');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password.');
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
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center bg-accent text-white text-3xl font-bold mx-auto mb-4"
            style={{ boxShadow: '0 8px 32px color-mix(in srgb, var(--accent) 40%, transparent)' }}
          >
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
                <p className="text-sm text-text-muted mb-6">Enter your Employee ID or username to continue.</p>
                <label className="label">Employee ID / Username</label>
                <input
                  className="input-base mb-4"
                  placeholder="e.g. 202500001 or admin"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleDetect()}
                  autoFocus
                />
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

                <label className="label">Employee ID / Username</label>
                <input className="input-base mb-4 opacity-70" value={identifier} readOnly />

                <label className="label">Password</label>
                <div className="relative mb-4">
                  <input
                    className="input-base pr-10"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    autoFocus
                  />
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
                    onClick={() => { setStep('forgot-method'); setError(''); }}
                  >
                    Forgot Password
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

            {/* CHOOSE RECOVERY METHOD */}
            {step === 'forgot-method' && (
              <motion.div key="forgot-method" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <button
                  onClick={() => { setStep('login'); setError(''); }}
                  className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 bg-transparent border-none cursor-pointer p-0"
                >
                  <ArrowLeft size={13} /> Back
                </button>
                <h2 className="font-bold text-xl text-text-primary mb-1">Forgot Password</h2>
                <p className="text-sm text-text-muted mb-6">Choose how you'd like to recover your account.</p>

                <div className="space-y-3">
                  {/* Security Question — admin only */}
                  {role === 'admin' && (
                    <button
                      className="w-full text-left p-4 rounded-xl border border-border bg-bg-input hover:border-accent hover:bg-accent/5 transition-all group"
                      onClick={() => { setStep('forgot-admin'); setFpStep('answer'); setError(''); }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                          <Shield size={16} className="text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">Security Question</p>
                          <p className="text-xs text-text-muted mt-0.5">Answer your pre-set security question</p>
                        </div>
                        <ArrowRight size={14} className="text-text-muted ml-auto group-hover:text-accent transition-colors" />
                      </div>
                    </button>
                  )}

                  {/* Reset Ticket — encoder only */}
                  {role === 'encoder' && (
                    <button
                      className="w-full text-left p-4 rounded-xl border border-border bg-bg-input hover:border-accent hover:bg-accent/5 transition-all group"
                      onClick={() => { setStep('forgot-encoder'); setRtStep('ticket'); setError(''); }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                          <KeyRound size={16} className="text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">Reset Ticket</p>
                          <p className="text-xs text-text-muted mt-0.5">Use the 8-character ticket from your Admin</p>
                        </div>
                        <ArrowRight size={14} className="text-text-muted ml-auto group-hover:text-accent transition-colors" />
                      </div>
                    </button>
                  )}

                  {/* Email OTP — only for admin (hidden for encoder) */}
                  {role !== 'encoder' && (
                    <button
                      className="w-full text-left p-4 rounded-xl border border-border bg-bg-input hover:border-accent hover:bg-accent/5 transition-all group"
                      onClick={() => { setStep('forgot-otp'); setOtpStep('send'); setOtpEmailInput(''); setError(''); }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                          <CheckCircle size={16} className="text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">Email OTP</p>
                          <p className="text-xs text-text-muted mt-0.5">Receive a one-time code on your email</p>
                        </div>
                        <ArrowRight size={14} className="text-text-muted ml-auto group-hover:text-accent transition-colors" />
                      </div>
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* FORGOT PASSWORD - ADMIN */}
            {step === 'forgot-admin' && (
              <motion.div key="forgot-admin" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>

                {/* Sub-step 1: Select question + enter answer */}
                {fpStep === 'answer' && (
                  <>
                    <button
                      onClick={() => { setStep('forgot-method'); setError(''); setFpStep('answer'); setFpAnswer(''); setFpQuestion(''); }}
                      className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 bg-transparent border-none cursor-pointer p-0"
                    >
                      <ArrowLeft size={13} /> Back
                    </button>
                    <h2 className="font-bold text-xl text-text-primary mb-1">Security Question</h2>
                    <p className="text-sm text-text-muted mb-5">
                      Select your security question and enter your answer to verify your identity.
                    </p>
                    <label className="label">Your Security Question</label>
                    <select
                      className="input-base mb-4 cursor-pointer"
                      value={fpQuestion}
                      onChange={e => { setFpQuestion(e.target.value); setError(''); }}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '16px',
                        appearance: 'none',
                      }}
                    >
                      <option value="">— Select your question —</option>
                      {[
                        'What was the name of your first computer or device?',
                        'What is the name of the first programming language you learned?',
                        'What was the name of your first IT mentor or instructor?',
                        'What was the name of the first software company you worked for?',
                        'What is the name of the first open-source project you contributed to?',
                        'What was the first operating system you ever used?',
                        'What was the username of your first online account?',
                        'What is the name of the first database system you learned?',
                        'What was the first tech certification you ever earned?',
                        'What was the name of your first computer science or IT professor?',
                        'Others',
                      ].map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                    <label className="label">Your Answer</label>
                    <input
                      className="input-base mb-4"
                      placeholder="Answer (case-insensitive)"
                      value={fpAnswer}
                      onChange={e => { setFpAnswer(e.target.value); setError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleForgotAdmin()}
                    />
                    {error && <div className="flex items-center gap-2 text-sm text-red-500 mb-4"><AlertCircle size={14} />{error}</div>}
                    <button className="btn-primary w-full justify-center" onClick={handleForgotAdmin} disabled={loading}>
                      {loading ? 'Verifying...' : <>Verify Answer <ArrowRight size={15} /></>}
                    </button>
                  </>
                )}

                {/* Sub-step 1b: Verified */}
                {fpStep === 'verified' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-center py-6"
                  >
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-accent" />
                    </div>
                    <p className="font-bold text-lg text-text-primary mb-1">Identity Verified!</p>
                    <p className="text-sm text-text-muted mb-6">
                      Your security answer is correct. You may now set a new password.
                    </p>
                    <button className="btn-primary w-full justify-center" onClick={() => setFpStep('newpass')}>
                      Continue <ArrowRight size={15} />
                    </button>
                  </motion.div>
                )}

                {/* Sub-step 2: Set new password */}
                {fpStep === 'newpass' && (
                  <>
                    <button
                      onClick={() => { setFpStep('verified'); setError(''); setFpNewPass(''); setFpConfirm(''); }}
                      className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 bg-transparent border-none cursor-pointer p-0"
                    >
                      <ArrowLeft size={13} /> Back
                    </button>
                    <h2 className="font-bold text-xl text-text-primary mb-1">Set New Password</h2>
                    <p className="text-sm text-text-muted mb-5">Choose a strong new password for your account.</p>
                    <label className="label">New Password</label>
                    <div className="relative mb-4">
                      <input
                        className="input-base pr-10"
                        type={showFpPass ? 'text' : 'password'}
                        placeholder="New password (min. 6 characters)"
                        value={fpNewPass}
                        onChange={e => { setFpNewPass(e.target.value); setError(''); }}
                        autoFocus
                      />
                      <button type="button" onClick={() => setShowFpPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted bg-transparent border-none cursor-pointer flex items-center">
                        {showFpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <label className="label">Confirm Password</label>
                    <div className="relative mb-4">
                      <input
                        className="input-base pr-10"
                        type={showFpConfirm ? 'text' : 'password'}
                        placeholder="Re-enter new password"
                        value={fpConfirm}
                        onChange={e => { setFpConfirm(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleForgotAdmin()}
                      />
                      <button type="button" onClick={() => setShowFpConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted bg-transparent border-none cursor-pointer flex items-center">
                        {showFpConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {error && <div className="flex items-center gap-2 text-sm text-red-500 mb-4"><AlertCircle size={14} />{error}</div>}
                    <button className="btn-primary w-full justify-center" onClick={handleForgotAdmin} disabled={loading}>
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </>
                )}

                {/* Sub-step 3: Done */}
                {fpStep === 'done' && (
                  <div className="text-center py-4">
                    <CheckCircle size={40} className="text-accent mx-auto mb-3" />
                    <p className="font-semibold text-text-primary">Password Reset!</p>
                    <p className="text-sm text-text-muted mt-1 mb-4">You can now log in with your new password.</p>
                    <button className="btn-primary w-full justify-center"
                      onClick={() => {
                        setStep('login');
                        setFpStep('answer');
                        setFpAnswer(''); setFpQuestion('');
                        setFpNewPass(''); setFpConfirm('');
                        setPassword('');
                      }}>
                      Back to Login
                    </button>
                  </div>
                )}

              </motion.div>
            )}

            {/* RESET TICKET - ENCODER */}
            {step === 'forgot-encoder' && (
              <motion.div key="forgot-encoder" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>

                {/* Sub-step 1: Enter ticket */}
                {rtStep === 'ticket' && (
                  <>
                    <button
                      onClick={() => { setStep('forgot-method'); setError(''); setTicket(''); }}
                      className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 bg-transparent border-none cursor-pointer p-0"
                    >
                      <ArrowLeft size={13} /> Back
                    </button>
                    <h2 className="font-bold text-xl text-text-primary mb-1">Use Reset Ticket</h2>
                    <p className="text-sm text-text-muted mb-6">Enter the 8-character ticket provided by your Admin.</p>
                    <label className="label">Reset Ticket (8 characters)</label>
                    <input
                      className="input-base mb-4 font-mono tracking-[0.2em] text-center text-lg uppercase"
                      placeholder="XXXXXXXX"
                      maxLength={8}
                      value={ticket}
                      onChange={e => setTicket(e.target.value.toUpperCase())}
                      autoFocus
                    />
                    {error && <div className="flex items-center gap-2 text-sm text-red-500 mb-4"><AlertCircle size={14} />{error}</div>}
                    <button
                      className="btn-primary w-full justify-center"
                      onClick={async () => {
                        if (ticket.trim().length < 8) return setError('Please enter the full 8-character ticket.');
                        setError(''); setLoading(true);
                        try {
                          await api.post('/auth/reset-ticket/validate', {
                            identifier,
                            ticket: ticket.trim().toUpperCase(),
                          });
                          setRtStep('password');
                        } catch (err: any) {
                          setError(err.response?.data?.message || 'Invalid or expired reset ticket.');
                        } finally { setLoading(false); }
                      }}
                    >
                      Continue <ArrowRight size={15} />
                    </button>
                  </>
                )}

                {/* Sub-step 2: Set new password */}
                {rtStep === 'password' && (
                  <>
                    <button
                      onClick={() => { setRtStep('ticket'); setError(''); setRtNewPass(''); setRtConfirm(''); }}
                      className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 bg-transparent border-none cursor-pointer p-0"
                    >
                      <ArrowLeft size={13} /> Back
                    </button>
                    <h2 className="font-bold text-xl text-text-primary mb-1">Set New Password</h2>
                    <p className="text-sm text-text-muted mb-6">Choose a new password for your account.</p>
                    <label className="label">New Password</label>
                    <div className="relative mb-4">
                      <input
                        className="input-base pr-10"
                        type={showRtPass ? 'text' : 'password'}
                        placeholder="New password"
                        value={rtNewPass}
                        onChange={e => setRtNewPass(e.target.value)}
                        autoFocus
                      />
                      <button type="button" onClick={() => setShowRtPass(!showRtPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted bg-transparent border-none cursor-pointer flex items-center">
                        {showRtPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <label className="label">Confirm Password</label>
                    <div className="relative mb-4">
                      <input
                        className="input-base pr-10"
                        type={showRtConfirm ? 'text' : 'password'}
                        placeholder="Confirm password"
                        value={rtConfirm}
                        onChange={e => setRtConfirm(e.target.value)}
                      />
                      <button type="button" onClick={() => setShowRtConfirm(!showRtConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted bg-transparent border-none cursor-pointer flex items-center">
                        {showRtConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {error && <div className="flex items-center gap-2 text-sm text-red-500 mb-4"><AlertCircle size={14} />{error}</div>}
                    <button className="btn-primary w-full justify-center" onClick={handleResetTicket} disabled={loading}>
                      {loading ? 'Processing...' : 'Confirm Reset'}
                    </button>
                  </>
                )}

                {/* Sub-step 3: Done */}
                {rtStep === 'done' && (
                  <div className="text-center py-4">
                    <CheckCircle size={40} className="text-accent mx-auto mb-3" />
                    <p className="font-semibold text-text-primary">Password Reset!</p>
                    <p className="text-sm text-text-muted mt-1 mb-4">You can now log in with your new password.</p>
                    <button
                      className="btn-primary w-full justify-center"
                      onClick={() => {
                        setStep('login');
                        setRtStep('ticket');
                        setTicket(''); setRtNewPass(''); setRtConfirm('');
                        setPassword('');
                      }}
                    >
                      Back to Login
                    </button>
                  </div>
                )}

              </motion.div>
            )}

            {/* OTP RECOVERY - ADMIN ONLY (hidden for encoder) */}
            {step === 'forgot-otp' && (
              <motion.div key="forgot-otp" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>

                {/* Sub-step 1: Enter email + Send OTP */}
                {otpStep === 'send' && (
                  <>
                    <button
                      onClick={() => { setStep('forgot-method'); setError(''); setOtpEmailInput(''); }}
                      className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 bg-transparent border-none cursor-pointer p-0"
                    >
                      <ArrowLeft size={13} /> Back
                    </button>
                    <h2 className="font-bold text-xl text-text-primary mb-1">Reset via Email OTP</h2>
                    <p className="text-sm text-text-muted mb-6">
                      Enter the email address linked to your account and we'll send you a one-time code.
                    </p>
                    <label className="label">Email Address</label>
                    <input
                      className="input-base mb-4"
                      type="email"
                      placeholder="your@email.com"
                      value={otpEmailInput}
                      onChange={e => { setOtpEmailInput(e.target.value); setError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                      autoFocus
                    />
                    {error && <div className="flex items-center gap-2 text-sm text-red-500 mb-4"><AlertCircle size={14} />{error}</div>}
                    <button className="btn-primary w-full justify-center" onClick={handleSendOtp} disabled={otpSending}>
                      {otpSending ? 'Sending OTP...' : <>Send OTP <ArrowRight size={15} /></>}
                    </button>
                  </>
                )}

                {/* Sub-step 2: Enter OTP */}
                {otpStep === 'verify' && (
                  <>
                    <button
                      onClick={() => { setOtpStep('send'); setError(''); setOtpInput(''); }}
                      className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 bg-transparent border-none cursor-pointer p-0"
                    >
                      <ArrowLeft size={13} /> Back
                    </button>
                    <h2 className="font-bold text-xl text-text-primary mb-1">Enter OTP</h2>
                    <p className="text-sm text-text-muted mb-6">
                      A 6-digit code was sent to{' '}
                      <span className="font-medium text-text-secondary">{otpMaskedEmail}</span>.{' '}
                      Valid for 10 minutes.
                    </p>
                    <label className="label">One-Time Password</label>
                    <input
                      className="input-base mb-4 font-mono tracking-[0.3em] text-center text-xl"
                      placeholder="______"
                      maxLength={6}
                      value={otpInput}
                      onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '')); setError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                      autoFocus
                    />
                    {error && <div className="flex items-center gap-2 text-sm text-red-500 mb-4"><AlertCircle size={14} />{error}</div>}
                    <button className="btn-primary w-full justify-center mb-3" onClick={handleVerifyOtp} disabled={loading}>
                      {loading ? 'Verifying...' : <>Verify OTP <ArrowRight size={15} /></>}
                    </button>
                    <button
                      type="button"
                      className="w-full text-sm text-text-muted hover:text-accent bg-transparent border-none cursor-pointer p-0 transition-colors"
                      onClick={() => { setOtpStep('send'); setOtpInput(''); setError(''); }}
                    >
                      Resend OTP
                    </button>
                  </>
                )}

                {/* Sub-step 3: Set new password */}
                {otpStep === 'password' && (
                  <>
                    <button
                      onClick={() => { setOtpStep('verify'); setError(''); setOtpNewPass(''); setOtpConfirm(''); }}
                      className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 bg-transparent border-none cursor-pointer p-0"
                    >
                      <ArrowLeft size={13} /> Back
                    </button>
                    <h2 className="font-bold text-xl text-text-primary mb-1">Set New Password</h2>
                    <p className="text-sm text-text-muted mb-6">OTP verified! Choose a new password for your account.</p>
                    <label className="label">New Password</label>
                    <div className="relative mb-4">
                      <input
                        className="input-base pr-10"
                        type={showOtpPass ? 'text' : 'password'}
                        placeholder="New password (min. 6 characters)"
                        value={otpNewPass}
                        onChange={e => { setOtpNewPass(e.target.value); setError(''); }}
                        autoFocus
                      />
                      <button type="button" onClick={() => setShowOtpPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted bg-transparent border-none cursor-pointer flex items-center">
                        {showOtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <label className="label">Confirm Password</label>
                    <div className="relative mb-4">
                      <input
                        className="input-base pr-10"
                        type={showOtpConfirm ? 'text' : 'password'}
                        placeholder="Re-enter new password"
                        value={otpConfirm}
                        onChange={e => { setOtpConfirm(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleOtpResetPassword()}
                      />
                      <button type="button" onClick={() => setShowOtpConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted bg-transparent border-none cursor-pointer flex items-center">
                        {showOtpConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {error && <div className="flex items-center gap-2 text-sm text-red-500 mb-4"><AlertCircle size={14} />{error}</div>}
                    <button className="btn-primary w-full justify-center" onClick={handleOtpResetPassword} disabled={loading}>
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </>
                )}

                {/* Sub-step 4: Done */}
                {otpStep === 'done' && (
                  <div className="text-center py-4">
                    <CheckCircle size={40} className="text-accent mx-auto mb-3" />
                    <p className="font-semibold text-text-primary">Password Reset!</p>
                    <p className="text-sm text-text-muted mt-1 mb-4">You can now log in with your new password.</p>
                    <button
                      className="btn-primary w-full justify-center"
                      onClick={() => {
                        setStep('login');
                        setOtpStep('send');
                        setOtpInput(''); setOtpNewPass(''); setOtpConfirm('');
                        setPassword('');
                      }}
                    >
                      Back to Login
                    </button>
                  </div>
                )}

              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}