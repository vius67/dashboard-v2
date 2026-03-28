import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { Eye, EyeOff } from 'lucide-react';

type Mode = 'login' | 'signup';

function AnimatedBg() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Deep dark base */}
      <div className="absolute inset-0 bg-[#030a06]" />
      {/* Moving orbs */}
      <motion.div
        animate={{ x: [0, 80, -40, 0], y: [0, -100, 60, 0], scale: [1, 1.3, 0.85, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ x: [0, -60, 80, 0], y: [0, 80, -50, 0], scale: [1, 0.8, 1.2, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        className="absolute -bottom-48 -right-48 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ x: [0, 50, -70, 0], y: [0, -60, 80, 0], scale: [1, 1.1, 0.9, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 10 }}
        className="absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)' }}
      />
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(16,185,129,1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,1) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />
    </div>
  );
}

export default function AuthPage() {
  const { signIn, signUp } = useApp();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setSuccess('Check your email to confirm, then log in.');
        setMode('login'); setPassword('');
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <AnimatedBg />

      {/* Time display top-left */}
      <div className="fixed top-6 left-8 z-10">
        <span className="font-mono text-2xl font-light text-white/30 tabular-nums">{time}</span>
      </div>

      {/* Top-right label */}
      <div className="fixed top-6 right-8 z-10">
        <span className="font-mono text-xs text-white/20 uppercase tracking-widest">student dashboard</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 180, damping: 20 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 mb-5">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <h1 className="font-mono text-white text-xl font-medium tracking-tight">
            {mode === 'login' ? 'welcome back' : 'create account'}
          </h1>
          <p className="font-mono text-white/30 text-xs mt-1 tracking-wide">
            {mode === 'login' ? 'sign in to continue' : 'get started for free'}
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur-2xl p-6 shadow-2xl"
          style={{ boxShadow: '0 0 0 1px rgba(16,185,129,0.08), 0 32px 64px rgba(0,0,0,0.4)' }}
        >
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/6 mb-5">
            {(['login', 'signup'] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
                  mode === m ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' : 'text-white/30 hover:text-white/60'
                }`}>
                {m === 'login' ? 'log in' : 'sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-mono font-medium text-white/30 uppercase tracking-widest mb-1.5">email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/8 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-emerald-500/40 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-mono font-medium text-white/30 uppercase tracking-widest mb-1.5">password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'min. 6 characters' : '••••••••'}
                  minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-white/5 border border-white/8 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-emerald-500/40 focus:bg-white/8 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-mono font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              style={{ boxShadow: '0 0 20px rgba(16,185,129,0.25)' }}
            >
              {loading ? (mode === 'login' ? 'signing in…' : 'creating…') : (mode === 'login' ? 'sign in →' : 'create account →')}
            </motion.button>
          </form>
        </motion.div>

        <p className="text-center font-mono text-white/15 text-[10px] mt-5 tracking-wider">
          your data · your device · supabase
        </p>
      </motion.div>
    </div>
  );
}
