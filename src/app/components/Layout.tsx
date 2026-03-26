import React from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, BookOpen, FileText, CheckSquare, Moon, Sun, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import NotificationBanner from './NotificationBanner';
import WelcomeAnimation from './WelcomeAnimation';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/homework', icon: BookOpen, label: 'Homework' },
  { path: '/past-papers', icon: FileText, label: 'Past Papers' },
  { path: '/todo', icon: CheckSquare, label: 'To-Do' },
];

function AnimatedBackground({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className={`absolute inset-0 transition-colors duration-700 ${
        darkMode
          ? 'bg-gray-950'
          : 'bg-gradient-to-br from-emerald-50 via-white to-green-50'
      }`} />
      <motion.div
        animate={{ x: [0, 60, -30, 0], y: [0, -80, 40, 0], scale: [1, 1.2, 0.9, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-30 ${
          darkMode ? 'bg-emerald-900' : 'bg-emerald-200'
        }`}
      />
      <motion.div
        animate={{ x: [0, -50, 70, 0], y: [0, 60, -40, 0], scale: [1, 0.85, 1.15, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className={`absolute top-1/3 -right-40 w-[450px] h-[450px] rounded-full blur-3xl opacity-25 ${
          darkMode ? 'bg-green-900' : 'bg-green-200'
        }`}
      />
      <motion.div
        animate={{ x: [0, 40, -60, 0], y: [0, -50, 70, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
        className={`absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full blur-3xl opacity-20 ${
          darkMode ? 'bg-teal-900' : 'bg-teal-200'
        }`}
      />
      <motion.div
        animate={{ x: [0, -70, 30, 0], y: [0, 40, -60, 0], scale: [1, 1.3, 0.8, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 9 }}
        className={`absolute top-1/4 left-1/2 w-[300px] h-[300px] rounded-full blur-3xl opacity-15 ${
          darkMode ? 'bg-emerald-800' : 'bg-lime-200'
        }`}
      />
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useApp();
  const [showFAB, setShowFAB] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowFAB(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Liquid glass styles
  const glassNav = darkMode
    ? 'backdrop-blur-2xl bg-black/20 border-white/10'
    : 'backdrop-blur-2xl bg-white/30 border-white/50';

  return (
    <div className="min-h-screen transition-colors duration-700">
      <AnimatedBackground darkMode={darkMode} />

      {/* Welcome Animation */}
      <WelcomeAnimation />

      {/* Notification Banner */}
      <NotificationBanner />

      {/* Top Bar — liquid glass */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className={`fixed top-0 left-0 right-0 z-50 border-b ${glassNav}`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className={`text-xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Student Dashboard
            </h1>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            onClick={toggleDarkMode}
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            className={`p-3 rounded-full border transition-colors ${
              darkMode
                ? 'bg-white/10 border-white/20 hover:bg-white/20'
                : 'bg-white/50 border-white/60 hover:bg-white/70'
            }`}
          >
            <AnimatePresence mode="wait">
              {darkMode ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="w-5 h-5 text-yellow-400" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="w-5 h-5 text-gray-600" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.header>

      {/* Main Content — no AnimatePresence exit to prevent white flash */}
      <main className="pt-20 pb-24 md:pb-8 md:pl-72">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Bottom Navigation (Mobile) — liquid glass */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden border-t ${glassNav}`}
      >
        <div className="flex items-center justify-around px-4 py-3">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileTap={{ scale: 0.92 }}
                  className="relative flex flex-col items-center gap-1"
                >
                  <div
                    className={`p-3 rounded-2xl transition-all ${
                      isActive
                        ? darkMode
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/30'
                          : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : darkMode
                        ? 'text-gray-400'
                        : 'text-gray-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? darkMode ? 'text-emerald-300' : 'text-emerald-600'
                        : darkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.nav>

      {/* Side Navigation (Desktop) — liquid glass */}
      <motion.nav
        initial={{ x: -100 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
        className={`hidden md:block fixed left-0 top-20 bottom-0 w-72 p-6 border-r ${glassNav}`}
      >
        <div className="space-y-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ x: 6 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold tracking-wide ${
                    isActive
                      ? darkMode
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/25 shadow-lg'
                        : 'bg-emerald-500/15 text-emerald-700 border border-emerald-300/40 shadow-lg shadow-emerald-500/10'
                      : darkMode
                      ? 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      : 'text-gray-500 hover:bg-white/40 hover:text-gray-700'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabDesktop"
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full ${
                        darkMode ? 'bg-emerald-400' : 'bg-emerald-500'
                      }`}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.nav>

      {/* Floating Action Button */}
      <AnimatePresence>
        {showFAB && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-24 right-6 md:bottom-8 md:right-8 p-4 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-lg shadow-emerald-500/40 z-40"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
