import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'motion/react';
import { Play, Pause, Square, RotateCcw, Coffee, Brain, ChevronDown, Sparkles, BookOpen, Trash2 } from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import { useApp } from '../context/AppContext';
import { homeworkService, studyLogService, StudyLogRow } from '../../lib/db';
import { Homework } from '../types';

type Mood = 'great' | 'good' | 'okay' | 'bad';

const MOOD_EMOJI: Record<Mood, string> = { great: '🔥', good: '😊', okay: '😐', bad: '😩' };

function extractSubject(label: string): string {a
  const parts = label.split(/\s*[—–-]\s*/);
  return parts[0].trim() || label;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

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

// ── Floating particle component ───────────────────────────────────────
function Particle({ color, delay, x, y }: { color: string; delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full pointer-events-none"
      style={{ backgroundColor: color, left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.8, 0],
        scale: [0, 1.5, 0],
        y: [0, -60 - Math.random() * 40],
        x: [0, (Math.random() - 0.5) * 60],
      }}
      transition={{ duration: 1.5, delay, ease: 'easeOut' }}
    />
  );
}

// ── Burst animation on start ──────────────────────────────────────────
function BurstEffect({ trigger, color }: { trigger: number; color: string }) {
  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: 30 + Math.random() * 40,
    y: 30 + Math.random() * 40,
    delay: i * 0.04,
  }));

  return (
    <AnimatePresence>
      {trigger > 0 && (
        <div key={trigger} className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          {particles.map(p => (
            <Particle key={p.id} color={color} delay={p.delay} x={p.x} y={p.y} />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Animated digit that flips on change ──────────────────────────────
function AnimatedDigit({ value }: { value: string }) {
  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeInOut' }}
          className="block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export default function StudyTimer() {
  const { darkMode } = useApp();
  const { timer, start, pause, resume, stop, setLabel, switchMode } = useTimer();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [targetSeconds, setTargetSeconds] = useState(25 * 60);
  const [sessions, setSessions] = useState<{ label: string; duration: number; mode: string }[]>([]);
  const [burstTrigger, setBurstTrigger] = useState(0);
  const [justFinished, setJustFinished] = useState(false);
  const prevRunning = useRef(false);
  const [studyLogs, setStudyLogs] = useState<StudyLogRow[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logsView, setLogsView] = useState<'history' | 'subjects'>('history');
  // mood modal state
  const [pendingSession, setPendingSession] = useState<{ label: string; duration: number } | null>(null);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [moodNotes, setMoodNotes] = useState('');

  useEffect(() => {
    homeworkService.getAll()
      .then(hws => setHomework(hws.filter(h => h.status !== 'done')))
      .catch(() => {});
    studyLogService.getAll()
      .then(setStudyLogs)
      .catch(() => {});
  }, []);

  // Detect when timer finishes (hits target)
  useEffect(() => {
    if (targetSeconds > 0 && timer.elapsed >= targetSeconds && timer.isRunning && !timer.isPaused) {
      setJustFinished(true);
      setBurstTrigger(t => t + 1);
      setTimeout(() => setJustFinished(false), 3000);
    }
  }, [timer.elapsed, targetSeconds, timer.isRunning, timer.isPaused]);

  const progress = targetSeconds > 0 ? Math.min(timer.elapsed / targetSeconds, 1) : 0;
  const circumference = 2 * Math.PI * 120;
  const dash = circumference * (1 - progress);

  const handleStart = () => {
    start(timer.label);
    setBurstTrigger(t => t + 1);
  };

  const handleStop = () => {
    if (timer.elapsed > 10 && timer.mode === 'focus') {
      setSessions(prev => [{ label: timer.label, duration: timer.elapsed, mode: timer.mode }, ...prev].slice(0, 10));
      setPendingSession({ label: timer.label, duration: timer.elapsed });
      setSelectedMood(null);
      setMoodNotes('');
    }
    stop();
  };

  const handleSaveLog = async () => {
    if (!pendingSession) return;
    const newLog: Omit<StudyLogRow, 'created_at'> = {
      id: Date.now().toString(),
      label: pendingSession.label,
      subject: extractSubject(pendingSession.label),
      duration: pendingSession.duration,
      mode: 'focus',
      mood: selectedMood,
      notes: moodNotes.trim(),
    };
    try {
      await studyLogService.add(newLog);
      setStudyLogs(prev => [{ ...newLog, created_at: new Date().toISOString() }, ...prev]);
    } catch (e) { console.error(e); }
    setPendingSession(null);
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
  const accentGlow  = isFocus ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)';

  // Split time string for per-digit animation
  const timeStr = fmt(timer.elapsed);
  const timeChars = timeStr.split('');

  return (
    <>
    {/* ── Mood modal ── */}
    <AnimatePresence>
      {pendingSession && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`w-full max-w-sm rounded-3xl border p-6 space-y-5 ${darkMode ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}
          >
            <div>
              <p className="text-xs font-mono font-semibold uppercase tracking-widest text-emerald-500 mb-1">session logged</p>
              <p className={`text-lg font-light ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pendingSession.label}</p>
              <p className="text-xs font-mono text-gray-400">{fmtShort(pendingSession.duration)} focused</p>
            </div>

            <div>
              <p className="text-xs font-mono text-gray-400 mb-2">how did it go?</p>
              <div className="flex gap-2">
                {(Object.entries(MOOD_EMOJI) as [Mood, string][]).map(([mood, emoji]) => (
                  <button
                    key={mood}
                    onClick={() => setSelectedMood(mood)}
                    className={`flex-1 py-2.5 rounded-xl text-lg transition-all border ${
                      selectedMood === mood
                        ? 'border-emerald-400/50 bg-emerald-500/15 scale-105'
                        : darkMode ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-mono text-gray-400 mb-2">notes (optional)</p>
              <textarea
                value={moodNotes}
                onChange={e => setMoodNotes(e.target.value)}
                placeholder="what did you work on?"
                rows={2}
                className={`w-full rounded-xl border px-3 py-2 text-xs font-mono resize-none outline-none transition-colors ${
                  darkMode
                    ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-white/20'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-300'
                }`}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPendingSession(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-mono border transition-colors ${
                  darkMode ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                skip
              </button>
              <button
                onClick={handleSaveLog}
                className="flex-1 py-2.5 rounded-xl text-xs font-mono text-white transition-all"
                style={{ backgroundColor: '#10b981' }}
              >
                save log
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-6 md:p-8 lg:p-10"
    >
      <div className="max-w-4xl mx-auto space-y-8">

        {/* ── Header — staggered entry ── */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-1 font-mono"
          >
            study timer
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="text-4xl md:text-5xl font-light text-gray-900 dark:text-white tracking-tight"
          >
            Focus.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 font-mono"
          >
            {timer.isRunning
              ? `${isFocus ? 'focusing' : 'on break'} · ${fmtShort(timer.totalFocus)} total today`
              : 'ready to start'}
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left: Timer ── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Mode tabs — slide in from left */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 20 }}
              className={`flex gap-1 p-1 rounded-2xl border ${card} w-fit`}
            >
              {(['focus', 'break'] as const).map(m => (
                <motion.button
                  key={m}
                  onClick={() => { switchMode(m); if (m === 'break') setTargetSeconds(5 * 60); else setTargetSeconds(25 * 60); }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono font-medium transition-all ${
                    timer.mode === m
                      ? m === 'focus' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {m === 'focus' ? <Brain className="w-3.5 h-3.5" /> : <Coffee className="w-3.5 h-3.5" />}
                  {m}
                </motion.button>
              ))}
            </motion.div>

            {/* ── Circle timer — scale in with spring ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 180, damping: 18 }}
              className={`relative rounded-3xl border p-10 flex flex-col items-center ${glass} overflow-hidden`}
            >
              {/* Glow blob behind ring */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ opacity: timer.isRunning && !timer.isPaused ? [0.15, 0.35, 0.15] : 0.15 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-20 rounded-full blur-3xl"
                  style={{ backgroundColor: accentColor, opacity: 0.35 }}
                />
              </motion.div>

              {/* Burst on start / finish */}
              <BurstEffect trigger={burstTrigger} color={accentColor} />

              {/* Finished celebration */}
              <AnimatePresence>
                {justFinished && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5, repeat: 3 }}
                      className="text-5xl"
                    >
                      🎉
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SVG ring */}
              <div className="relative w-64 h-64 mb-8">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 264 264">
                  {/* Track */}
                  <circle cx="132" cy="132" r="120" fill="none"
                    stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth="8" />
                  {/* Progress ring */}
                  <motion.circle
                    cx="132" cy="132" r="120" fill="none"
                    stroke={accentColor} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset: dash }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    style={{ filter: timer.isRunning ? `drop-shadow(0 0 8px ${accentGlow})` : 'none' }}
                  />
                </svg>

                {/* Animated digits in center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-mono text-5xl font-light text-gray-900 dark:text-white tabular-nums tracking-tight flex">
                    {timeChars.map((ch, i) =>
                      ch === ':' ? (
                        <motion.span
                          key={`colon-${i}`}
                          animate={{ opacity: timer.isRunning && !timer.isPaused ? [1, 0.3, 1] : 1 }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="mx-0.5"
                        >
                          :
                        </motion.span>
                      ) : (
                        <AnimatedDigit key={i} value={ch} />
                      )
                    )}
                  </div>
                  {targetSeconds > 0 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs font-mono text-gray-400 dark:text-gray-600 mt-1"
                    >
                      / {fmt(targetSeconds)}
                    </motion.span>
                  )}
                  <AnimatePresence mode="wait">
                    {timer.isRunning && (
                      <motion.span
                        key={timer.isPaused ? 'paused' : timer.mode}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={`text-[10px] font-mono uppercase tracking-widest mt-2 ${isFocus ? 'text-emerald-500' : 'text-blue-500'}`}
                      >
                        {timer.isPaused ? 'paused' : isFocus ? 'focusing' : 'break'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Subject picker */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="relative w-full max-w-xs mb-6"
              >
                <motion.button
                  onClick={() => setShowSubjectPicker(v => !v)}
                  whileHover={!timer.isRunning ? { scale: 1.02 } : {}}
                  whileTap={!timer.isRunning ? { scale: 0.98 } : {}}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-mono transition-all ${card} ${timer.isRunning ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'}`}
                  disabled={timer.isRunning}
                >
                  <span className="text-gray-900 dark:text-white truncate">{timer.label}</span>
                  <motion.div animate={{ rotate: showSubjectPicker ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </motion.div>
                </motion.button>
                <AnimatePresence>
                  {showSubjectPicker && !timer.isRunning && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className={`absolute top-full mt-1 left-0 right-0 z-20 rounded-2xl border shadow-xl overflow-hidden ${darkMode ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}
                    >
                      {['Study session', 'Free study', ...homework.map(h => h.subject + ' — ' + h.title)].map((opt, i) => (
                        <motion.button
                          key={opt}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => { setLabel(opt); setShowSubjectPicker(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-mono transition-colors ${darkMode ? 'hover:bg-white/5 text-gray-200' : 'hover:bg-gray-50 text-gray-800'} ${timer.label === opt ? 'text-emerald-500' : ''}`}
                        >
                          {opt}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Controls — pop in */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 250, damping: 20 }}
                className="flex items-center gap-3"
              >
                <AnimatePresence mode="wait">
                  {!timer.isRunning ? (
                    <motion.button
                      key="start"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      whileHover={{ scale: 1.08, boxShadow: `0 0 20px ${accentGlow}` }}
                      whileTap={{ scale: 0.94 }}
                      onClick={handleStart}
                      className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-mono font-medium text-sm text-white transition-all"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Play className="w-4 h-4" /> start
                    </motion.button>
                  ) : (
                    <motion.div
                      key="controls"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="flex items-center gap-3"
                    >
                      <motion.button
                        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                        onClick={timer.isPaused ? resume : pause}
                        className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-mono font-medium text-sm text-white transition-all"
                        style={{ backgroundColor: accentColor }}
                      >
                        {timer.isPaused ? <><Play className="w-4 h-4" /> resume</> : <><Pause className="w-4 h-4" /> pause</>}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                        onClick={handleStop}
                        className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl border font-mono font-medium text-sm transition-colors ${darkMode ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        <Square className="w-4 h-4" /> stop
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {!timer.isRunning && timer.elapsed > 0 && (
                    <motion.button
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                      onClick={() => stop()}
                      className={`p-3.5 rounded-2xl border font-mono text-sm transition-colors ${darkMode ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>

            {/* Presets — stagger in */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="flex gap-2 flex-wrap"
            >
              {PRESETS.map((p, i) => (
                <motion.button
                  key={p.label}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55 + i * 0.05 }}
                  onClick={() => handlePreset(p)}
                  disabled={timer.isRunning}
                  whileHover={!timer.isRunning ? { scale: 1.05, y: -1 } : {}}
                  whileTap={!timer.isRunning ? { scale: 0.95 } : {}}
                  className={`px-4 py-2 rounded-xl border text-xs font-mono transition-all disabled:opacity-40 ${
                    targetSeconds === p.seconds && timer.mode === p.mode
                      ? p.mode === 'focus'
                        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-blue-500/15 border-blue-400/30 text-blue-600 dark:text-blue-400'
                      : darkMode
                        ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        : 'bg-white/50 border-white/60 text-gray-500 hover:bg-white/80'
                  }`}
                >
                  {p.label}
                </motion.button>
              ))}
            </motion.div>
          </div>

          {/* ── Right: Stats + Sessions ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Stats card — slide in from right */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 20 }}
              className={`rounded-3xl border p-5 ${glass}`}
            >
              <p className="text-xs font-mono font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">this session</p>
              <div className="space-y-3">
                {[
                  { label: 'elapsed',    value: fmt(timer.elapsed) },
                  { label: 'focus time', value: fmtShort(timer.totalFocus) },
                  { label: 'mode',       value: timer.mode },
                  { label: 'task',       value: timer.label.length > 20 ? timer.label.slice(0, 20) + '…' : timer.label },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="flex items-baseline justify-between"
                  >
                    <span className="text-xs font-mono text-gray-400 dark:text-gray-600">{s.label}</span>
                    <motion.span
                      key={s.value}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm font-mono text-gray-900 dark:text-white"
                    >
                      {s.value}
                    </motion.span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Session history */}
            <AnimatePresence>
              {sessions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 30, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 30, height: 0 }}
                  transition={{ delay: 0.45, type: 'spring', stiffness: 200, damping: 20 }}
                  className={`rounded-3xl border p-5 ${glass}`}
                >
                  <p className="text-xs font-mono font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">history</p>
                  <div className="space-y-2.5">
                    <AnimatePresence>
                      {sessions.map((s, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center gap-3"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.mode === 'focus' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono text-gray-900 dark:text-white truncate">{s.label}</p>
                          </div>
                          <span className="text-xs font-mono text-gray-400 dark:text-gray-600 flex-shrink-0">{fmtShort(s.duration)}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pending homework */}
            <AnimatePresence>
              {homework.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
                  className={`rounded-3xl border p-5 ${glass}`}
                >
                  <p className="text-xs font-mono font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">pending</p>
                  <div className="space-y-2.5">
                    {homework.slice(0, 5).map((hw, i) => (
                      <motion.button
                        key={hw.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.04 }}
                        onClick={() => { setLabel(hw.subject + ' — ' + hw.title); }}
                        whileHover={!timer.isRunning ? { x: 4 } : {}}
                        className={`w-full flex items-center gap-3 text-left transition-all ${timer.isRunning ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80'}`}
                        disabled={timer.isRunning}
                      >
                        <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: hw.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono font-medium text-gray-900 dark:text-white truncate">{hw.title}</p>
                          <p className="text-[10px] font-mono text-gray-400 dark:text-gray-600">{hw.subject}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Study Logs ── */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55, type: 'spring', stiffness: 200, damping: 20 }}
              className={`rounded-3xl border ${glass}`}
            >
              {/* Header */}
              <button
                onClick={() => setShowLogs(v => !v)}
                className="w-full flex items-center justify-between p-5"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                  <p className="text-xs font-mono font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">study logs</p>
                  {studyLogs.length > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      {studyLogs.length}
                    </span>
                  )}
                </div>
                <motion.div animate={{ rotate: showLogs ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </motion.div>
              </button>

              <AnimatePresence>
                {showLogs && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-4">
                      {studyLogs.length === 0 ? (
                        <p className="text-xs font-mono text-gray-400 dark:text-gray-600 text-center py-4">
                          no logs yet — complete a focus session to start tracking
                        </p>
                      ) : (
                        <>
                          {/* Tab toggle */}
                          <div className={`flex rounded-xl p-0.5 ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                            {(['history', 'subjects'] as const).map(tab => (
                              <button
                                key={tab}
                                onClick={() => setLogsView(tab)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all ${
                                  logsView === tab
                                    ? darkMode
                                      ? 'bg-white/10 text-white'
                                      : 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-400 dark:text-gray-600'
                                }`}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>

                          {/* History view */}
                          {logsView === 'history' && (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {studyLogs.map((log, i) => (
                                <motion.div
                                  key={log.id}
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  className={`flex items-center gap-3 p-2.5 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-black/3'}`}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-mono text-gray-900 dark:text-white truncate">{log.label}</p>
                                    <p className="text-[10px] font-mono text-gray-400 dark:text-gray-600">
                                      {formatDate(log.created_at)}{log.notes ? ` · ${log.notes.slice(0, 40)}${log.notes.length > 40 ? '…' : ''}` : ''}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {log.mood && <span className="text-sm">{MOOD_EMOJI[log.mood]}</span>}
                                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{fmtShort(log.duration)}</span>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}

                          {/* Subjects view */}
                          {logsView === 'subjects' && (() => {
                            const bySubject = studyLogs.reduce<Record<string, number>>((acc, log) => {
                              acc[log.subject] = (acc[log.subject] ?? 0) + log.duration;
                              return acc;
                            }, {});
                            const sorted = Object.entries(bySubject).sort((a, b) => b[1] - a[1]);
                            const total = sorted.reduce((s, [, v]) => s + v, 0);
                            return (
                              <div className="space-y-3">
                                <div className={`flex justify-between text-[10px] font-mono pb-2 border-b ${darkMode ? 'border-white/10 text-gray-500' : 'border-black/10 text-gray-400'}`}>
                                  <span>total focus time</span>
                                  <span className="text-emerald-600 dark:text-emerald-400">{fmtShort(total)}</span>
                                </div>
                                {sorted.map(([subject, secs], i) => {
                                  const pct = Math.round((secs / total) * 100);
                                  return (
                                    <motion.div
                                      key={subject}
                                      initial={{ opacity: 0, x: 10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: i * 0.04 }}
                                      className="space-y-1"
                                    >
                                      <div className="flex justify-between items-baseline">
                                        <span className="text-xs font-mono text-gray-900 dark:text-white truncate max-w-[60%]">{subject}</span>
                                        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{fmtShort(secs)}</span>
                                      </div>
                                      <div className={`h-1 rounded-full overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-black/10'}`}>
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${pct}%` }}
                                          transition={{ delay: i * 0.04 + 0.1, duration: 0.5, ease: 'easeOut' }}
                                          className="h-full rounded-full bg-emerald-500"
                                        />
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          <button
                            onClick={async () => { await studyLogService.deleteAll().catch(() => {}); setStudyLogs([]); }}
                            className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> clear all logs
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
}
