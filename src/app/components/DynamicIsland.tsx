import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Square } from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import { useApp } from '../context/AppContext';

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'up late';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function isWeekend(): boolean {
  const d = new Date().getDay();
  return d === 0 || d === 6;
}

function isSchoolHours(): boolean {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= 8 * 60 && mins <= 16 * 60; // 8am–4pm
}

export default function DynamicIsland() {
  const { darkMode } = useApp();
  const { timer, pause, resume, stop } = useTimer();
  const [expanded, setExpanded] = useState(false);
  const [nextTask, setNextTask] = useState<string | null>(null);

  // ── Clock state ──────────────────────────────────────────────────
  const [clockTime, setClockTime] = useState({ h: 0, m: 0, s: 0 });
  const [clockStr, setClockStr] = useState('');

  // ── Countdown to next class ──────────────────────────────────────
  const [countdown, setCountdown] = useState<{ h: number; m: number; s: number; label: string } | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClockTime({ h: now.getHours(), m: now.getMinutes(), s: now.getSeconds() });
      setClockStr(`${pad2(now.getHours())}:${pad2(now.getMinutes())}`);

      // Build countdown to next class from timetable in localStorage
      if (isSchoolHours()) {
        try {
          const raw = localStorage.getItem('timetable-cache-v2');
          if (raw) {
            const { weekA, weekB } = JSON.parse(raw) as { weekA: any[]; weekB: any[] };
            const isoWeek = (() => {
              const d = new Date();
              const dn = d.getUTCDay() || 7;
              d.setUTCDate(d.getUTCDate() + 4 - dn);
              const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
              return Math.ceil((((d.getTime() - ys.getTime()) / 86400000) + 1) / 7);
            })();
            const table = isoWeek % 2 === 1 ? weekA : weekB;
            const todayDay = now.getDay();
            const nowMins = now.getHours() * 60 + now.getMinutes();
            const todayClasses = (table || [])
              .filter((c: any) => c.dayOfWeek === todayDay)
              .sort((a: any, b: any) => {
                const [ah, am] = a.startTime.split(':').map(Number);
                const [bh, bm] = b.startTime.split(':').map(Number);
                return (ah * 60 + am) - (bh * 60 + bm);
              });
            const next = todayClasses.find((c: any) => {
              const [ch, cm] = c.startTime.split(':').map(Number);
              return (ch * 60 + cm) > nowMins;
            });
            if (next) {
              const [nh, nm] = next.startTime.split(':').map(Number);
              const diff = (nh * 60 + nm) * 60 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds());
              if (diff > 0) {
                setCountdown({
                  h: Math.floor(diff / 3600),
                  m: Math.floor((diff % 3600) / 60),
                  s: diff % 60,
                  label: next.subject,
                });
                return;
              }
            }
          }
        } catch {}
        setCountdown(null);
      } else {
        setCountdown(null);
      }
    };

    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('next-task-cache');
    if (stored) setNextTask(stored);
  }, []);

  const isTimerActive = timer.isRunning;
  const weekend = isWeekend();
  const schoolHours = isSchoolHours();

  // ── Decide what goes in the pill ────────────────────────────────
  // Priority: active timer > school countdown > weekend clock > greeting
  const showCountdown = !isTimerActive && schoolHours && countdown;
  const showWeekendClock = !isTimerActive && weekend;

  // Width: wider when showing seconds or expanded
  const pillWidth = expanded
    ? 300
    : isTimerActive
      ? 220
      : showCountdown
        ? 230
        : showWeekendClock
          ? 200
          : 175;

  return (
    // ── FIX: moved down from top-4 to top-16 to clear header buttons ──
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      <motion.div
        layout
        onClick={() => setExpanded(v => !v)}
        style={{ borderRadius: 999 }}
        animate={{ width: pillWidth }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-gray-950 dark:bg-black text-white cursor-pointer overflow-hidden shadow-2xl border border-white/10"
      >
        <motion.div layout className="flex items-center gap-2.5 px-4 py-2.5">

          {/* Clock — always shown */}
          <span className="font-mono text-sm font-medium tabular-nums text-white flex-shrink-0">{clockStr}</span>

          {/* Divider */}
          <div className="w-px h-3.5 bg-white/20 flex-shrink-0" />

          {/* Content area */}
          <AnimatePresence mode="wait">

            {/* Active timer */}
            {isTimerActive && (
              <motion.div key="timer" initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-8 }}
                className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  timer.isPaused ? 'bg-yellow-400' : timer.mode === 'focus' ? 'bg-emerald-400' : 'bg-blue-400'
                } ${!timer.isPaused ? 'animate-pulse' : ''}`} />
                <span className="font-mono text-sm tabular-nums text-white">{fmt(timer.elapsed)}</span>
                {expanded && (
                  <span className="text-xs text-white/50 font-mono truncate ml-1">
                    {timer.label.length > 12 ? timer.label.slice(0,12)+'…' : timer.label}
                  </span>
                )}
              </motion.div>
            )}

            {/* School hours countdown */}
            {!isTimerActive && showCountdown && countdown && (
              <motion.div key="countdown" initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-8 }}
                className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span className="font-mono text-sm tabular-nums text-white">
                  {`${pad2(countdown.h)}:${pad2(countdown.m)}:${pad2(countdown.s)}`}
                </span>
                {expanded && (
                  <span className="text-[10px] text-white/40 font-mono truncate ml-1">
                    {countdown.label.length > 10 ? countdown.label.slice(0,10)+'…' : countdown.label}
                  </span>
                )}
              </motion.div>
            )}

            {/* Weekend — show full H:M:S clock */}
            {!isTimerActive && !showCountdown && showWeekendClock && (
              <motion.div key="weekendclock" initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-8 }}
                className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-[10px] text-white/30 font-mono flex-shrink-0">weekend</span>
                <span className="font-mono text-sm tabular-nums text-white/80">
                  {`${pad2(clockTime.h)}:${pad2(clockTime.m)}:${pad2(clockTime.s)}`}
                </span>
              </motion.div>
            )}

            {/* Default — greeting (single line, no "good") */}
            {!isTimerActive && !showCountdown && !showWeekendClock && (
              <motion.div key="greeting" initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-8 }}
                className="flex-1 min-w-0">
                {/* FIX: "good morning" was wrapping — just show the time of day word */}
                <span className="text-xs text-white/50 font-mono whitespace-nowrap">
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
              initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
              className="border-t border-white/10 px-4 py-3">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">
                {timer.mode} · {timer.isPaused ? 'paused' : 'running'}
              </p>
              <p className="text-sm font-mono text-white/80 truncate mb-3">{timer.label}</p>
              <div className="flex gap-2">
                <button
                  onClick={e => { e.stopPropagation(); timer.isPaused ? resume() : pause(); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-xs font-mono">
                  {timer.isPaused ? <><Play className="w-3 h-3" />resume</> : <><Pause className="w-3 h-3" />pause</>}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); stop(); setExpanded(false); }}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-red-500/30 transition-colors">
                  <Square className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
          {expanded && !isTimerActive && showCountdown && countdown && (
            <motion.div
              initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
              className="border-t border-white/10 px-4 py-3">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">next class</p>
              <p className="text-xs font-mono text-white/80">{countdown.label}</p>
            </motion.div>
          )}
          {expanded && !isTimerActive && !showCountdown && nextTask && (
            <motion.div
              initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
              className="border-t border-white/10 px-4 py-3">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">next task</p>
              <p className="text-xs font-mono text-white/80">{nextTask}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
