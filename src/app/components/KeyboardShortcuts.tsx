import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard } from 'lucide-react';
import { useApp } from '../context/AppContext';

const SHORTCUTS = [
  { keys: ['G', 'D'], label: 'Go to Dashboard' },
  { keys: ['G', 'H'], label: 'Go to Homework' },
  { keys: ['G', 'C'], label: 'Go to Calendar' },
  { keys: ['G', 'T'], label: 'Go to To-Do' },
  { keys: ['G', 'P'], label: 'Go to Past Papers' },
  { keys: ['G', 'S'], label: 'Go to Study Timer' },
  { keys: ['N'], label: 'New item (context-aware)' },
  { keys: ['?'], label: 'Show shortcuts' },
  { keys: ['Esc'], label: 'Close modal / collapse' },
  { keys: ['⌘', 'K'], label: 'Open import (.ics)' },
  { keys: ['Space'], label: 'Pause / resume timer' },
  { keys: ['D'], label: 'Toggle dark mode' },
];

interface Props { onNavigate: (path: string) => void; onNewItem: () => void; onToggleDark: () => void; onImport: () => void; onTimerToggle: () => void; }

export function useKeyboardShortcuts({ onNavigate, onNewItem, onToggleDark, onImport, onTimerToggle }: Props) {
  const [showHelp, setShowHelp] = useState(false);
  const [gPressed, setGPressed] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = ['INPUT','TEXTAREA','SELECT'].includes(tag);

      if (e.key === '?' && !isInput) { setShowHelp(v => !v); return; }
      if (e.key === 'Escape') { setShowHelp(false); setGPressed(false); return; }

      if (isInput) return;

      if (e.key === 'g' || e.key === 'G') { setGPressed(true); setTimeout(() => setGPressed(false), 1000); return; }

      if (gPressed) {
        const map: Record<string, string> = { d:'/dashboard', h:'/homework', c:'/calendar', t:'/todo', p:'/past-papers', s:'/study' };
        const path = map[e.key.toLowerCase()];
        if (path) { onNavigate(path); setGPressed(false); return; }
      }

      if (e.key === 'n' || e.key === 'N') { onNewItem(); return; }
      if (e.key === 'd' || e.key === 'D') { onToggleDark(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); onImport(); return; }
      if (e.key === ' ' && !isInput) { e.preventDefault(); onTimerToggle(); return; }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [gPressed, onNavigate, onNewItem, onToggleDark, onImport, onTimerToggle]);

  return { showHelp, setShowHelp };
}

export function KeyboardShortcutsModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  const { darkMode } = useApp();
  const bg = darkMode ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200';

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl ${bg}`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-emerald-500" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white font-mono">keyboard shortcuts</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{s.label}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    {s.keys.map((k, j) => (
                      <kbd key={j} className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${darkMode ? 'bg-white/8 border-white/12 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-mono text-gray-400 dark:text-gray-600 mt-4 text-center">press ? to toggle this panel</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ShortcutHint() {
  const { darkMode } = useApp();
  return (
    <button
      className={`fixed bottom-6 right-6 z-40 p-2.5 rounded-full border shadow-lg transition-all hover:scale-110 ${darkMode ? 'bg-gray-900 border-white/10 text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-800'}`}
      onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
      title="Keyboard shortcuts (?)"
    >
      <Keyboard className="w-4 h-4" />
    </button>
  );
}
