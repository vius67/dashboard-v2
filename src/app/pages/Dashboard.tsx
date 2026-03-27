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

function genId() { return `c-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }
function parseTime(t: string) { const [h,m]=t.split(':').map(Number); return h*60+m; }

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
  const [countdown, setCountdown] = useState({ h:0, m:0, s:0 });
  const [tick, setTick] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const load = useCallback(async () => {
    try { setLoading(true); setTimetable(await timetableService.getAll()); setError(''); }
    catch (e:any) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Tick every 30s to re-evaluate current/next class
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t+1), 30000);
    return () => clearInterval(iv);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    const next = getNextClass(timetable);
    if (!next) return;
    const update = () => {
      const t = getTimeUntil(next.startTime, next.dayOfWeek);
      setCountdown(t);
    };
    update();
    countdownRef.current = setInterval(update, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [timetable, tick]);

  const currentClass = getCurrentClass(timetable);
  const nextClass = getNextClass(timetable);
  const todayClasses = getTodaysClasses(timetable);
  const viewClasses = timetable.filter(c => c.dayOfWeek === viewDay).sort((a,b) => parseTime(a.startTime)-parseTime(b.startTime));

  const now = new Date();
  const h = now.getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' });

  const glass = darkMode
    ? 'backdrop-blur-2xl bg-black/20 border-white/10'
    : 'backdrop-blur-2xl bg-white/40 border-white/60';

  const card = darkMode
    ? 'bg-gray-900/60 border-white/10 backdrop-blur-sm'
    : 'bg-white/60 border-white/70 backdrop-blur-sm';

  const handleDelete = async (id: string) => {
    setTimetable(prev => prev.filter(c => c.id !== id));
    try { await timetableService.delete(id); }
    catch (e:any) { setError(e.message); load(); }
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── HERO ── */}
        <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="flex items-end justify-between gap-4 flex-wrap pt-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-1">
              {h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'}
            </p>
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 dark:text-white tracking-tight">
              {greeting}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{dateStr}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
              onClick={() => setModal('ics')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${darkMode ? 'bg-white/10 border-white/15 text-gray-200 hover:bg-white/20' : 'bg-white/50 border-white/60 text-gray-700 hover:bg-white/80'}`}>
              <Upload className="w-3.5 h-3.5" /> Import .ics
            </motion.button>
            <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
              onClick={() => { setEditTarget(null); setModal('add'); }}
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
            <motion.div key="in-class" initial={{ opacity:0, y:-10, scale:0.98 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-10, scale:0.98 }}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl border ${darkMode ? 'bg-red-500/10 border-red-400/20' : 'bg-red-50/80 border-red-200/60'}`}>
              <span className="relative flex-shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" />
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{currentClass.subject}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{currentClass.room} · {currentClass.teacher} · ends {currentClass.endTime}</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-red-500 dark:text-red-400">In class</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── COUNTDOWN CARD ── */}
        <motion.div initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.1 }}
          className={`relative overflow-hidden rounded-3xl border px-8 py-10 text-center ${glass}`}>

          {/* Glow effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 rounded-full blur-3xl opacity-30 ${darkMode ? 'bg-emerald-500' : 'bg-emerald-300'}`} />
          </div>

          <div className="relative">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : timetable.length === 0 ? (
              <div className="py-6">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                <p className="text-lg font-light text-gray-900 dark:text-white mb-2">No timetable yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Import your .ics file or add classes manually</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button onClick={() => setModal('ics')} className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-colors ${darkMode ? 'bg-white/10 border-white/15 text-gray-200 hover:bg-white/20' : 'bg-white/60 border-white/60 text-gray-700 hover:bg-white/90'}`}>
                    Import .ics
                  </button>
                  <button onClick={() => { setEditTarget(null); setModal('add'); }} className="px-5 py-2.5 rounded-full text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">
                    Add class
                  </button>
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

                {/* Digit blocks */}
                <div className="flex items-start justify-center gap-1.5 mb-8">
                  {(countdown.h > 0 || countdown.h === 0) && (
                    <>
                      <DigitBlock value={pad(countdown.h)} label="hrs" dark={darkMode} />
                      <Colon dark={darkMode} />
                    </>
                  )}
                  <DigitBlock value={pad(countdown.m)} label="min" dark={darkMode} />
                  <Colon dark={darkMode} />
                  <DigitBlock value={pad(countdown.s)} label="sec" dark={darkMode} />
                </div>

                {/* Subject name */}
                <p className="text-2xl font-light text-gray-900 dark:text-white mb-4 tracking-tight">
                  {nextClass.subject}
                </p>

                {/* Meta pills */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {[
                    { icon: Clock, text: `${nextClass.startTime}–${nextClass.endTime}` },
                    { icon: MapPin, text: nextClass.room },
                    { icon: User, text: nextClass.teacher },
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
            {/* Day tabs */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
              {[1,2,3,4,5].map(d => {
                const count = timetable.filter(c => c.dayOfWeek === d).length;
                const isToday = d === new Date().getDay();
                const isActive = d === viewDay;
                return (
                  <button key={d} onClick={() => setViewDay(d)}
                    className={`flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-2xl transition-all flex-shrink-0 border ${
                      isActive
                        ? darkMode
                          ? 'bg-emerald-500/20 border-emerald-400/25 text-emerald-300'
                          : 'bg-emerald-500/12 border-emerald-300/40 text-emerald-700'
                        : darkMode
                          ? 'bg-white/5 border-white/8 text-gray-400 hover:bg-white/10'
                          : 'bg-white/40 border-white/50 text-gray-500 hover:bg-white/70'
                    }`}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{DAYS_SHORT[d]}</span>
                    <span className={`text-lg font-light ${isActive ? '' : 'text-gray-900 dark:text-white'}`}>{count}</span>
                    {count > 0 && (
                      <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-current' : 'bg-emerald-400'}`} />
                    )}
                    {isToday && !isActive && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">Today</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Section label */}
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 px-1">
              {viewDay === new Date().getDay() ? "Today's schedule" : `${DAYS[viewDay]}'s schedule`}
            </p>

            {/* Class list */}
            <div className="space-y-2.5">
              {viewClasses.length === 0 ? (
                <div className={`rounded-2xl border px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-600 border-dashed ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  No classes on {DAYS[viewDay]}
                </div>
              ) : (
                viewClasses.map((cls, i) => {
                  const nowMins = new Date().getHours()*60+new Date().getMinutes();
                  const startM = parseTime(cls.startTime);
                  const endM = parseTime(cls.endTime);
                  const isNow = viewDay===new Date().getDay() && startM<=nowMins && endM>nowMins;
                  const isPast = viewDay===new Date().getDay() && endM<=nowMins;
                  const isNext = !isNow && !isPast && viewDay===new Date().getDay()
                    && viewClasses.findIndex(x=>parseTime(x.startTime)>nowMins)===i;

                  return (
                    <motion.div key={cls.id}
                      initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}
                      className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all group ${
                        isNow
                          ? darkMode ? 'bg-emerald-500/10 border-emerald-400/20' : 'bg-emerald-50/80 border-emerald-200/60'
                          : isPast
                            ? darkMode ? 'bg-white/3 border-white/5 opacity-40' : 'bg-white/20 border-white/30 opacity-50'
                            : card
                      }`}>

                      {/* Colour bar */}
                      <div className="w-0.5 h-10 rounded-full flex-shrink-0 transition-all group-hover:h-14" style={{ backgroundColor: cls.color }} />

                      {/* Time */}
                      <div className="flex-shrink-0 text-right w-16">
                        <p className={`text-sm font-semibold tabular-nums ${isNow ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>{cls.startTime}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-600 tabular-nums">{cls.endTime}</p>
                      </div>

                      {/* Divider */}
                      <div className={`w-px h-8 flex-shrink-0 ${darkMode ? 'bg-white/10' : 'bg-gray-200/80'}`} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{cls.subject}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {[cls.teacher, cls.room].filter(Boolean).join(' · ')}
                        </p>
                      </div>

                      {/* Badge */}
                      {isNow && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex-shrink-0">Now</span>}
                      {isNext && <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 flex-shrink-0">Next</span>}

                      {/* Actions */}
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
          <ClassModal
            dark={darkMode}
            existing={editTarget}
            onClose={() => setModal('none')}
            onSave={async cls => {
              await timetableService.upsert(cls);
              await load();
              setModal('none');
              setViewDay(cls.dayOfWeek);
            }}
          />
        )}
        {modal === 'ics' && (
          <IcsModal
            dark={darkMode}
            onClose={() => setModal('none')}
            onImport={async periods => {
              await timetableService.replaceAll(periods);
              await load();
              setModal('none');
              const d = new Date().getDay();
              setViewDay(d===0||d===6 ? 1 : d);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── DIGIT BLOCK ───────────────────────────────────────────────────────
function DigitBlock({ value, label, dark }: { value: string; label: string; dark: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.div
        key={value}
        initial={{ y: -6, opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.1 }}
        className={`min-w-[80px] px-4 py-4 rounded-2xl border text-center font-mono text-4xl md:text-5xl font-light tabular-nums ${dark ? 'bg-white/8 border-white/12 text-white' : 'bg-white/50 border-white/70 text-gray-900'}`}>
        {value}
      </motion.div>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">{label}</span>
    </div>
  );
}

function Colon({ dark }: { dark: boolean }) {
  return (
    <span className={`text-3xl font-light mt-3 select-none ${dark ? 'text-white/20' : 'text-gray-300'}`}>:</span>
  );
}

// ── CLASS MODAL ───────────────────────────────────────────────────────
function ClassModal({ dark, existing, onClose, onSave }: {
  dark: boolean;
  existing: ClassPeriod | null;
  onClose: () => void;
  onSave: (c: ClassPeriod) => Promise<void>;
}) {
  const [subject, setSubject] = useState(existing?.subject ?? '');
  const [teacher, setTeacher] = useState(existing?.teacher ?? '');
  const [room, setRoom] = useState(existing?.room ?? '');
  const [day, setDay] = useState(existing?.dayOfWeek ?? 1);
  const [start, setStart] = useState(existing?.startTime ?? '09:00');
  const [end, setEnd] = useState(existing?.endTime ?? '10:00');
  const [color, setColor] = useState(existing?.color ?? COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    if (!subject.trim()) { setErr('Subject is required'); return; }
    if (parseTime(start) >= parseTime(end)) { setErr('End time must be after start time'); return; }
    setSaving(true);
    try {
      await onSave({ id: existing?.id ?? `c-${Date.now()}`, subject: subject.trim(), teacher: teacher.trim(), room: room.trim(), dayOfWeek: day, startTime: start, endTime: end, color });
    } catch (e:any) { setErr(e.message); setSaving(false); }
  };

  const bg = dark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200';
  const inp = dark
    ? 'bg-white/8 border-white/10 text-white placeholder-gray-600 focus:border-emerald-500/50'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-400';

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => e.target===e.currentTarget && onClose()}>
      <motion.div initial={{ scale:0.96, opacity:0, y:12 }} animate={{ scale:1, opacity:1, y:0 }} exit={{ scale:0.96, opacity:0, y:12 }}
        transition={{ type:'spring', stiffness:320, damping:28 }}
        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${bg}`}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{existing ? 'Edit class' : 'Add class'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          {/* Subject */}
          <Inp label="Subject" value={subject} onChange={setSubject} placeholder="e.g. Mathematics" inp={inp} />

          <div className="grid grid-cols-2 gap-3">
            <Inp label="Teacher" value={teacher} onChange={setTeacher} placeholder="Mr Smith" inp={inp} />
            <Inp label="Room" value={room} onChange={setRoom} placeholder="Room 204" inp={inp} />
          </div>

          {/* Day */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Day</label>
            <select value={day} onChange={e => setDay(+e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors ${inp}`}>
              {[1,2,3,4,5].map(d => <option key={d} value={d}>{DAYS[d]}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Inp label="Start" type="time" value={start} onChange={setStart} inp={inp} />
            <Inp label="End" type="time" value={end} onChange={setEnd} inp={inp} />
          </div>

          {/* Colours */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Colour</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color===c ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c, ringOffsetColor: dark ? '#111827' : '#fff' }} />
              ))}
            </div>
          </div>

          {err && <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">{err}</p>}
        </div>

        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <motion.button onClick={submit} disabled={saving} whileHover={{ scale:1.01 }} whileTap={{ scale:0.99 }}
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
function IcsModal({ dark, onClose, onImport }: {
  dark: boolean;
  onClose: () => void;
  onImport: (periods: ClassPeriod[]) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const dayMap: Record<string,number> = { SU:0, MO:1, TU:2, WE:3, TH:4, FR:5, SA:6 };

  const doImport = async () => {
    setErr('');
    if (!text.trim()) { setErr('Paste your .ics data first'); return; }
    if (!text.includes('BEGIN:VCALENDAR')) { setErr("This doesn't look like valid ICS data. Copy the full file contents."); return; }

    const get = (block: string, key: string) => {
      const m = block.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`));
      return m ? m[1].trim() : '';
    };

    const blocks = text.split('BEGIN:VEVENT').slice(1);
    if (!blocks.length) { setErr('No events found in this file.'); return; }

    const parsed: ClassPeriod[] = [];
    for (const block of blocks) {
      const summary = get(block,'SUMMARY');
      const dtstart = get(block,'DTSTART');
      if (!summary || !dtstart) continue;
      const rrule = get(block,'RRULE');
      const dtend = get(block,'DTEND');
      const location = get(block,'LOCATION');

      let dayOfWeek = 1;
      if (rrule) {
        const bd = rrule.match(/BYDAY=([A-Z,]+)/);
        if (bd) dayOfWeek = dayMap[bd[1].split(',')[0].replace(/[-\d]/g,'')] ?? 1;
      } else {
        const ds = dtstart.replace(/[TZ]/g,'');
        if (ds.length >= 8) dayOfWeek = new Date(`${ds.slice(0,4)}-${ds.slice(4,6)}-${ds.slice(6,8)}`).getDay();
      }
      if (dayOfWeek===0||dayOfWeek===6) continue;

      const pt = (d: string) => { const t=d.replace(/.*T/,'').replace('Z',''); return t.length>=4?`${t.slice(0,2)}:${t.slice(2,4)}`:'09:00'; };
      const startTime = pt(dtstart);
      const endTime = dtend ? pt(dtend) : `${(parseInt(startTime.split(':')[0])+1).toString().padStart(2,'0')}:${startTime.split(':')[1]}`;

      parsed.push({
        id: `ics-${Date.now()}-${parsed.length}`,
        subject: summary, teacher: '', room: location || '',
        dayOfWeek, startTime, endTime,
        color: COLORS[parsed.length % COLORS.length],
      });
    }

    if (!parsed.length) { setErr('No weekday classes found. Check your ICS file has recurring weekday events.'); return; }
    setSaving(true);
    try { await onImport(parsed); }
    catch (e:any) { setErr(e.message); setSaving(false); }
  };

  const bg = dark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200';
  const inp = dark
    ? 'bg-white/8 border-white/10 text-white placeholder-gray-600 focus:border-emerald-500/50'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-400';

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => e.target===e.currentTarget && onClose()}>
      <motion.div initial={{ scale:0.96, opacity:0, y:12 }} animate={{ scale:1, opacity:1, y:0 }} exit={{ scale:0.96, opacity:0, y:12 }}
        transition={{ type:'spring', stiffness:320, damping:28 }}
        className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl ${bg}`}>

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Import calendar</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
          Export your timetable from Google Calendar, Apple Calendar, or Outlook as an <strong className="font-semibold text-gray-700 dark:text-gray-300">.ics</strong> file, open it in a text editor, copy everything, and paste it below.
          <br /><span className="text-xs text-amber-500 dark:text-amber-400 mt-1 block">⚠ This will replace your current timetable.</span>
        </p>

        <textarea value={text} onChange={e => setText(e.target.value)} rows={9}
          placeholder={"BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\n..."}
          className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors ${inp}`} />

        {err && <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20 mt-3">{err}</p>}

        <div className="flex gap-2.5 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <motion.button onClick={doImport} disabled={saving} whileHover={{ scale:1.01 }} whileTap={{ scale:0.99 }}
            className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Importing…' : 'Import timetable'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Inp({ label, value, onChange, placeholder, type='text', inp }: {
  label: string; value: string; onChange: (v:string)=>void; placeholder?: string; type?: string; inp: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors ${inp}`} />
    </div>
  );
}
