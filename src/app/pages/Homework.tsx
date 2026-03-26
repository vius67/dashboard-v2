import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Clock, CheckCircle2, Circle, AlertCircle, Plus } from 'lucide-react';
import { storageService } from '../utils/storage';
import { Homework } from '../types';
import { formatDate, getDaysUntil } from '../utils/timeUtils';

export default function HomeworkPage() {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [filter, setFilter] = useState<'all' | 'not-started' | 'in-progress' | 'done'>('all');

  useEffect(() => {
    const data = storageService.getHomework();
    setHomework(data);
  }, []);

  const updateStatus = (id: string, status: Homework['status']) => {
    const updated = homework.map(hw => 
      hw.id === id ? { ...hw, status } : hw
    );
    setHomework(updated);
    storageService.saveHomework(updated);
  };

  const filteredHomework = filter === 'all' 
    ? homework 
    : homework.filter(hw => hw.status === filter);

  const stats = {
    total: homework.length,
    notStarted: homework.filter(hw => hw.status === 'not-started').length,
    inProgress: homework.filter(hw => hw.status === 'in-progress').length,
    done: homework.filter(hw => hw.status === 'done').length,
  };

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
            Homework
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track your assignments and deadlines
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total"
            value={stats.total}
            color="bg-gray-500"
            delay={0.1}
          />
          <StatCard
            label="Not Started"
            value={stats.notStarted}
            color="bg-red-500"
            delay={0.15}
          />
          <StatCard
            label="In Progress"
            value={stats.inProgress}
            color="bg-yellow-500"
            delay={0.2}
          />
          <StatCard
            label="Completed"
            value={stats.done}
            color="bg-green-500"
            delay={0.25}
          />
        </div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-2 overflow-x-auto pb-2"
        >
          {(['all', 'not-started', 'in-progress', 'done'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                filter === status
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {status === 'all' ? 'All' : status === 'not-started' ? 'Not Started' : status === 'in-progress' ? 'In Progress' : 'Done'}
            </button>
          ))}
        </motion.div>

        {/* Homework List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredHomework.map((hw, index) => (
              <HomeworkCard
                key={hw.id}
                homework={hw}
                index={index}
                onUpdateStatus={updateStatus}
              />
            ))}
          </AnimatePresence>

          {filteredHomework.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-3xl p-12 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-center"
            >
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
              <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-2">
                No homework found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filter === 'all' ? 'You have no assignments yet' : `No ${filter.replace('-', ' ')} assignments`}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      <div className={`w-2 h-2 rounded-full ${color} mb-4`} />
      <div className="text-3xl font-light text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {label}
      </div>
    </motion.div>
  );
}

function HomeworkCard({ 
  homework, 
  index, 
  onUpdateStatus 
}: { 
  homework: Homework; 
  index: number; 
  onUpdateStatus: (id: string, status: Homework['status']) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const daysUntil = getDaysUntil(homework.dueDate);
  const isUrgent = daysUntil <= 2 && homework.status !== 'done';

  const statusConfig = {
    'not-started': { icon: Circle, color: 'text-red-500', bg: 'bg-red-500/10' },
    'in-progress': { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    'done': { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  };

  const config = statusConfig[homework.status];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: homework.color }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
      />

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <motion.button
                onClick={() => {
                  const statuses: Homework['status'][] = ['not-started', 'in-progress', 'done'];
                  const currentIndex = statuses.indexOf(homework.status);
                  const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                  onUpdateStatus(homework.id, nextStatus);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`flex-shrink-0 ${config.color}`}
              >
                <Icon className="w-6 h-6" />
              </motion.button>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                  {homework.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {homework.subject}
                </p>
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-gray-600 dark:text-gray-300 mt-3"
                >
                  {homework.description}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-shrink-0 text-right">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isUrgent ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              <Clock className="w-3 h-3" />
              <span>{formatDate(homework.dueDate)}</span>
            </div>
            {daysUntil > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {daysUntil} {daysUntil === 1 ? 'day' : 'days'} left
              </div>
            )}
            {daysUntil === 0 && (
              <div className="text-xs text-red-500 mt-1">
                Due today
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            whileHover={{ x: 4 }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </motion.button>

          <div className="flex gap-2">
            <motion.span
              className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
              whileHover={{ scale: 1.05 }}
            >
              {homework.status.replace('-', ' ')}
            </motion.span>
          </div>
        </div>

        {/* Progress Bar */}
        {homework.status !== 'done' && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: index * 0.05 + 0.3, duration: 0.5 }}
            className="mt-4 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"
          >
            <motion.div
              className="h-full"
              style={{ backgroundColor: homework.color }}
              initial={{ width: 0 }}
              animate={{ width: homework.status === 'in-progress' ? '50%' : '0%' }}
              transition={{ delay: index * 0.05 + 0.5, duration: 0.8, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
