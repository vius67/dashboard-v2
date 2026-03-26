import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Clock, MapPin, User, Calendar, Plus, X, Loader2 } from 'lucide-react';
import { timetableService } from '../../lib/db';
import { getNextClass, getCurrentClass, getUpcomingClasses, getTodaysClasses, getTimeUntil, getDayName } from '../utils/timeUtils';
import { ClassPeriod } from '../types';

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Dashboard() {
  const [timetable, setTimetable] = useState<ClassPeriod[]>([]);
  const [currentClass, setCurrentClass] = useState<ClassPeriod | null>(null);
  const [nextClass, setNextClass] = useState<ClassPeriod | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<ClassPeriod[]>([]);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await timetableService.getAll();
      setTimetable(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const updateClasses = () => {
      setCurrentClass(getCurrentClass(timetable));
      setNextClass(getNextClass(timetable));
      setUpcomingClasses(getUpcomingClasses(timetable, 4));
    };
    updateClasses();
    const interval = setInterval(updateClasses, 10000);
    return () => clearInterval(interval);
  }, [timetable]);

  useEffect(() => {
    if (!nextClass) return;
    const update = () => setTimeRemaining(getTimeUntil(nextClass.startTime, nextClass.dayOfWeek));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextClass]);

  const handleAddClass = async (period: ClassPeriod) => {
    try {
      await timetableService.upsert(period);
      setTimetable(prev => [...prev, period]);
      setShowAddModal(false);
    } catch (err: any) {
      throw err;
    }
  };

  const todaysClasses = getTodaysClasses(timetable);
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-6 md:p-8 lg:p-12"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-light mb-2 text-gray-900 dark:text-white">{greeting}</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {now.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <motion.button
            onClick={() => setShowAddModal(true)}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Class</span>
          </motion.button>
        </motion.div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Current Class Banner */}
            <AnimatePresence mode="wait">
              {currentClass && (
                <motion.div
                  key="current-class"
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 dark:from-purple-500/20 dark:via-blue-500/20 dark:to-cyan-500/20 backdrop-blur-sm border border-white/20 dark:border-white/10"
                >
                  <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{ x: ['-100%', '100%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
                  <div className="relative">
                    <div className="inline-block px-3 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 text-sm font-medium mb-4">
                      Currently in class
                    </div>
                    <h2 className="text-3xl font-light text-gray-900 dark:text-white mb-2">{currentClass.subject}</h2>
                    <div className="flex flex-wrap gap-4 text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-2"><User className="w-4 h-4" /><span>{currentClass.teacher}</span></div>
                      <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{currentClass.room}</span></div>
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>{currentClass.startTime} - {currentClass.endTime}</span></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Countdown */}
            {nextClass && !currentClass && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative overflow-hidden rounded-3xl p-12 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
              >
                <div className="text-center">
                  <div className="text-gray-500 dark:text-gray-400 mb-4">Next class in</div>
                  <div className="flex justify-center gap-4 md:gap-8 mb-8">
                    {timeRemaining.days > 0 && <TimeUnit value={timeRemaining.days} label="days" delay={0.3} />}
                    <TimeUnit value={timeRemaining.hours} label="hours" delay={0.35} />
                    <TimeUnit value={timeRemaining.minutes} label="minutes" delay={0.4} />
                    <TimeUnit value={timeRemaining.seconds} label="seconds" delay={0.45} />
                  </div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="space-y-3">
                    <h3 className="text-2xl md:text-3xl font-light text-gray-900 dark:text-white">{nextClass.subject}</h3>
                    <div className="flex flex-wrap justify-center gap-4 text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-2"><User className="w-4 h-4" /><span>{nextClass.teacher}</span></div>
                      <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{nextClass.room}</span></div>
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>{nextClass.startTime} - {nextClass.endTime}</span></div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {!nextClass && !currentClass && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl p-12 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 text-center"
              >
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-2">No upcoming classes</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Add your timetable to get started</p>
                <motion.button onClick={() => setShowAddModal(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium">
                  <Plus className="w-4 h-4" /> Add Class
                </motion.button>
              </motion.div>
            )}

            {upcomingClasses.length > 0 && (
              <div>
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                  className="text-2xl font-light text-gray-900 dark:text-white mb-6">Upcoming Classes</motion.h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingClasses.map((cls, index) => <ClassCard key={cls.id} classData={cls} index={index} />)}
                </div>
              </div>
            )}

            {todaysClasses.length > 0 && (
              <div>
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                  className="text-2xl font-light text-gray-900 dark:text-white mb-6">Today's Schedule</motion.h2>
                <div className="space-y-3">
                  {todaysClasses.map((cls, index) => (
                    <TimelineItem key={cls.id} classData={cls} index={index} totalToday={todaysClasses.length} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && <AddClassModal onClose={() => setShowAddModal(false)} onAdd={handleAddClass} />}
      </AnimatePresence>
    </motion.div>
  );
}

function AddClassModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: ClassPeriod) => Promise<void> }) {
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const period: ClassPeriod = {
      id: `class-${Date.now()}`,
      subject: subject.trim(),
      teacher: teacher.trim(),
      room: room.trim(),
      dayOfWeek,
      startTime,
      endTime,
      color,
    };
    try {
      setLoading(true);
      await onAdd(period);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-light text-gray-900 dark:text-white">Add Class</h2>
          <motion.button onClick={onClose} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-6 h-6" />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input required value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teacher</label>
            <input required value={teacher} onChange={e => setTeacher(e.target.value)} placeholder="e.g. Mr Smith"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Room</label>
            <input required value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. Room 204"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Day</label>
            <select value={dayOfWeek} onChange={e => setDayOfWeek(parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition">
              {DAYS.map((day, i) => <option key={day} value={i}>{day}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
              <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
              <input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Colour</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              Cancel
            </button>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="flex-1 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving...' : 'Add Class'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function TimeUnit({ value, label, delay }: { value: number; label: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, type: 'spring', stiffness: 200 }}
      className="flex flex-col items-center">
      <motion.div key={value} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }}
        className="text-5xl md:text-7xl font-light text-gray-900 dark:text-white mb-2 tabular-nums">
        {String(value).padStart(2, '0')}
      </motion.div>
      <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

function ClassCard({ classData, index }: { classData: ClassPeriod; index: number }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
      onHoverStart={() => setIsHovered(true)} onHoverEnd={() => setIsHovered(false)}
      className="relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer"
      whileHover={{ scale: 1.02, y: -4 }}
    >
      <motion.div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: classData.color }}
        initial={{ scaleY: 0 }} animate={{ scaleY: isHovered ? 1 : 0.5 }} transition={{ duration: 0.3 }} />
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{classData.subject}</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">{classData.startTime}</span>
        </div>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-2"><User className="w-4 h-4" /><span>{classData.teacher}</span></div>
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{classData.room}</span></div>
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>{getDayName(classData.dayOfWeek)}</span></div>
        </div>
      </div>
    </motion.div>
  );
}

function TimelineItem({ classData, index, totalToday }: { classData: ClassPeriod; index: number; totalToday: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 + index * 0.05, duration: 0.5 }}
      className="flex gap-4 items-center group"
    >
      <div className="flex-shrink-0 text-right w-20">
        <div className="text-sm font-medium text-gray-900 dark:text-white">{classData.startTime}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{classData.endTime}</div>
      </div>
      <div className="relative flex-shrink-0">
        <motion.div className="w-3 h-3 rounded-full" style={{ backgroundColor: classData.color }}
          whileHover={{ scale: 1.5 }} transition={{ type: 'spring', stiffness: 400 }} />
        {index < totalToday - 1 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gray-200 dark:bg-gray-700" />
        )}
      </div>
      <motion.div className="flex-1 rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 300 }}>
        <h4 className="font-medium text-gray-900 dark:text-white mb-1">{classData.subject}</h4>
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-300">
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{classData.teacher}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{classData.room}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
