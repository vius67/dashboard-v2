import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, User, Calendar, Plus, X, Trash2, Loader2, Upload, Pencil } from 'lucide-react';
import { timetableService } from '../../lib/db';
import { getNextClass, getCurrentClass, getTodaysClasses, getTimeUntil, getDayName } from '../utils/timeUtils';
import { ClassPeriod } from '../types';
import { useApp } from '../context/AppContext';

const COLORS = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const SKIP_KEYWORDS = ['WSREC','BADMINTON','CARE:','ADMIN'];

const SUBJECT_COLORS: Record<string, string> = {
  'Mathematics': COLORS[0],
  'English':     COLORS[1],
  'Science':     COLORS[2],
  'iSTEM':       COLORS[3],
  'German':      COLORS[4],
  'Geography':   COLORS[5],
  'History':     COLORS[6],
  'PDHPE':       COLORS[7],
  'Enterprise':  COLORS[8],
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
// Term starts W05 2026 = Week A (odd ISO weeks = A, even = B)
function getCurrentWeekType(): 'A' | 'B' {
  const isoWeek = (() => {
    const d = new Date();
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  })();
  return isoWeek % 2 === 1 ? 'A' : 'B';
}

// ── ICS PARSER ───────────────────────────────────────────────────────
// FIX: dedup by (day + CLEANED subject name + period slot) and when the
// same subject appears at two different times on the same day (Week A vs B),
// keep only the one matching the current school week.
function parseIcsToClasses(text: string): ClassPeriod[] {
  const blocks = text.split('BEGIN:VEVENT').slice(1);
  const weekType = getCurrentWeekType();

  // First pass: collect all events with their ISO week
  interface RawEvent {
    summary: string;
    cleanSubject: string;
    teacher: string;
    room: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    color: string;
    isoWeek: number;
    weekType: 'A' | 'B';
  }

  const rawEvents: RawEvent[] = [];
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
    const teacherMatch = desc.replace(/\\n/g, '\n').match(/Teacher:\s*([^\n]+)/);
    if (teacherMatch) teacher = teacherMatch[1].trim();

    // Parse UTC datetime
    const parseUtc = (s: string) => {
      const clean = s.replace('Z', '');
      const yr = +clean.slice(0,4), mo = +clean.slice(4,6)-1, dy = +clean.slice(6,8);
      const hr = +clean.slice(9,11), mn = +clean.slice(11,13);
      return new Date(Date.UTC(yr, mo, dy, hr, mn, 0));
    };

    const utcStart = parseUtc(dtstart);
    const utcEnd   = parseUtc(dtend);
    const offsetMs = 11 * 60 * 60 * 1000; // AEDT = UTC+11
    const localStart = new Date(utcStart.getTime() + offsetMs);
    const localEnd   = new Date(utcEnd.getTime()   + offsetMs);

    const dayOfWeek = localStart.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const startTime = `${pad2(localStart.getUTCHours())}:${pad2(localStart.getUTCMinutes())}`;
    const endTime   = `${pad2(localEnd.getUTCHours())}:${pad2(localEnd.getUTCMinutes())}`;

    // Calculate ISO week of this event
    const d2 = new Date(utcStart);
    const dayNum = d2.getUTCDay() || 7;
    d2.setUTCDate(d2.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d2.getUTCFullYear(), 0, 1));
    const eventIsoWeek = Math.ceil((((d2.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const eventWeekType: 'A' | 'B' = eventIsoWeek % 2 === 1 ? 'A' : 'B';

    // Clean subject: strip class code prefix like "10MATE: "
    const cleanSubject = summary.replace(/^10\w+:\s*/, '').trim();

    rawEvents.push({
      summary,
      cleanSubject,
      teacher,
      room: location,
      dayOfWeek,
      startTime,
      endTime,
      color: getSubjectColor(summary, colorIndex++),
      isoWeek: eventIsoWeek,
      weekType: eventWeekType,
    });
  }

  // Second pass: for each (day, cleanSubject) group, pick the right week
  // If the subject appears in both Week A and Week B slots (different times),
  // keep only the current week type. If it's the same slot in both weeks, dedup.
  const byDaySubject = new Map<string, RawEvent[]>();
  for (const e of rawEvents) {
    const key = `${e.dayOfWeek}|${e.cleanSubject}`;
    if (!byDaySubject.has(key)) byDaySubject.set(key, []);
    byDaySubject.get(key)!.push(e);
  }

  const result: ClassPeriod[] = [];
  const addedKeys = new Set<string>();

  for (const [, events] of byDaySubject) {
    // Deduplicate by startTime within this group
    const byStartTime = new Map<string, RawEvent[]>();
    for (const e of events) {
      if (!byStartTime.has(e.startTime)) byStartTime.set(e.startTime, []);
      byStartTime.get(e.startTime)!.push(e);
    }

    const uniqueSlots = Array.from(byStartTime.keys());

    if (uniqueSlots.length === 1) {
      // Same time in both weeks — just take first occurrence
      const e = byStartTime.get(uniqueSlots[0])![0];
      const dk = `${e.dayOfWeek}|${e.cleanSubject}|${e.startTime}`;
      if (!addedKeys.has(dk)) {
        addedKeys.add(dk);
        result.push({ id: genId(), subject: e.cleanSubject, teacher: e.teacher, room: e.room, dayOfWeek: e.dayOfWeek, startTime: e.startTime, endTime: e.endTime, color: e.color });
      }
    } else {
      // Subject appears at different times → Week A vs Week B conflict
      // Pick the slot that belongs to the current week type
      for (const [slotTime, slotEvents] of byStartTime) {
        const hasCurrentWeek = slotEvents.some(e => e.weekType === weekType);
        if (hasCurrentWeek) {
          const e = slotEvents.find(ev => ev.weekType === weekType) ?? slotEvents[0];
          const dk = `${e.dayOfWeek}|${e.cleanSubject}|${slotTime}`;
          if (!addedKeys.has(dk)) {
            addedKeys.add(dk);
            result.push({ id: genId(), subject: e.cleanSubject, teacher: e.teacher, room: e.room, dayOfWeek: e.dayOfWeek, startTime: slotTime, endTime: e.endTime, color: e.color });
          }
          break; // only one slot per subject per day
        }
      }
    }
  }

  return result.sort((a, b) => a.dayOfWeek - b.dayOfWeek || parseTime(a.startTime) - parseTime(b.startTime));
}

type Modal = 'none' | 'add' | 'edit' | 'ics';

export default function Dashboard() {
  const { darkMode } = useApp();
  const [timetable, setTimetable] = useState<ClassPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<Modal>('none');
  const [editTarget, setEditTarget] = useState<ClassPeriod | null>(null);
  const [viewDay, setViewDay] = useState(() => {
    const d = new Date().getDay();
    return (d === 0 || d === 6) ? 1 : d;
  });

  // ── FIX: match getTimeUntil's actual return shape { hours, minutes, seconds } ──
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [, setTick] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try { setLoading(true); setTimetable(await timetableService.getAll()); setError(''); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  // ── FIX: use correct property names from getTimeUntil ──
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    const next = getNextClass(timetable);
    if (!next) return;
    const update = () => {
      const result = getTimeUntil(next.startTime, next.dayOfWeek);
      // getTimeUntil returns { days, hours, minutes, seconds }
      setCountdown({ hours: result.hours, minutes: result.minutes, seconds: result.seconds });
    };
    update();
    countdownRef.current = setInterval(update, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [timetable]);

  const currentClass = getCurrentClass(timetable);
  const nextClass    = getNextClass(timetable);
  const viewClasses  = timetable
    .filter(c => c.dayOfWeek === viewDay)
    .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

  const now = new Date();
  const h = now.getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr  = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  const weekType = getCurrentWeekType();

  const glass = darkMode
    ? 'backdrop-blur-2xl bg-black/20 border-white/10'
    : 'backdrop-blur-2xl bg-white/40 border-white/60';

  const card = darkMode
    ? 'bg-gray-900/60 border-white/10 backdrop-blur-sm'
    : 'bg-white/60 border-white/70 backdrop-blur-sm';

  const handleDelete = async (id: string) => {
    setTimetable(prev => prev.filter(c => c.id !== id));
    try { await timetableService.delete(id); }
    catch (e: any) { setError(e.message); load(); }
  };

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
            {/* Week badge */}
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
              weekType === 'A'
                ? darkMode ? 'bg-blue-500/15 border-blue-400/20 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
                : darkMode ? 'bg-purple-500/15 border-purple-400/20 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'
            }`}>
              Week {weekType}
            </span>
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

        {/* ── COUNTDOWN CARD ── */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className={`relative overflow-hidden rounded-3xl border px-8 py-10 text-center ${glass}`}>
          <div className="absolute inset-0 pointer-events-none">
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 rounded-full blur-3xl opacity-30 ${darkMode ? 'bg-emerald-500' : 'bg-emerald-300'}`} />
          </div>
          <div className="relative">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
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
                  {/* FIX: use countdown.hours, countdown.minutes, countdown.seconds */}
                  <DigitBlock value={pad2(countdown.hours)}  label="hrs" dark={darkMode} />
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
                const isToday  = d === new Date().getDay();
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
              {viewDay === new Date().getDay() ? "Today's schedule" : `${DAYS[viewDay]}'s schedule`}
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
                  const isNow  = viewDay === now.getDay() && startM <= nowMins && endM > nowMins;
                  const isPast = viewDay === now.getDay() && endM <= nowMins;
                  const isNext = !isNow && !isPast && viewDay === now.getDay()
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
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {(modal === 'add' || modal === 'edit') && (
          <ClassModal dark={darkMode} existing={editTarget} onClose={() => setModal('none')}
            onSave={async cls => { await timetableService.upsert(cls); await load(); setModal('none'); setViewDay(cls.dayOfWeek); }} />
        )}
        {modal === 'ics' && (
          <IcsModal dark={darkMode} onClose={() => setModal('none')} currentWeek={weekType}
            onImport={async periods => {
              await timetableService.replaceAll(periods); await load(); setModal('none');
              const d = new Date().getDay(); setViewDay(d === 0 || d === 6 ? 1 : d);
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
        className={`min-w-[80px] px-4 py-4 rounded-2xl border text-center font-mono text-4xl md:text-5xl font-light tabular-nums ${dark ? 'bg-white/8 border-white/12 text-white' : 'bg-white/50 border-white/70 text-gray-900'}`}>
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
function IcsModal({ dark, onClose, onImport, currentWeek }: {
  dark: boolean; onClose: () => void; onImport: (p: ClassPeriod[]) => Promise<void>; currentWeek: 'A' | 'B';
}) {
  const [text,   setText]   = useState('');
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const doImport = async () => {
    setErr('');
    if (!text.trim()) { setErr('Paste your .ics data first'); return; }
    if (!text.includes('BEGIN:VCALENDAR')) { setErr("Doesn't look like valid ICS data — copy the full file contents."); return; }
    const parsed = parseIcsToClasses(text);
    if (!parsed.length) { setErr('No weekday classes found. Make sure you paste the full .ics file.'); return; }
    setSaving(true);
    try { await onImport(parsed); }
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
        className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl ${bg}`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Import calendar (.ics)</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 leading-relaxed">
          Export from Sentral as <strong className="font-semibold text-gray-700 dark:text-gray-300">.ics</strong>, open in a text editor, copy everything, paste below.
        </p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">
          ✓ Times auto-converted to AEDT &nbsp;·&nbsp; ✓ Weekends skipped &nbsp;·&nbsp; ✓ Week A/B filtered automatically
        </p>
        <p className={`text-xs mb-4 font-semibold ${currentWeek === 'A' ? 'text-blue-500' : 'text-purple-500'}`}>
          This week is Week {currentWeek} — importing will keep only Week {currentWeek} classes for each day.
        </p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={9}
          placeholder={"BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\n..."}
          className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors ${inp}`} />
        {err && <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20 mt-3">{err}</p>}
        <div className="flex gap-2.5 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
          <motion.button onClick={doImport} disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Importing…' : 'Import timetable'}
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
