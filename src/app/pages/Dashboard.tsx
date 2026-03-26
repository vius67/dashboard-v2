import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, User, Calendar, Plus, X, Trash2, Loader2, ChevronDown } from 'lucide-react';
import { timetableService } from '../../lib/db';
import { getNextClass, getCurrentClass, getTodaysClasses, getTimeUntil, getDayName } from '../utils/timeUtils';
import { ClassPeriod } from '../types';
import { useApp } from '../context/AppContext';

const COLORS = ['#8B5CF6','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ─── Greeting helpers ────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate() {
  return new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── Main page ───────────────────────────────────────────────────
export default function Dashboard() {
  const { darkMode } = useApp();
  const [timetable, setTimetable] = useState<ClassPeriod[]>([]);
  const [currentClass, setCurrentClass] = useState<ClassPeriod | null>(null);
  const [nextClass, setNextClass] = useState<ClassPeriod | null>(null);
  const [timeRemaining, setTimeRemaining] = useState({ days:0, hours:0, minutes:0, seconds:0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const scheduleRef = useRef<HTMLDivElement>(null);

  // Load timetable
  useEffect(() => { load(); }, []);
  const load = async () => {
    try { setLoading(true); setTimetable(await timetableService.getAll()); }
    catch(e: any) { setError(e.message); } finally { setLoading(false); }
  };

  // Refresh current/next class every 10s
  useEffect(() => {
    const tick = () => {
      setCurrentClass(getCurrentClass(timetable));
      setNextClass(getNextClass(timetable));
    };
    tick();
    const i = setInterval(tick, 10000);
    return () => clearInterval(i);
  }, [timetable]);

  // Live countdown
  useEffect(() => {
    if (!nextClass) return;
    const tick = () => setTimeRemaining(getTimeUntil(nextClass.startTime, nextClass.dayOfWeek));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [nextClass]);

  const handleAdd = async (p: ClassPeriod) => {
    await timetableService.upsert(p);
    setTimetable(prev => [...prev, p]);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    await timetableService.delete(id);
    setTimetable(prev => prev.filter(c => c.id !== id));
  };

  const todaysClasses = getTodaysClasses(timetable);

  const scrollToSchedule = () => {
    scheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const glass = darkMode
    ? 'backdrop-blur-xl bg-white/5 border border-white/10'
    : 'backdrop-blur-xl bg-white/60 border border-white/70';

  const cardBg = darkMode
    ? 'bg-white/5 border border-white/10'
    : 'bg-white/70 border border-white/80';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">

      {/* ── HERO SECTION ─────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col px-6 md:px-10 lg:px-16 pt-28 pb-12">

        {/* Greeting + date */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <h1 className={`text-4xl md:text-6xl font-light mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {getGreeting()} 👋
          </h1>
          <p className={`text-lg ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
            {getFormattedDate()}
          </p>
        </motion.div>

        {/* Add class button */}
        <motion.button
          onClick={() => setShowModal(true)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="absolute top-24 right-6 md:right-10 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Class</span>
        </motion.button>

        {/* ── Countdown / Current class card ── */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 24 }}
            className="flex-1 flex items-center"
          >
            <AnimatePresence mode="wait">

              {/* IN CLASS NOW */}
              {currentClass && (
                <motion.div
                  key="current"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`w-full max-w-2xl rounded-3xl p-10 relative overflow-hidden ${glass}`}
                >
                  {/* animated shimmer */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  />
                  {/* accent glow */}
                  <div className="absolute inset-0 rounded-3xl opacity-20" style={{ background: `radial-gradient(circle at 30% 50%, ${currentClass.color}, transparent 70%)` }} />

                  <div className="relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 text-green-500 text-sm font-medium mb-6">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      In class now
                    </div>
                    <h2 className={`text-4xl md:text-5xl font-light mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {currentClass.subject}
                    </h2>
                    <div className={`flex flex-wrap gap-5 text-sm ${darkMode ? 'text-white/60' : 'text-gray-500'}`}>
                      <span className="flex items-center gap-2"><User className="w-4 h-4" />{currentClass.teacher}</span>
                      <span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{currentClass.room}</span>
                      <span className="flex items-center gap-2"><Clock className="w-4 h-4" />{currentClass.startTime} – {currentClass.endTime}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* NEXT CLASS COUNTDOWN */}
              {nextClass && !currentClass && (
                <motion.div
                  key="countdown"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`w-full max-w-2xl rounded-3xl p-10 relative overflow-hidden ${glass}`}
                >
                  {/* accent glow */}
                  <div className="absolute inset-0 rounded-3xl opacity-15" style={{ background: `radial-gradient(circle at 70% 50%, ${nextClass.color}, transparent 70%)` }} />

                  <div className="relative">
                    <p className={`text-sm uppercase tracking-widest mb-8 ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>
                      Next class in
                    </p>

                    {/* Big countdown numbers */}
                    <div className="flex items-end gap-4 md:gap-8 mb-10">
                      {timeRemaining.days > 0 && <TimeUnit value={timeRemaining.days} label="days" darkMode={darkMode} />}
                      <TimeUnit value={timeRemaining.hours} label="hrs" darkMode={darkMode} />
                      <TimeUnit value={timeRemaining.minutes} label="min" darkMode={darkMode} />
                      <TimeUnit value={timeRemaining.seconds} label="sec" darkMode={darkMode} />
                    </div>

                    {/* Subject + details */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-1.5 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: nextClass.color }} />
                      <div>
                        <h3 className={`text-2xl md:text-3xl font-light ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {nextClass.subject}
                        </h3>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
                          {getDayName(nextClass.dayOfWeek)} · {nextClass.startTime}
                        </p>
                      </div>
                    </div>

                    <div className={`flex flex-wrap gap-5 text-sm ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
                      <span className="flex items-center gap-2"><User className="w-4 h-4" />{nextClass.teacher}</span>
                      <span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{nextClass.room}</span>
                      <span className="flex items-center gap-2"><Clock className="w-4 h-4" />{nextClass.startTime} – {nextClass.endTime}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* NO CLASSES */}
              {!nextClass && !currentClass && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`w-full max-w-2xl rounded-3xl p-12 text-center ${glass}`}
                >
                  <Calendar className={`w-14 h-14 mx-auto mb-5 ${darkMode ? 'text-white/20' : 'text-gray-300'}`} />
                  <h3 className={`text-2xl font-light mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    No upcoming classes
                  </h3>
                  <p className={`mb-6 ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>
                    Add your timetable to get started
                  </p>
                  <motion.button
                    onClick={() => setShowModal(true)}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    <Plus className="w-4 h-4" /> Add Class
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Scroll hint */}
        {todaysClasses.length > 0 && (
          <motion.button
            onClick={scrollToSchedule}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-xs uppercase tracking-widest ${darkMode ? 'text-white/30 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
          >
            <span>Today's schedule</span>
            <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </motion.button>
        )}
      </section>

      {/* ── TODAY'S SCHEDULE ─────────────────────────────────── */}
      {todaysClasses.length > 0 && (
        <section ref={scheduleRef} className="px-6 md:px-10 lg:px-16 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <h2 className={`text-2xl font-light mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Today's Schedule
            </h2>

            <div className="space-y-0">
              {todaysClasses.map((cls, i) => (
                <ScheduleRow
                  key={cls.id}
                  classData={cls}
                  index={i}
                  total={todaysClasses.length}
                  onDelete={handleDelete}
                  darkMode={darkMode}
                  glass={cardBg}
                  isNow={currentClass?.id === cls.id}
                  isPast={isPastClass(cls)}
                />
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* ── FULL TIMETABLE ───────────────────────────────────── */}
      {timetable.length > 0 && (
        <section className="px-6 md:px-10 lg:px-16 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <h2 className={`text-2xl font-light mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Full Timetable
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[1,2,3,4,5].map(day => {
                const dc = timetable
                  .filter(c => c.dayOfWeek === day)
                  .sort((a,b) => a.startTime.localeCompare(b.startTime));
                if (!dc.length) return null;
                const isToday = new Date().getDay() === day;
                return (
                  <motion.div
                    key={day}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: (day - 1) * 0.05 }}
                    className={`rounded-2xl p-4 ${cardBg} ${isToday ? 'ring-2 ring-emerald-500/40' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{DAYS[day]}</h3>
                      {isToday && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500">Today</span>}
                    </div>
                    <div className="space-y-2">
                      {dc.map(cls => (
                        <div key={cls.id} className="flex items-center gap-2.5 group">
                          <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{cls.subject}</div>
                            <div className={`text-xs ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>{cls.startTime} · {cls.room}</div>
                          </div>
                          <motion.button
                            onClick={() => handleDelete(cls.id)}
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>
      )}

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm backdrop-blur-xl">
          {error}
        </div>
      )}

      <AnimatePresence>
        {showModal && <AddClassModal onClose={() => setShowModal(false)} onAdd={handleAdd} darkMode={darkMode} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────
function isPastClass(cls: ClassPeriod): boolean {
  const now = new Date();
  if (cls.dayOfWeek !== now.getDay()) return false;
  const [h, m] = cls.endTime.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() > h * 60 + m;
}

// ─── TimeUnit ────────────────────────────────────────────────────
function TimeUnit({ value, label, darkMode }: { value: number; label: string; darkMode: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`text-5xl md:text-7xl font-extralight tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}
      >
        {String(value).padStart(2, '0')}
      </motion.div>
      <div className={`text-xs uppercase tracking-widest mt-1 ${darkMode ? 'text-white/30' : 'text-gray-400'}`}>{label}</div>
    </div>
  );
}

// ─── ScheduleRow ─────────────────────────────────────────────────
function ScheduleRow({
  classData, index, total, onDelete, darkMode, glass, isNow, isPast
}: {
  classData: ClassPeriod; index: number; total: number;
  onDelete: (id: string) => void; darkMode: boolean; glass: string; isNow: boolean; isPast: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="flex gap-4 items-stretch pb-2"
    >
      {/* Time column */}
      <div className="flex-shrink-0 w-16 text-right pt-4">
        <div className={`text-sm font-medium ${isPast ? (darkMode ? 'text-white/30' : 'text-gray-300') : (darkMode ? 'text-white/80' : 'text-gray-700')}`}>
          {classData.startTime}
        </div>
        <div className={`text-xs ${darkMode ? 'text-white/20' : 'text-gray-400'}`}>{classData.endTime}</div>
      </div>

      {/* Timeline line + dot */}
      <div className="flex flex-col items-center flex-shrink-0 pt-4">
        <div
          className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-2 ring-offset-2 transition-colors"
          style={{
            backgroundColor: isPast ? (darkMode ? '#374151' : '#d1d5db') : classData.color,
            borderColor: classData.color,
            ringOffsetColor: darkMode ? '#030712' : '#ffffff',
          }}
        />
        {index < total - 1 && (
          <div className={`w-px flex-1 mt-1 ${darkMode ? 'bg-white/10' : 'bg-gray-200'}`} style={{ minHeight: '2rem' }} />
        )}
      </div>

      {/* Card */}
      <motion.div
        whileHover={{ x: 4 }}
        className={`flex-1 rounded-2xl p-4 mb-2 transition-all ${glass} ${isNow ? 'ring-2 ring-emerald-500/40' : ''} ${isPast ? 'opacity-40' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: classData.color }} />
            <div>
              <div className="flex items-center gap-2">
                <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{classData.subject}</h4>
                {isNow && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Now
                  </span>
                )}
              </div>
              <div className={`flex gap-3 text-xs mt-1 ${darkMode ? 'text-white/40' : 'text-gray-500'}`}>
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{classData.teacher}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{classData.room}</span>
              </div>
            </div>
          </div>
          <AnimatePresence>
            {hovered && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => onDelete(classData.id)}
                className="text-red-400 hover:text-red-500 ml-3 flex-shrink-0"
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Add Class Modal ─────────────────────────────────────────────
function AddClassModal({
  onClose, onAdd, darkMode
}: {
  onClose: () => void; onAdd: (p: ClassPeriod) => Promise<void>; darkMode: boolean;
}) {
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState('');
  const [day, setDay] = useState(1);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputCls = `w-full px-4 py-3 rounded-xl text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500
    ${darkMode
      ? 'bg-white/5 border border-white/10 text-white placeholder-white/30'
      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await onAdd({
        id: `cls-${Date.now()}`,
        subject: subject.trim(), teacher: teacher.trim(), room: room.trim(),
        dayOfWeek: day, startTime: start, endTime: end, color,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className={`w-full max-w-md rounded-3xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl
          ${darkMode ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-100'}`}
      >
        <div className="flex items-center justify-between mb-7">
          <h2 className={`text-2xl font-light ${darkMode ? 'text-white' : 'text-gray-900'}`}>Add Class</h2>
          <button onClick={onClose} className={`${darkMode ? 'text-white/30 hover:text-white/70' : 'text-gray-400 hover:text-gray-700'} transition-colors`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {([
            ['Subject', subject, setSubject, 'e.g. Mathematics'],
            ['Teacher', teacher, setTeacher, 'e.g. Mr Smith'],
            ['Room', room, setRoom, 'e.g. Room 204'],
          ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, ph]) => (
            <div key={label}>
              <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>{label}</label>
              <input required value={val} onChange={e => setter(e.target.value)} placeholder={ph} className={inputCls} />
            </div>
          ))}

          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>Day</label>
            <select value={day} onChange={e => setDay(+e.target.value)} className={inputCls}>
              {[1,2,3,4,5].map(d => <option key={d} value={d}>{DAYS[d]}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {([['Start', start, setStart], ['End', end, setEnd]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
              <div key={label}>
                <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>{label}</label>
                <input required type="time" value={val} onChange={e => setter(e.target.value)} className={inputCls} />
              </div>
            ))}
          </div>

          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>Colour</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 scale-115' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: c, ringOffsetColor: darkMode ? '#111827' : '#ffffff' }}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-medium text-sm transition
                ${darkMode ? 'bg-white/5 hover:bg-white/10 text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              Cancel
            </button>
            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm disabled:opacity-50 transition flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving…' : 'Add Class'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
