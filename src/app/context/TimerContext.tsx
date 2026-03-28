import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  elapsed: number; // seconds
  label: string;
  mode: 'focus' | 'break';
  totalFocus: number; // seconds accumulated this session
}

interface TimerContextType {
  timer: TimerState;
  start: (label?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setLabel: (label: string) => void;
  switchMode: (mode: 'focus' | 'break') => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const DEFAULT: TimerState = {
  isRunning: false, isPaused: false, elapsed: 0,
  label: 'Study session', mode: 'focus', totalFocus: 0,
};

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timer, setTimer] = useState<TimerState>(DEFAULT);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    setTimer(prev => ({
      ...prev,
      elapsed: prev.elapsed + 1,
      totalFocus: prev.mode === 'focus' ? prev.totalFocus + 1 : prev.totalFocus,
    }));
  }, []);

  useEffect(() => {
    if (timer.isRunning && !timer.isPaused) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timer.isRunning, timer.isPaused, tick]);

  const start = (label?: string) => setTimer(prev => ({ ...prev, isRunning: true, isPaused: false, elapsed: 0, label: label ?? prev.label }));
  const pause = () => setTimer(prev => ({ ...prev, isPaused: true }));
  const resume = () => setTimer(prev => ({ ...prev, isPaused: false }));
  const stop = () => setTimer(DEFAULT);
  const setLabel = (label: string) => setTimer(prev => ({ ...prev, label }));
  const switchMode = (mode: 'focus' | 'break') => setTimer(prev => ({ ...prev, mode, elapsed: 0 }));

  return (
    <TimerContext.Provider value={{ timer, start, pause, resume, stop, setLabel, switchMode }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
