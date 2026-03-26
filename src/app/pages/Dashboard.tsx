import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Clock, MapPin, User, Calendar } from 'lucide-react';
import { storageService } from '../utils/storage';
import { getNextClass, getCurrentClass, getUpcomingClasses, getTodaysClasses, getTimeUntil, getDayName } from '../utils/timeUtils';
import { ClassPeriod } from '../types';

export default function Dashboard() {
  const [timetable, setTimetable] = useState<ClassPeriod[]>([]);
  const [currentClass, setCurrentClass] = useState<ClassPeriod | null>(null);
  const [nextClass, setNextClass] = useState<ClassPeriod | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<ClassPeriod[]>([]);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, -50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -100]);
  const opacity = useTransform(scrollY, [0, 200], [1, 0]);

  useEffect(() => {
    const data = storageService.getTimetable();
    setTimetable(data);
  }, []);

  useEffect(() => {
    const updateClasses = () => {
      const current = getCurrentClass(timetable);
      const next = getNextClass(timetable);
      const upcoming = getUpcomingClasses(timetable, 4);
      
      setCurrentClass(current);
      setNextClass(next);
      setUpcomingClasses(upcoming);
    };

    updateClasses();
    const interval = setInterval(updateClasses, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [timetable]);

  useEffect(() => {
    if (!nextClass) return;

    const updateCountdown = () => {
      const timeUntil = getTimeUntil(nextClass.startTime, nextClass.dayOfWeek);
      setTimeRemaining(timeUntil);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextClass]);

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
        >
          <h1 className="text-4xl md:text-5xl font-light mb-2 text-gray-900 dark:text-white">
            {greeting}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>

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
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <div className="relative">
                <div className="inline-block px-3 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 text-sm font-medium mb-4">
                  Currently in class
                </div>
                <h2 className="text-3xl font-light text-gray-900 dark:text-white mb-2">
                  {currentClass.subject}
                </h2>
                <div className="flex flex-wrap gap-4 text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{currentClass.teacher}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{currentClass.room}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{currentClass.startTime} - {currentClass.endTime}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Countdown Timer */}
        {nextClass && !currentClass && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative overflow-hidden rounded-3xl p-12 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
          >
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-gray-500 dark:text-gray-400 mb-4"
              >
                Next class in
              </motion.div>
              
              <div className="flex justify-center gap-4 md:gap-8 mb-8">
                {timeRemaining.days > 0 && (
                  <TimeUnit value={timeRemaining.days} label="days" delay={0.3} />
                )}
                <TimeUnit value={timeRemaining.hours} label="hours" delay={0.35} />
                <TimeUnit value={timeRemaining.minutes} label="minutes" delay={0.4} />
                <TimeUnit value={timeRemaining.seconds} label="seconds" delay={0.45} />
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="space-y-3"
              >
                <h3 className="text-2xl md:text-3xl font-light text-gray-900 dark:text-white">
                  {nextClass.subject}
                </h3>
                <div className="flex flex-wrap justify-center gap-4 text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{nextClass.teacher}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{nextClass.room}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{nextClass.startTime} - {nextClass.endTime}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* No classes message */}
        {!nextClass && !currentClass && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl p-12 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-center"
          >
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
            <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-2">
              No upcoming classes
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Enjoy your free time!
            </p>
          </motion.div>
        )}

        {/* Upcoming Classes */}
        {upcomingClasses.length > 0 && (
          <div>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-light text-gray-900 dark:text-white mb-6"
            >
              Upcoming Classes
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingClasses.map((cls, index) => (
                <ClassCard key={cls.id} classData={cls} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* Today's Schedule Timeline */}
        {todaysClasses.length > 0 && (
          <div>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-light text-gray-900 dark:text-white mb-6"
            >
              Today's Schedule
            </motion.h2>
            <div className="space-y-3">
              {todaysClasses.map((cls, index) => (
                <TimelineItem key={cls.id} classData={cls} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TimeUnit({ value, label, delay }: { value: number; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      className="flex flex-col items-center"
    >
      <motion.div
        key={value}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-5xl md:text-7xl font-light text-gray-900 dark:text-white mb-2 tabular-nums"
      >
        {String(value).padStart(2, '0')}
      </motion.div>
      <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </div>
    </motion.div>
  );
}

function ClassCard({ classData, index }: { classData: ClassPeriod; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer"
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: classData.color }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: isHovered ? 1 : 0.5 }}
        transition={{ duration: 0.3 }}
      />
      
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {classData.subject}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {classData.startTime}
          </span>
        </div>
        
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{classData.teacher}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{classData.room}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{getDayName(classData.dayOfWeek)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TimelineItem({ classData, index }: { classData: ClassPeriod; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 + index * 0.05, duration: 0.5 }}
      className="flex gap-4 items-center group"
    >
      <div className="flex-shrink-0 text-right w-20">
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {classData.startTime}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {classData.endTime}
        </div>
      </div>
      
      <div className="relative flex-shrink-0">
        <motion.div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: classData.color }}
          whileHover={{ scale: 1.5 }}
          transition={{ type: 'spring', stiffness: 400 }}
        />
        {index < getTodaysClasses(storageService.getTimetable()).length - 1 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gray-200 dark:bg-gray-700" />
        )}
      </div>
      
      <motion.div
        className="flex-1 rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        whileHover={{ x: 4 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
          {classData.subject}
        </h4>
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-300">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {classData.teacher}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {classData.room}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}