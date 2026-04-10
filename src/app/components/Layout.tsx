import React, { useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, BookOpen, FileText, CheckSquare, Moon, Sun, CalendarDays, LogOut, Timer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTimer } from '../context/TimerContext';
import NotificationBanner from './NotificationBanner';
import WelcomeAnimation from './WelcomeAnimation';
import DynamicIsland from './DynamicIsland';
import { useKeyboardShortcuts, KeyboardShortcutsModal, ShortcutHint } from './KeyboardShortcuts';

const navItems = [
  { path: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/homework',    icon: BookOpen,         label: 'Homework' },
  { path: '/past-papers', icon: FileText,         label: 'Past Papers' },
  { path: '/todo',        icon: CheckSquare,      label: 'To-Do' },
  { path: '/calendar',    icon: CalendarDays,     label: 'Calendar' },
  { path: '/study',       icon: Timer,            label: 'Study Timer' },
];

function AnimatedBackground({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base colour */}
      <div className={`absolute inset-0 transition-colors duration-700 ${darkMode ? 'bg-gray-950' : 'bg-gradient-to-br from-emerald-50 via-white to-green-50'}`} />

      {/* Subtle grid — same as auth page */}
      <div
        className={`absolute inset-0 ${darkMode ? 'opacity-[0.03]' : 'opacity-[0.04]'}`}
        style={{
          backgroundImage: darkMode
            ? 'linear-gradient(rgba(16,185,129,1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,1) 1px, transparent 1px)'
            : 'linear-gradient(rgba(16,185,129,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.6) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Moving orbs */}
      <motion.div animate={{ x:[0,60,-30,0], y:[0,-80,40,0], scale:[1,1.2,0.9,1] }}
        transition={{ duration:18, repeat:Infinity, ease:'easeInOut' }}
        className={`absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-30 ${darkMode?'bg-emerald-900':'bg-emerald-200'}`}/>
      <motion.div animate={{ x:[0,-50,70,0], y:[0,60,-40,0], scale:[1,0.85,1.15,1] }}
        transition={{ duration:22, repeat:Infinity, ease:'easeInOut', delay:3 }}
        className={`absolute top-1/3 -right-40 w-[450px] h-[450px] rounded-full blur-3xl opacity-25 ${darkMode?'bg-green-900':'bg-green-200'}`}/>
      <motion.div animate={{ x:[0,40,-60,0], y:[0,-50,70,0], scale:[1,1.1,0.95,1] }}
        transition={{ duration:26, repeat:Infinity, ease:'easeInOut', delay:6 }}
        className={`absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full blur-3xl opacity-20 ${darkMode?'bg-teal-900':'bg-teal-200'}`}/>
      <motion.div animate={{ x:[0,-30,50,0], y:[0,40,-60,0], scale:[1,0.9,1.15,1] }}
        transition={{ duration:32, repeat:Infinity, ease:'easeInOut', delay:9 }}
        className={`absolute top-2/3 left-1/4 w-[350px] h-[350px] rounded-full blur-3xl opacity-15 ${darkMode?'bg-emerald-800':'bg-lime-200'}`}/>
    </div>
  );
}

export default function Layout({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, signOut, user } = useApp();
  const { timer, pause, resume } = useTimer();

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  const onNavigate = useCallback((path: string) => navigate(path), [navigate]);
  const onNewItem = useCallback(() => {
    window.dispatchEvent(new CustomEvent('dashboard:new-item'));
  }, []);
  const onImport = useCallback(() => {
    window.dispatchEvent(new CustomEvent('dashboard:open-import'));
  }, []);
  const onTimerToggle = useCallback(() => {
    if (timer.isRunning) { timer.isPaused ? resume() : pause(); }
    else navigate('/study');
  }, [timer, pause, resume, navigate]);

  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    onNavigate, onNewItem, onToggleDark: toggleDarkMode, onImport, onTimerToggle,
  });

  const glass = darkMode
    ? 'backdrop-blur-2xl bg-black/20 border-white/10'
    : 'backdrop-blur-2xl bg-white/30 border-white/50';

  return (
    <div className="min-h-screen transition-colors duration-700">
      <AnimatedBackground darkMode={darkMode} />
      <WelcomeAnimation />
      <NotificationBanner />
      <DynamicIsland />

      {/* Top Bar */}
      <motion.header initial={{ y:-100 }} animate={{ y:0 }} transition={{ type:'spring', stiffness:100 }}
        className={`fixed top-0 left-0 right-0 z-40 border-b ${glass}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.2 }}>
            <h1 className={`text-xl font-semibold tracking-tight ${darkMode?'text-white':'text-gray-900'}`}>
              student<span className="text-emerald-500">.</span>
            </h1>
          </motion.div>
          <div className="flex items-center gap-2">
            <motion.button initial={{ opacity:0, scale:0 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.3, type:'spring', stiffness:200 }}
              onClick={toggleDarkMode} whileHover={{ scale:1.1, rotate:180 }} whileTap={{ scale:0.9 }}
              className={`p-3 rounded-full border transition-colors ${darkMode?'bg-white/10 border-white/20 hover:bg-white/20':'bg-white/50 border-white/60 hover:bg-white/70'}`}>
              <AnimatePresence mode="wait">
                {darkMode
                  ? <motion.div key="sun" initial={{ rotate:-90,opacity:0 }} animate={{ rotate:0,opacity:1 }} exit={{ rotate:90,opacity:0 }} transition={{ duration:0.2 }}><Sun className="w-5 h-5 text-yellow-400"/></motion.div>
                  : <motion.div key="moon" initial={{ rotate:90,opacity:0 }} animate={{ rotate:0,opacity:1 }} exit={{ rotate:-90,opacity:0 }} transition={{ duration:0.2 }}><Moon className="w-5 h-5 text-gray-600"/></motion.div>}
              </AnimatePresence>
            </motion.button>
            <motion.button initial={{ opacity:0, scale:0 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.35, type:'spring', stiffness:200 }}
              onClick={handleSignOut} whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }} title="Sign out"
              className={`p-3 rounded-full border transition-colors ${darkMode?'bg-white/10 border-white/20 hover:bg-red-500/30':'bg-white/50 border-white/60 hover:bg-red-50'}`}>
              <LogOut className={`w-5 h-5 ${darkMode?'text-gray-400':'text-gray-600'}`} />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main */}
      <main className="pt-20 pb-24 md:pb-8 md:pl-64">
        <motion.div key={location.pathname} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.25, ease:'easeOut' }}>
          {children}
        </motion.div>
      </main>

      {/* Bottom Nav (Mobile) */}
      <motion.nav initial={{ y:100 }} animate={{ y:0 }} transition={{ type:'spring', stiffness:100, delay:0.2 }}
        className={`fixed bottom-0 left-0 right-0 z-40 md:hidden border-t ${glass}`}>
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3+index*0.06 }}
                  whileTap={{ scale:0.92 }} className="flex flex-col items-center gap-0.5">
                  <div className={`p-2.5 rounded-2xl transition-all ${isActive
                    ? darkMode ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/30' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[9px] font-semibold tracking-wide transition-all ${isActive
                    ? darkMode ? 'text-emerald-300' : 'text-emerald-600'
                    : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.label.split(' ')[0]}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.nav>

      {/* Side Nav (Desktop) */}
      <motion.nav initial={{ x:-100 }} animate={{ x:0 }} transition={{ type:'spring', stiffness:100, delay:0.2 }}
        className={`hidden md:flex flex-col fixed left-0 top-20 bottom-0 w-64 p-5 border-r ${glass}`}>
        <div className="space-y-1 flex-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isTimer = item.path === '/study';
            return (
              <Link key={item.path} to={item.path}>
                <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.3+index*0.07 }}
                  whileHover={{ x:5 }} whileTap={{ scale:0.97 }}
                  className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-medium text-sm ${isActive
                    ? darkMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/25 shadow-lg' : 'bg-emerald-500/15 text-emerald-700 border border-emerald-300/40 shadow-lg shadow-emerald-500/10'
                    : darkMode ? 'text-gray-400 hover:bg-white/5 hover:text-gray-200' : 'text-gray-500 hover:bg-white/40 hover:text-gray-700'}`}>
                  {isActive && (
                    <motion.div layoutId="activeTabDesktop"
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full ${darkMode?'bg-emerald-400':'bg-emerald-500'}`}
                      transition={{ type:'spring', stiffness:500, damping:30 }} />
                  )}
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {isTimer && timer.isRunning && (
                    <div className={`ml-auto w-2 h-2 rounded-full ${timer.isPaused ? 'bg-yellow-400' : 'bg-emerald-400 animate-pulse'}`} />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
        {user?.email && (
          <div className={`text-[10px] truncate px-4 pb-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            {user.email}
          </div>
        )}
      </motion.nav>

      <ShortcutHint />
      <KeyboardShortcutsModal show={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
