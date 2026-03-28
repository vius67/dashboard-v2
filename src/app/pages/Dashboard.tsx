import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, User, Calendar, Plus, X, Trash2, Loader2, Upload, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { timetableService } from '../../lib/db';
import { getNextClass, getCurrentClass, getTodaysClasses, getTimeUntil, getDayName } from '../utils/timeUtils';
import { ClassPeriod } from '../types';
import { useApp } from '../context/AppContext';

const COLORS = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const SKIP_KEYWORDS = ['WSREC','BADMINTON','CARE:','ADMIN'];

const SUBJECT_COLORS: Record<string, string> = {
  'Mathematics': COLORS[0], 'English': COLORS[1], 'Science': COLORS[2],
  'iSTEM': COLORS[3], 'German': COLORS[4], 'Geography': COLORS[5],
  'History': COLORS[6], 'PDHPE': COLORS[7], 'Enterprise': COLORS[8],
};

function getSubjectColor(summary: string, index: number): string {
  for (const [key, col] of Object.entries(SUBJECT_COLORS)) {
    if (summary.includes(key)) return col;
  }
  return COLORS[index % COLORS.length];
}

function genId() { return `c-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }
function parseTime(t: string) { const [h,m]=t.split(':').map(Number); return h*60+m; }
function pad2(n: number) { return String(n).padStart(2,'0'); }

// ── Week A/B detection ──────────────────────────────────────────────
function getIsoWeek(date: Date): number {
  const d = new Date(date);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
function getWeekType(isoWeek: number): 'A' | 'B' { return isoWeek % 2 === 1 ? 'A' : 'B'; }
function getCurrentWeekType(): 'A' | 'B' { return getWeekType(getIsoWeek(new Date())); }


// Parse a single ICS file into deduplicated classes
function parseIcsToClasses(text: string): ClassPeriod[] {
  const blocks = text.split('BEGIN:VEVENT').slice(1);
  const seen = new Map<string, ClassPeriod>();
  let colorIndex = 0;
  for (const block of blocks) {
    const get = (key: string) => {
      const m = block.match(new RegExp(`(?:^|\\r?\\n)${key}[^:]*:([^\\r\\n]+)`));
      return m ? m[1].trim() : '';
    };
    const summary  = get('SUMMARY');
    const dtstart  = get('DTSTART');
    const dtend    = get('DTEND');
    const location = get('LOCATION').replace(/^Room:\s*/i, '').trim();
    const desc     = get('DESCRIPTION');
    if (!summary || !dtstart) continue;
    if (SKIP_KEYWORDS.some(kw => summary.toUpperCase().includes(kw))) continue;
    let teacher = '';
    const tm = desc.replace(/\\n/g, '\n').match(/Teacher:\s*([^\n]+)/);
    if (tm) teacher = tm[1].trim();
    const parseUtc = (s: string) => {
      const c = s.replace('Z','');
      return new Date(Date.UTC(+c.slice(0,4),+c.slice(4,6)-1,+c.slice(6,8),+c.slice(9,11),+c.slice(11,13),0));
    };
    const utcStart = parseUtc(dtstart);
    const utcEnd   = parseUtc(dtend || dtstart);
    const offsetMs = 11 * 60 * 60 * 1000;
    const localStart = new Date(utcStart.getTime() + offsetMs);
    const localEnd   = new Date(utcEnd.getTime()   + offsetMs);
    const dayOfWeek  = localStart.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    const startTime = `${pad2(localStart.getUTCHours())}:${pad2(localStart.getUTCMinutes())}`;
    const endTime   = `${pad2(localEnd.getUTCHours())}:${pad2(localEnd.getUTCMinutes())}`;
    const cleanSubject = summary.replace(/^10\w+:\s*/, '').trim();
    const key = `${dayOfWeek}|${cleanSubject}|${startTime}`;
    if (!seen.has(key)) {
      seen.set(key, {
        id: genId(), subject: cleanSubject, teacher, room: location,
        dayOfWeek, startTime, endTime,
        color: getSubjectColor(summary, colorIndex++),
      });
    }
  }
  return Array.from(seen.values()).sort((a,b) => a.dayOfWeek - b.dayOfWeek || parseTime(a.startTime) - parseTime(b.startTime));
}


// ── Weekend countdown helpers ─────────────────────────────────────────
function getWeekendCountdown(): { daysUntilMon: number; nextMonday: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const daysUntilMon = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMon);
  nextMonday.setHours(0, 0, 0, 0);
  return { daysUntilMon, nextMonday };
}

type Modal = 'none' | 'add' | 'edit' | 'ics';

export default function Dashboard() {
  const { darkMode } = useApp();
  const [timetable, setTimetable] = useState<ClassPeriod[]>([]);
  const [weekBTimetable, setWeekBTimetable] = useState<ClassPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<Modal>('none');
  const [editTarget, setEditTarget] = useState<ClassPeriod | null>(null);
  const [viewDay, setViewDay] = useState(() => {
    const d = new Date().getDay();
    return (d === 0 || d === 6) ? 1 : d;
  });
  const [showFullTimetable, setShowFullTimetable] = useState(false);
  const [timetableTab, setTimetableTab] = useState<'A' | 'B'>(getCurrentWeekType());
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [weekendCountdown, setWeekendCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [, setTick] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { weekA, weekB } = await timetableService.getBothWeeks();
      // Show the current week as the active timetable for countdown/today view
      const current = getCurrentWeekType();
      setTimetable(current === 'A' ? weekA : weekB);
      setWeekBTimetable(current === 'A' ? weekB : weekA);
      setError('');
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Listen for keyboard shortcut events from Layout
  useEffect(() => {
    const onImport = () => setModal('ics');
    const onNew = () => { setEditTarget(null); setModal('add'); };
    window.addEventListener('dashboard:open-import', onImport);
    window.addEventListener('dashboard:new-item', onNew);
    return () => {
      window.removeEventListener('dashboard:open-import', onImport);
      window.removeEventListener('dashboard:new-item', onNew);
    };
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  // Countdown to next class
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    const next = getNextClass(timetable);
    if (!next) return;
    const update = () => {
      const r = getTimeUntil(next.startTime, next.dayOfWeek);
      setCountdown({ hours: r.hours, minutes: r.minutes, seconds: r.seconds });
    };
    update();
    countdownRef.current = setInterval(update, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [timetable]);

  // Weekend countdown
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const day = now.getDay();
      if (day !== 0 && day !== 6) return;
      const { nextMonday } = getWeekendCountdown();
      const diff = nextMonday.getTime() - now.getTime();
      if (diff <= 0) { setWeekendCountdown({ days:0, hours:0, minutes:0, seconds:0 }); return; }
      const totalS = Math.floor(diff / 1000);
      setWeekendCountdown({
        days: Math.floor(totalS / 86400),
        hours: Math.floor((totalS % 86400) / 3600),
        minutes: Math.floor((totalS % 3600) / 60),
        seconds: totalS % 60,
      });
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  const currentClass = getCurrentClass(timetable);
  const nextClass    = getNextClass(timetable);
  const viewClasses  = timetable.filter(c => c.dayOfWeek === viewDay).sort((a,b) => parseTime(a.startTime) - parseTime(b.startTime));

  const now = new Date();
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const h = now.getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr  = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  const weekType = getCurrentWeekType();

  const glass = darkMode ? 'backdrop-blur-2xl bg-black/20 border-white/10' : 'backdrop-blur-2xl bg-white/40 border-white/60';
  const card  = darkMode ? 'bg-gray-900/60 border-white/10 backdrop-blur-sm' : 'bg-white/60 border-white/70 backdrop-blur-sm';

  const handleDelete = async (id: string) => {
    setTimetable(prev => prev.filter(c => c.id !== id));
    try { await timetableService.delete(id); }
    catch (e: any) { setError(e.message); load(); }
  };

  // Full timetable grid data for selected tab
  const fullGrid = timetableTab === 'A' ? timetable : weekBTimetable;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── HERO ── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between gap-4 flex-wrap pt-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-1">
              {h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'}
            </p>
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 dark:text-white tracking-tight">{greeting}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{dateStr}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
              weekType === 'A'
                ? darkMode ? 'bg-blue-500/15 border-blue-400/20 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
                : darkMode ? 'bg-purple-500/15 border-purple-400/20 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'
            }`}>Week {weekType}</span>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setModal('ics')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${darkMode ? 'bg-white/10 border-white/15 text-gray-200 hover:bg-white/20' : 'bg-white/50 border-white/60 text-gray-700 hover:bg-white/80'}`}>
              <Upload className="w-3.5 h-3.5" /> Import .ics
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => { setEditTarget(null); setModal('add'); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add class
            </motion.button>
          </div>
        </motion.div>

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── IN CLASS BANNER ── */}
        <AnimatePresence>
          {currentClass && (
            <motion.div key="in-class" initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl border ${darkMode ? 'bg-red-500/10 border-red-400/20' : 'bg-red-50/80 border-red-200/60'}`}>
              <span className="relative flex-shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" />
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{currentClass.subject}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{[currentClass.room, currentClass.teacher].filter(Boolean).join(' · ')} · ends {currentClass.endTime}</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-red-500 dark:text-red-400">In class</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── COUNTDOWN / WEEKEND CARD ── */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className={`relative overflow-hidden rounded-3xl border px-8 py-10 text-center ${glass}`}>
          <div className="absolute inset-0 pointer-events-none">
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 rounded-full blur-3xl opacity-30 ${darkMode ? 'bg-emerald-500' : 'bg-emerald-300'}`} />
          </div>
          <div className="relative">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>

            ) : isWeekend ? (
              /* ── WEEKEND MODE ── */
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                  School resumes in
                </p>
                <div className="flex items-start justify-center gap-1.5 mb-6">
                  {weekendCountdown.days > 0 && <>
                    <DigitBlock value={pad2(weekendCountdown.days)} label="days" dark={darkMode} />
                    <Colon dark={darkMode} />
                  </>}
                  <DigitBlock value={pad2(weekendCountdown.hours)} label="hrs" dark={darkMode} />
                  <Colon dark={darkMode} />
                  <DigitBlock value={pad2(weekendCountdown.minutes)} label="min" dark={darkMode} />
                  <Colon dark={darkMode} />
                  <DigitBlock value={pad2(weekendCountdown.seconds)} label="sec" dark={darkMode} />
                </div>
                <p className="text-xl font-light text-gray-900 dark:text-white mb-2">
                  {dayOfWeek === 6 ? 'It\'s Saturday — enjoy the weekend!' : 'It\'s Sunday — almost there!'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {weekType === 'A'
                    ? `Monday starts Week A`
                    : `Monday starts Week B`}
                </p>
              </div>

            ) : timetable.length === 0 ? (
              <div className="py-6">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                <p className="text-lg font-light text-gray-900 dark:text-white mb-2">No timetable yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Import your .ics file or add classes manually</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button onClick={() => setModal('ics')} className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-colors ${darkMode ? 'bg-white/10 border-white/15 text-gray-200 hover:bg-white/20' : 'bg-white/60 border-white/60 text-gray-700 hover:bg-white/90'}`}>Import .ics</button>
                  <button onClick={() => { setEditTarget(null); setModal('add'); }} className="px-5 py-2.5 rounded-full text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">Add class</button>
                </div>
              </div>
            ) : !nextClass ? (
              <div className="py-6">
                <p className="text-5xl mb-4">🎉</p>
                <p className="text-xl font-light text-gray-900 dark:text-white mb-2">No more classes today</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enjoy your free time</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-7">
                  {currentClass ? 'Next up after current class' : 'Next class in'}
                </p>
                <div className="flex items-start justify-center gap-1.5 mb-8">
                  <DigitBlock value={pad2(countdown.hours)}   label="hrs" dark={darkMode} />
                  <Colon dark={darkMode} />
                  <DigitBlock value={pad2(countdown.minutes)} label="min" dark={darkMode} />
                  <Colon dark={darkMode} />
                  <DigitBlock value={pad2(countdown.seconds)} label="sec" dark={darkMode} />
                </div>
                <p className="text-2xl font-light text-gray-900 dark:text-white mb-4 tracking-tight">{nextClass.subject}</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {[
                    { icon: Clock,    text: `${nextClass.startTime}–${nextClass.endTime}` },
                    { icon: MapPin,   text: nextClass.room },
                    { icon: User,     text: nextClass.teacher },
                    { icon: Calendar, text: DAYS[nextClass.dayOfWeek] },
                  ].filter(p => p.text).map((p, i) => {
                    const Icon = p.icon;
                    return (
                      <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-500/10 text-emerald-700'}`}>
                        <Icon className="w-3 h-3" />{p.text}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* ── DAY SCHEDULE ── */}
        {!loading && timetable.length > 0 && (
          <div>
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
              {[1,2,3,4,5].map(d => {
                const count    = timetable.filter(c => c.dayOfWeek === d).length;
                const isToday  = d === now.getDay();
                const isActive = d === viewDay;
                return (
                  <button key={d} onClick={() => setViewDay(d)}
                    className={`flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-2xl transition-all flex-shrink-0 border ${
                      isActive
                        ? darkMode ? 'bg-emerald-500/20 border-emerald-400/25 text-emerald-300' : 'bg-emerald-500/12 border-emerald-300/40 text-emerald-700'
                        : darkMode ? 'bg-white/5 border-white/8 text-gray-400 hover:bg-white/10' : 'bg-white/40 border-white/50 text-gray-500 hover:bg-white/70'
                    }`}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{DAYS_SHORT[d]}</span>
                    <span className={`text-lg font-light ${isActive ? '' : 'text-gray-900 dark:text-white'}`}>{count}</span>
                    {count > 0 && <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-current' : 'bg-emerald-400'}`} />}
                    {isToday && !isActive && <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">Today</span>}
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 px-1">
              {viewDay === now.getDay() ? "Today's schedule" : `${DAYS[viewDay]}'s schedule`}
            </p>

            <div className="space-y-2.5">
              {viewClasses.length === 0 ? (
                <div className={`rounded-2xl border px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-600 border-dashed ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  No classes on {DAYS[viewDay]}
                </div>
              ) : (
                viewClasses.map((cls, i) => {
                  const nowMins = now.getHours() * 60 + now.getMinutes();
                  const startM  = parseTime(cls.startTime);
                  const endM    = parseTime(cls.endTime);
                  const isNow   = viewDay === now.getDay() && startM <= nowMins && endM > nowMins;
                  const isPast  = viewDay === now.getDay() && endM <= nowMins;
                  const isNext  = !isNow && !isPast && viewDay === now.getDay()
                    && viewClasses.findIndex(x => parseTime(x.startTime) > nowMins) === i;
                  return (
                    <motion.div key={cls.id}
                      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all group ${
                        isNow  ? darkMode ? 'bg-emerald-500/10 border-emerald-400/20' : 'bg-emerald-50/80 border-emerald-200/60'
                        : isPast ? darkMode ? 'bg-white/3 border-white/5 opacity-40' : 'bg-white/20 border-white/30 opacity-50'
                        : card
                      }`}>
                      <div className="w-0.5 h-10 rounded-full flex-shrink-0 transition-all group-hover:h-14" style={{ backgroundColor: cls.color }} />
                      <div className="flex-shrink-0 text-right w-16">
                        <p className={`text-sm font-semibold tabular-nums ${isNow ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>{cls.startTime}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-600 tabular-nums">{cls.endTime}</p>
                      </div>
                      <div className={`w-px h-8 flex-shrink-0 ${darkMode ? 'bg-white/10' : 'bg-gray-200/80'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{cls.subject}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{[cls.teacher, cls.room].filter(Boolean).join(' · ')}</p>
                      </div>
                      {isNow  && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex-shrink-0">Now</span>}
                      {isNext && <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 flex-shrink-0">Next</span>}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => { setEditTarget(cls); setModal('edit'); }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(cls.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── FULL TIMETABLE (Week A / Week B) ── */}
        {!loading && timetable.length > 0 && (
          <div>
            <button
              onClick={() => setShowFullTimetable(v => !v)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${card} hover:opacity-80`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold text-sm text-gray-900 dark:text-white">Full Timetable</span>
                <div className="flex gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    timetableTab === 'A'
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      : 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                  }`}>Week {timetableTab}</span>
                </div>
              </div>
              {showFullTimetable
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />
              }
            </button>

            <AnimatePresence>
              {showFullTimetable && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-4">
                    {/* Week A / B tabs */}
                    <div className="flex gap-2">
                      {(['A', 'B'] as const).map(w => (
                        <button key={w} onClick={() => setTimetableTab(w)}
                          className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                            timetableTab === w
                              ? w === 'A'
                                ? darkMode ? 'bg-blue-500/20 border-blue-400/25 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
                                : darkMode ? 'bg-purple-500/20 border-purple-400/25 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'
                              : darkMode ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10' : 'bg-white/40 border-white/50 text-gray-500 hover:bg-white/70'
                          }`}>
                          Week {w}
                          {w === weekType && (
                            <span className="ml-1.5 text-[9px] font-semibold opacity-70">(this week)</span>
                          )}
                        </button>
                      ))}
                      {weekBTimetable.length === 0 && timetableTab === 'B' && (
                        <span className="text-xs text-gray-400 dark:text-gray-600 self-center ml-2">
                          Import .ics to populate Week B
                        </span>
                      )}
                    </div>

                    {/* Grid: one column per weekday */}
                    <div className="grid grid-cols-5 gap-2">
                      {[1,2,3,4,5].map(dayNum => {
                        const dayClasses = fullGrid
                          .filter(c => c.dayOfWeek === dayNum)
                          .sort((a,b) => parseTime(a.startTime) - parseTime(b.startTime));
                        const isToday = dayNum === now.getDay() && !isWeekend && timetableTab === weekType;
                        return (
                          <div key={dayNum}>
                            <div className={`text-center py-1.5 mb-2 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                              isToday
                                ? darkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-500/12 text-emerald-700'
                                : 'text-gray-400 dark:text-gray-600'
                            }`}>
                              {DAYS_SHORT[dayNum]}
                            </div>
                            <div className="space-y-1.5">
                              {dayClasses.length === 0 ? (
                                <div className={`rounded-xl py-3 text-center text-[10px] text-gray-300 dark:text-gray-700 border border-dashed ${darkMode ? 'border-white/8' : 'border-gray-200'}`}>
                                  —
                                </div>
                              ) : (
                                dayClasses.map(cls => (
                                  <div key={cls.id}
                                    className={`rounded-xl p-2 border text-left transition-all ${card}`}
                                    style={{ borderLeftColor: cls.color, borderLeftWidth: '3px' }}>
                                    <p className="text-[11px] font-semibold text-gray-900 dark:text-white leading-tight truncate">{cls.subject}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">{cls.startTime}</p>
                                    {cls.room && <p className="text-[10px] text-gray-400 dark:text-gray-600 truncate">{cls.room}</p>}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {(modal === 'add' || modal === 'edit') && (
          <ClassModal dark={darkMode} existing={editTarget} onClose={() => setModal('none')}
            onSave={async cls => { await timetableService.upsert(cls); await load(); setModal('none'); setViewDay(cls.dayOfWeek); }} />
        )}
        {modal === 'ics' && (
          <IcsModal dark={darkMode} onClose={() => setModal('none')}
            onImport={async (weekA, weekB) => {
              // Save BOTH weeks to Supabase with the week column
              await timetableService.replaceBothWeeks(weekA, weekB);
              await load();
              setModal('none');
              const d = new Date().getDay();
              setViewDay(d === 0 || d === 6 ? 1 : d);
            }} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── DIGIT BLOCK ───────────────────────────────────────────────────────
function DigitBlock({ value, label, dark }: { value: string; label: string; dark: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.div key={value} initial={{ y: -6, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.1 }}
        className={`min-w-[72px] px-3 py-4 rounded-2xl border text-center font-mono text-4xl md:text-5xl font-light tabular-nums ${dark ? 'bg-white/8 border-white/12 text-white' : 'bg-white/50 border-white/70 text-gray-900'}`}>
        {value}
      </motion.div>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">{label}</span>
    </div>
  );
}

function Colon({ dark }: { dark: boolean }) {
  return <span className={`text-3xl font-light mt-3 select-none ${dark ? 'text-white/20' : 'text-gray-300'}`}>:</span>;
}

// ── CLASS MODAL ───────────────────────────────────────────────────────
function ClassModal({ dark, existing, onClose, onSave }: {
  dark: boolean; existing: ClassPeriod | null; onClose: () => void; onSave: (c: ClassPeriod) => Promise<void>;
}) {
  const [subject, setSubject] = useState(existing?.subject  ?? '');
  const [teacher, setTeacher] = useState(existing?.teacher  ?? '');
  const [room,    setRoom]    = useState(existing?.room     ?? '');
  const [day,     setDay]     = useState(existing?.dayOfWeek ?? 1);
  const [start,   setStart]   = useState(existing?.startTime ?? '09:00');
  const [end,     setEnd]     = useState(existing?.endTime   ?? '10:00');
  const [color,   setColor]   = useState(existing?.color    ?? COLORS[0]);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  const submit = async () => {
    setErr('');
    if (!subject.trim()) { setErr('Subject is required'); return; }
    if (parseTime(start) >= parseTime(end)) { setErr('End time must be after start time'); return; }
    setSaving(true);
    try { await onSave({ id: existing?.id ?? genId(), subject: subject.trim(), teacher: teacher.trim(), room: room.trim(), dayOfWeek: day, startTime: start, endTime: end, color }); }
    catch (e: any) { setErr(e.message); setSaving(false); }
  };

  const bg  = dark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200';
  const inp = dark ? 'bg-white/8 border-white/10 text-white placeholder-gray-600 focus:border-emerald-500/50'
                   : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-400';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${bg}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{existing ? 'Edit class' : 'Add class'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <Inp label="Subject" value={subject} onChange={setSubject} placeholder="e.g. Mathematics" inp={inp} />
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Teacher" value={teacher} onChange={setTeacher} placeholder="Mr Smith" inp={inp} />
            <Inp label="Room"    value={room}    onChange={setRoom}    placeholder="Room 204"  inp={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Day</label>
            <select value={day} onChange={e => setDay(+e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors ${inp}`}>
              {[1,2,3,4,5].map(d => <option key={d} value={d}>{DAYS[d]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Start" type="time" value={start} onChange={setStart} inp={inp} />
            <Inp label="End"   type="time" value={end}   onChange={setEnd}   inp={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Colour</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          {err && <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">{err}</p>}
        </div>
        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
          <motion.button onClick={submit} disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Add class'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── ICS MODAL ─────────────────────────────────────────────────────────
// ── ICS MODAL — file upload, separate Week A and Week B ──────────────
function IcsModal({ dark, onClose, onImport }: {
  dark: boolean; onClose: () => void;
  onImport: (weekA: ClassPeriod[], weekB: ClassPeriod[]) => Promise<void>;
}) {
  const [weekA, setWeekA] = React.useState<ClassPeriod[] | null>(null);
  const [weekB, setWeekB] = React.useState<ClassPeriod[] | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'A' | 'B'>('A');

  const readFile = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res(e.target?.result as string ?? '');
      r.onerror = () => rej(new Error('Could not read file'));
      r.readAsText(file);
    });

  const handleFile = async (file: File, week: 'A' | 'B') => {
    setErr('');
    try {
      const text = await readFile(file);
      if (!text.includes('BEGIN:VCALENDAR')) { setErr(`Week ${week}: not a valid ICS file`); return; }
      const parsed = parseIcsToClasses(text);
      if (!parsed.length) { setErr(`Week ${week}: no weekday classes found`); return; }
      if (week === 'A') setWeekA(parsed); else setWeekB(parsed);
    } catch (e: any) { setErr(e.message); }
  };

  const doImport = async () => {
    setErr('');
    if (!weekA) { setErr('Please upload Week A first'); return; }
    if (!weekB) { setErr('Please upload Week B first'); return; }
    setSaving(true);
    try { await onImport(weekA, weekB); }
    catch (e: any) { setErr(e.message); setSaving(false); }
  };

  const bg  = dark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200';

  const UploadZone = ({ week, data, accent }: { week: 'A' | 'B'; data: ClassPeriod[] | null; accent: string }) => (
    <label className={`relative block w-full rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
      data
        ? week === 'A'
          ? 'border-blue-400/50 bg-blue-500/5'
          : 'border-purple-400/50 bg-purple-500/5'
        : dark ? 'border-white/10 hover:border-white/20' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <input type="file" accept=".ics" className="sr-only"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, week); e.target.value = ''; }} />
      {data ? (
        <>
          <div className={`text-2xl font-mono font-light mb-1 ${week === 'A' ? 'text-blue-500' : 'text-purple-500'}`}>{data.length}</div>
          <div className={`text-xs font-mono ${week === 'A' ? 'text-blue-500 dark:text-blue-400' : 'text-purple-500 dark:text-purple-400'}`}>classes imported</div>
          <div className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 font-mono">click to replace</div>
        </>
      ) : (
        <>
          <Upload className={`w-6 h-6 mx-auto mb-2 ${dark ? 'text-gray-600' : 'text-gray-400'}`} />
          <div className={`text-xs font-mono font-medium ${week === 'A' ? 'text-blue-500 dark:text-blue-400' : 'text-purple-500 dark:text-purple-400'}`}>
            Week {week}
          </div>
          <div className={`text-[10px] font-mono mt-0.5 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>drop .ics or click</div>
        </>
      )}
    </label>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${bg}`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold font-mono text-gray-900 dark:text-white">import timetable</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
          export each week from sentral as a separate <strong className="text-gray-700 dark:text-gray-300">.ics</strong> file and upload below.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <UploadZone week="A" data={weekA} accent="blue" />
          <UploadZone week="B" data={weekB} accent="purple" />
        </div>

        {err && <p className="text-xs font-mono text-red-500 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20 mb-3">{err}</p>}
        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-mono font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">cancel</button>
          <motion.button onClick={doImport} disabled={saving || !weekA || !weekB} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-sm font-mono font-medium text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'importing…' : 'import both weeks'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}


function Inp({ label, value, onChange, placeholder, type = 'text', inp }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; inp: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors ${inp}`} />
    </div>
  );
}
