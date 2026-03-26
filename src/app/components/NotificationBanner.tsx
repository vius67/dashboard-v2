import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';
import { storageService } from '../utils/storage';
import { getNextClass, getTimeUntil } from '../utils/timeUtils';

export default function NotificationBanner() {
  const [showNotification, setShowNotification] = useState(false);
  const [nextClass, setNextClass] = useState<any>(null);

  useEffect(() => {
    const checkForUpcomingClass = () => {
      const timetable = storageService.getTimetable();
      const next = getNextClass(timetable);
      
      if (next) {
        const timeUntil = getTimeUntil(next.startTime, next.dayOfWeek);
        const totalMinutes = timeUntil.days * 24 * 60 + timeUntil.hours * 60 + timeUntil.minutes;
        
        // Show notification if class is within 15 minutes
        if (totalMinutes > 0 && totalMinutes <= 15) {
          setNextClass(next);
          setShowNotification(true);
        }
      }
    };

    checkForUpcomingClass();
    const interval = setInterval(checkForUpcomingClass, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {showNotification && nextClass && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md mx-4"
        >
          <div className="rounded-2xl p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/50">
            <div className="flex items-start gap-4">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Bell className="w-6 h-6" />
              </motion.div>
              
              <div className="flex-1">
                <h3 className="font-medium mb-1">Upcoming Class</h3>
                <p className="text-sm opacity-90">
                  {nextClass.subject} starts soon in {nextClass.room}
                </p>
              </div>
              
              <motion.button
                onClick={() => setShowNotification(false)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
