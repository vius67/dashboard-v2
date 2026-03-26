import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Award, Target, BarChart3 } from 'lucide-react';
import { storageService } from '../utils/storage';
import { PastPaperResult } from '../types';

export default function PastPapers() {
  const [results, setResults] = useState<PastPaperResult[]>([]);

  useEffect(() => {
    const data = storageService.getPastPapers();
    setResults(data);
  }, []);

  // Calculate statistics
  const averageScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
    : 0;

  const highestScore = results.length > 0
    ? Math.max(...results.map(r => r.percentage))
    : 0;

  const lowestScore = results.length > 0
    ? Math.min(...results.map(r => r.percentage))
    : 0;

  // Group by subject
  const subjectStats = results.reduce((acc, result) => {
    if (!acc[result.subject]) {
      acc[result.subject] = { total: 0, count: 0, scores: [] };
    }
    acc[result.subject].total += result.percentage;
    acc[result.subject].count += 1;
    acc[result.subject].scores.push(result.percentage);
    return acc;
  }, {} as Record<string, { total: number; count: number; scores: number[] }>);

  const subjectAverages = Object.entries(subjectStats).map(([subject, stats]) => ({
    subject,
    average: Math.round(stats.total / stats.count),
    count: stats.count,
  })).sort((a, b) => b.average - a.average);

  // Prepare trend data (last 8 results)
  const trendData = results
    .slice(-8)
    .map((result, index) => ({
      index: index + 1,
      score: result.percentage,
      subject: result.subject,
      date: new Date(result.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
        >
          <h1 className="text-4xl md:text-5xl font-light mb-2 text-gray-900 dark:text-white">
            Past Paper Results
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track your performance and progress
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={BarChart3}
            label="Average Score"
            value={`${averageScore}%`}
            delay={0.1}
          />
          <StatCard
            icon={TrendingUp}
            label="Highest Score"
            value={`${highestScore}%`}
            delay={0.15}
          />
          <StatCard
            icon={Target}
            label="Lowest Score"
            value={`${lowestScore}%`}
            delay={0.2}
          />
          <StatCard
            icon={Award}
            label="Total Papers"
            value={results.length.toString()}
            delay={0.25}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Performance Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af' }}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Subject Averages */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Subject Averages
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectAverages}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis 
                  dataKey="subject" 
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar 
                  dataKey="average" 
                  fill="#3B82F6" 
                  radius={[8, 8, 0, 0]}
                />
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
              <SubjectCard
                key={subject.subject}
                subject={subject.subject}
                average={subject.average}
                count={subject.count}
                index={index}
              />
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
            Recent Results
          </motion.h2>
          <div className="space-y-3">
            {results.slice(-10).reverse().map((result, index) => (
              <ResultCard key={result.id} result={result} index={index} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  delay 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      <Icon className="w-8 h-8 text-purple-500 mb-4" />
      <div className="text-3xl font-light text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {label}
      </div>
    </motion.div>
  );
}

function SubjectCard({ 
  subject, 
  average, 
  count, 
  index 
}: { 
  subject: string; 
  average: number; 
  count: number; 
  index: number;
}) {
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
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
            {subject}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {count} {count === 1 ? 'paper' : 'papers'}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-light text-gray-900 dark:text-white">
              {average}%
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Average
            </span>
          </div>
          
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${getGradeColor(average)}`}
              initial={{ width: 0 }}
              animate={{ width: `${average}%` }}
              transition={{ delay: 0.5 + index * 0.05, duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ResultCard({ result, index }: { result: PastPaperResult; index: number }) {
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
      className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <motion.div
          className={`flex items-center justify-center w-16 h-16 rounded-xl ${getGradeColor(result.percentage)}`}
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <span className="text-xl font-medium">
            {result.percentage}%
          </span>
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">
            {result.subject}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(result.date).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </p>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-lg font-medium text-gray-900 dark:text-white">
          {result.score}/{result.maxScore}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          marks
        </div>
      </div>
    </motion.div>
  );
}
