import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Square, RotateCcw, Coffee, Brain, ChevronDown } from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import { useApp } from '../context/AppContext';
import { homeworkService } from '../../lib/db';
import { Homework } from '../types';

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function fmtShort(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

const PRESETS = [
  { label: '25 min', seconds: 25 * 60, mode: 'focus' as const },
  { label: '45 min', seconds: 45 * 60, mode: 'focus' as const },
  { label: '60 min', seconds: 60 * 60, mode: 'focus' as const },
  { label: '5 min break', seconds: 5 * 60, mode: 'break' as const },
  { label: '15 min break', seconds: 15 * 60, mode: 'break' as const },
];

export default function StudyTimer() {
  const { darkMode } = useApp();
  const { timer, start, pause, resume, stop, setLabel, switchMode } = useTimer();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [targetSeconds, setTargetSeconds] = useState(25 * 60);
  const [sessions, setSessions] = useState<{ label: string; duration: number; mode: string }[]>([]);

  useEffect(() => {
    homeworkService.getAll().then(hws => setHomework(hws.filter(h => h.status !== 'done'))).catch(() => {});
  }, []);

  const progress = targetSeconds > 0 ? Math.min(timer.elapsed / targetSeconds, 1) : 0;
  const circumference = 2 * Math.PI * 120;
  const dash = circumference * (1 - progress);

  const handleStart = () => {
    start(timer.label);
  };

  const handleStop = () => {
    if (timer.elapsed > 10) {
      setSessions(prev => [{ label: timer.label, duration: timer.elapsed, mode: timer.mode }, ...prev].slice(0, 10));
    }
    stop();
  };

  const handlePreset = (p: typeof PRESETS[0]) => {
    setTargetSeconds(p.seconds);
    switchMode(p.mode);
    if (timer.isRunning) stop();
  };

  const glass = darkMode ? 'bg-black/20 border-white/10 backdrop-blur-2xl' : 'bg-white/40 border-white/60 backdrop-blur-2xl';
  const card  = darkMode ? 'bg-gray-900/60 border-white/10' : 'bg-white/60 border-white/60';
  const isFocus = timer.mode === 'focus';
  const accentColor = isFocus ? '#10b981' : '#3b82f6';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-1 font-mono">study timer</p>
          <h1 className="text-4xl md:text-5xl font-light text-gray-900 dark:text-white tracking-tight">Focus.</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 font-mono">
            {timer.isRunning
              ? `${isFocus ? 'focusing' : 'on break'} · ${fmtShort(timer.totalFocus)} total today`
              : 'ready to start'}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: Timer */}
          <div className="lg:col-span-3 space-y-5">

            {/* Mode tabs */}
            <div className={`flex gap-1 p-1 rounded-2xl border ${card} w-fit`}>
              {(['focus', 'break'] as const).map(m => (
                <button key={m} onClick={() => { switchMode(m); if (m === 'break') setTargetSeconds(5 * 60); else setTargetSeconds(25 * 60); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono font-medium transition-all ${
                    timer.mode === m
                      ? m === 'focus'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-blue-500 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}>
                  {m === 'focus' ? <Brain className="w-3.5 h-3.5" /> : <Coffee className="w-3.5 h-3.5" />}
                  {m}
                </button>
              ))}
            </div>

            {/* Circle timer */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
              className={`relative rounded-3xl border p-10 flex flex-col items-center ${glass}`}>
              <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-80 h-20 rounded-full blur-3xl opacity-20 ${isFocus ? 'bg-emerald-400' : 'bg-blue-400'}`} />
              </div>

              {/* SVG ring */}
              <div className="relative w-64 h-64 mb-8">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 264 264">
                  {/* Track */}
                  <circle cx="132" cy="132" r="120" fill="none"
                    stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth="8" />
                  {/* Progress */}
                  <motion.circle cx="132" cy="132" r="120" fill="none"
                    stroke={accentColor} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dash}
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                {/* Time in center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span key={fmt(timer.elapsed)}
                    className="font-mono text-5xl font-light text-gray-900 dark:text-white tabular-nums tracking-tight">
                    {fmt(timer.elapsed)}
                  </motion.span>
                  {targetSeconds > 0 && (
                    <span className="text-xs font-mono text-gray-400 dark:text-gray-600 mt-1">
                      / {fmt(targetSeconds)}
                    </span>
                  )}
                  {timer.isRunning && (
                    <span className={`text-[10px] font-mono uppercase tracking-widest mt-2 ${isFocus ? 'text-emerald-500' : 'text-blue-500'}`}>
                      {timer.isPaused ? 'paused' : isFocus ? 'focusing' : 'break'}
                    </span>
                  )}
                </div>
              </div>

              {/* Subject picker */}
              <div className="relative w-full max-w-xs mb-6">
                <button onClick={() => setShowSubjectPicker(v => !v)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-mono transition-all ${card} ${timer.isRunning ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'}`}
                  disabled={timer.isRunning}>
                  <span className="text-gray-900 dark:text-white truncate">{timer.label}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
                <AnimatePresence>
                  {showSubjectPicker && !timer.isRunning && (
                    <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      className={`absolute top-full mt-1 left-0 right-0 z-20 rounded-2xl border shadow-xl overflow-hidden ${darkMode ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
                      {['Study session', 'Free study', ...homework.map(h => h.subject + ' — ' + h.title)].map(opt => (
                        <button key={opt} onClick={() => { setLabel(opt); setShowSubjectPicker(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-mono transition-colors ${darkMode ? 'hover:bg-white/5 text-gray-200' : 'hover:bg-gray-50 text-gray-800'} ${timer.label === opt ? 'text-emerald-500' : ''}`}>
                          {opt}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {!timer.isRunning ? (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleStart}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-mono font-medium text-sm text-white transition-colors"
                    style={{ backgroundColor: accentColor }}>
                    <Play className="w-4 h-4" /> start
                  </motion.button>
                ) : (
                  <>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={timer.isPaused ? resume : pause}
                      className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-mono font-medium text-sm text-white transition-colors"
                      style={{ backgroundColor: accentColor }}>
                      {timer.isPaused ? <><Play className="w-4 h-4" /> resume</> : <><Pause className="w-4 h-4" /> pause</>}
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleStop}
                      className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl border font-mono font-medium text-sm transition-colors ${darkMode ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <Square className="w-4 h-4" /> stop
                    </motion.button>
                  </>
                )}
                {!timer.isRunning && timer.elapsed > 0 && (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => stop()}
                    className={`p-3.5 rounded-2xl border font-mono text-sm transition-colors ${darkMode ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    <RotateCcw className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </motion.div>

            {/* Presets */}
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => handlePreset(p)} disabled={timer.isRunning}
                  className={`px-4 py-2 rounded-xl border text-xs font-mono transition-all disabled:opacity-40 ${
                    targetSeconds === p.seconds && timer.mode === p.mode
                      ? p.mode === 'focus' ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/15 border-blue-400/30 text-blue-600 dark:text-blue-400'
                      : darkMode ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10' : 'bg-white/50 border-white/60 text-gray-500 hover:bg-white/80'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Stats + Sessions */}
          <div className="lg:col-span-2 space-y-4">

            {/* Stats */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              className={`rounded-3xl border p-5 ${glass}`}>
              <p className="text-xs font-mono font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">this session</p>
              <div className="space-y-3">
                {[
                  { label: 'elapsed', value: fmt(timer.elapsed) },
                  { label: 'focus time', value: fmtShort(timer.totalFocus) },
                  { label: 'mode', value: timer.mode },
                  { label: 'task', value: timer.label.length > 20 ? timer.label.slice(0, 20) + '…' : timer.label },
                ].map(s => (
                  <div key={s.label} className="flex items-baseline justify-between">
                    <span className="text-xs font-mono text-gray-400 dark:text-gray-600">{s.label}</span>
                    <span className="text-sm font-mono text-gray-900 dark:text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Session history */}
            {sessions.length > 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                className={`rounded-3xl border p-5 ${glass}`}>
                <p className="text-xs font-mono font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">history</p>
                <div className="space-y-2.5">
                  {sessions.map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.mode === 'focus' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-gray-900 dark:text-white truncate">{s.label}</p>
                      </div>
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-600 flex-shrink-0">{fmtShort(s.duration)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Pending homework */}
            {homework.length > 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
                className={`rounded-3xl border p-5 ${glass}`}>
                <p className="text-xs font-mono font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">pending</p>
                <div className="space-y-2.5">
                  {homework.slice(0, 5).map(hw => (
                    <button key={hw.id} onClick={() => { setLabel(hw.subject + ' — ' + hw.title); }}
                      className={`w-full flex items-center gap-3 text-left transition-all group ${timer.isRunning ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-70'}`}
                      disabled={timer.isRunning}>
                      <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: hw.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-medium text-gray-900 dark:text-white truncate">{hw.title}</p>
                        <p className="text-[10px] font-mono text-gray-400 dark:text-gray-600">{hw.subject}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
