import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Square } from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import { useApp } from '../context/AppContext';

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

export default function DynamicIsland() {
  const { darkMode } = useApp();
  const { timer, pause, resume, stop } = useTimer();
  const [time, setTime] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [nextTask, setNextTask] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  // Load next homework due
  useEffect(() => {
    const stored = localStorage.getItem('next-task-cache');
    if (stored) setNextTask(stored);
  }, []);

  const isTimerActive = timer.isRunning;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      <motion.div
        layout
        onClick={() => setExpanded(v => !v)}
        style={{ borderRadius: 999 }}
        animate={{ width: expanded ? 280 : isTimerActive ? 200 : 160 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-gray-950 dark:bg-black text-white cursor-pointer overflow-hidden shadow-2xl border border-white/10"
      >
        <motion.div layout className="flex items-center gap-3 px-4 py-2.5">
          {/* Clock */}
          <span className="font-mono text-sm font-medium tabular-nums text-white flex-shrink-0">{time}</span>

          {/* Divider */}
          <div className="w-px h-3.5 bg-white/20 flex-shrink-0" />

          {/* Timer or greeting */}
          <AnimatePresence mode="wait">
            {isTimerActive ? (
              <motion.div key="timer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${timer.isPaused ? 'bg-yellow-400' : timer.mode === 'focus' ? 'bg-emerald-400' : 'bg-blue-400'} ${!timer.isPaused ? 'animate-pulse' : ''}`} />
                <span className="font-mono text-sm tabular-nums text-white">{fmt(timer.elapsed)}</span>
                {expanded && (
                  <span className="text-xs text-white/50 font-mono truncate ml-1">{timer.label.length > 12 ? timer.label.slice(0,12)+'…' : timer.label}</span>
                )}
              </motion.div>
            ) : (
              <motion.div key="greeting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 min-w-0">
                <span className="text-xs text-white/50 font-mono">
                  {expanded && nextTask ? nextTask : `good ${getGreeting()}`}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Expanded controls */}
        <AnimatePresence>
          {expanded && isTimerActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/10 px-4 py-3"
            >
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">
                {timer.mode} · {timer.isPaused ? 'paused' : 'running'}
              </p>
              <p className="text-sm font-mono text-white/80 truncate mb-3">{timer.label}</p>
              <div className="flex gap-2">
                <button
                  onClick={e => { e.stopPropagation(); timer.isPaused ? resume() : pause(); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-xs font-mono"
                >
                  {timer.isPaused ? <><Play className="w-3 h-3" />resume</> : <><Pause className="w-3 h-3" />pause</>}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); stop(); setExpanded(false); }}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-red-500/30 transition-colors"
                >
                  <Square className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
          {expanded && !isTimerActive && nextTask && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/10 px-4 py-3"
            >
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">next task</p>
              <p className="text-xs font-mono text-white/80">{nextTask}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
