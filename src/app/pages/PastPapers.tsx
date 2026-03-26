import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Award, Target, BarChart3, Plus, X, Trash2, Loader2 } from 'lucide-react';
import { pastPaperService } from '../../lib/db';
import { PastPaperResult } from '../types';

const SUBJECT_COLORS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#84CC16',
];

export default function PastPapers() {
  const [results, setResults] = useState<PastPaperResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await pastPaperService.getAll();
      setResults(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load past papers');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (result: PastPaperResult) => {
    try {
      await pastPaperService.add(result);
      setResults(prev => [...prev, result].sort((a, b) => a.date.localeCompare(b.date)));
      setShowAddModal(false);
    } catch (err: any) {
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(id);
      await pastPaperService.delete(id);
      setResults(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const averageScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length) : 0;
  const highestScore = results.length > 0 ? Math.max(...results.map(r => r.percentage)) : 0;
  const lowestScore = results.length > 0 ? Math.min(...results.map(r => r.percentage)) : 0;

  const subjectStats = results.reduce((acc, result) => {
    if (!acc[result.subject]) acc[result.subject] = { total: 0, count: 0 };
    acc[result.subject].total += result.percentage;
    acc[result.subject].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const subjectAverages = Object.entries(subjectStats).map(([subject, stats]) => ({
    subject,
    average: Math.round(stats.total / stats.count),
    count: stats.count,
  })).sort((a, b) => b.average - a.average);

  const trendData = results.slice(-8).map((result, index) => ({
    index: index + 1,
    score: result.percentage,
    subject: result.subject,
    date: new Date(result.date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }),
  }));

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
            <h1 className="text-4xl md:text-5xl font-light mb-2 text-gray-900 dark:text-white">
              Past Paper Results
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Track your performance and progress
            </p>
          </div>
          <motion.button
            onClick={() => setShowAddModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium text-sm transition-all hover:bg-gray-800 dark:hover:bg-gray-100 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Result</span>
          </motion.button>
        </motion.div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard icon={BarChart3} label="Average Score" value={`${averageScore}%`} delay={0.1} />
              <StatCard icon={TrendingUp} label="Highest Score" value={`${highestScore}%`} delay={0.15} />
              <StatCard icon={Target} label="Lowest Score" value={`${lowestScore}%`} delay={0.2} />
              <StatCard icon={Award} label="Total Papers" value={results.length.toString()} delay={0.25} />
            </div>

            {results.length > 0 && (
              <>
                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  >
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Performance Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: '#8B5CF6', r: 5 }} activeDot={{ r: 7 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  >
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Subject Averages</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={subjectAverages}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="subject" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                        <Bar dataKey="average" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                </div>

                {/* Subject Breakdown */}
                <div>
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-2xl font-light text-gray-900 dark:text-white mb-6"
                  >
                    Subject Breakdown
                  </motion.h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjectAverages.map((subject, index) => (
                      <SubjectCard key={subject.subject} subject={subject.subject} average={subject.average} count={subject.count} index={index} />
                    ))}
                  </div>
                </div>

                {/* Recent Results */}
                <div>
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-2xl font-light text-gray-900 dark:text-white mb-6"
                  >
                    All Results
                  </motion.h2>
                  <div className="space-y-3">
                    {[...results].reverse().map((result, index) => (
                      <ResultCard
                        key={result.id}
                        result={result}
                        index={index}
                        onDelete={handleDelete}
                        deleting={deleting === result.id}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {results.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl p-16 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 text-center"
              >
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-2">No results yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Add your first past paper result to start tracking</p>
                <motion.button
                  onClick={() => setShowAddModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium"
                >
                  <Plus className="w-4 h-4" /> Add Result
                </motion.button>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddResultModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddResultModal({ onClose, onAdd }: { onClose: () => void; onAdd: (r: PastPaperResult) => Promise<void> }) {
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const s = parseFloat(score);
    const m = parseFloat(maxScore);
    if (isNaN(s) || isNaN(m) || m <= 0 || s < 0 || s > m) {
      setError('Please enter valid score values (score must be between 0 and max score)');
      return;
    }
    const pct = Math.round((s / m) * 100);
    const result: PastPaperResult = {
      id: `pp-${Date.now()}`,
      subject: subject.trim(),
      title: title.trim(),
      date,
      score: s,
      maxScore: m,
      percentage: pct,
    };
    try {
      setLoading(true);
      await onAdd(result);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-light text-gray-900 dark:text-white">Add Result</h2>
          <motion.button onClick={onClose} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-6 h-6" />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. 2023 Trial Exam"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Mathematics"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Score</label>
              <input
                required
                type="number"
                min="0"
                step="0.5"
                value={score}
                onChange={e => setScore(e.target.value)}
                placeholder="e.g. 78"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Score</label>
              <input
                required
                type="number"
                min="1"
                step="0.5"
                value={maxScore}
                onChange={e => setMaxScore(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition"
              />
            </div>
          </div>

          {score && maxScore && parseFloat(maxScore) > 0 && parseFloat(score) >= 0 && parseFloat(score) <= parseFloat(maxScore) && (
            <div className="px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-sm text-center">
              Percentage: {Math.round((parseFloat(score) / parseFloat(maxScore)) * 100)}%
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input
              required
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex-1 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving...' : 'Add Result'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, delay }: { icon: React.ElementType; label: string; value: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      <Icon className="w-8 h-8 text-purple-500 mb-4" />
      <div className="text-3xl font-light text-gray-900 dark:text-white mb-1">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    </motion.div>
  );
}

function SubjectCard({ subject, average, count, index }: { subject: string; average: number; count: number; index: number }) {
  const getGradeColor = (score: number) => {
    if (score >= 90) return 'from-green-500 to-emerald-500';
    if (score >= 80) return 'from-blue-500 to-cyan-500';
    if (score >= 70) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 + index * 0.05 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      <h4 className="font-medium text-gray-900 dark:text-white mb-1">{subject}</h4>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{count} {count === 1 ? 'paper' : 'papers'}</p>
      <div className="flex items-end justify-between mb-2">
        <span className="text-3xl font-light text-gray-900 dark:text-white">{average}%</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">Average</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${getGradeColor(average)}`}
          initial={{ width: 0 }}
          animate={{ width: `${average}%` }}
          transition={{ delay: 0.5 + index * 0.05, duration: 1, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

function ResultCard({ result, index, onDelete, deleting }: {
  result: PastPaperResult; index: number;
  onDelete: (id: string) => void; deleting: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const getGradeColor = (score: number) => {
    if (score >= 90) return 'text-green-500 bg-green-500/10';
    if (score >= 80) return 'text-blue-500 bg-blue-500/10';
    if (score >= 70) return 'text-yellow-500 bg-yellow-500/10';
    return 'text-red-500 bg-red-500/10';
  };
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.55 + index * 0.03 }}
      whileHover={{ x: 4 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`flex items-center justify-center w-16 h-16 rounded-xl flex-shrink-0 ${getGradeColor(result.percentage)}`}>
          <span className="text-xl font-medium">{result.percentage}%</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">{result.title || result.subject}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">{result.subject}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(result.date).toLocaleDateString('en-AU', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <div className="text-lg font-medium text-gray-900 dark:text-white">{result.score}/{result.maxScore}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">marks</div>
        </div>
        <AnimatePresence>
          {hovered && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => onDelete(result.id)}
              disabled={deleting}
              className="text-red-400 hover:text-red-600 disabled:opacity-50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
