import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AppProvider, useApp } from './context/AppContext';
import { TimerProvider } from './context/TimerContext';
import Layout from './components/Layout';
import AuthPage from './components/auth/AuthPage';
import Dashboard from './pages/Dashboard';
import Homework from './pages/Homework';
import TodoList from './pages/TodoList';
import PastPapers from './pages/PastPapers';
import CalendarPage from './pages/Calendar';
import StudyTimer from './pages/StudyTimer';
import NotFound from './pages/NotFound';
import { ROUTES } from './routes';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useApp();
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#030a06]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-6 h-6 rounded-full border border-emerald-500/50 border-t-emerald-400 animate-spin" />
        <p className="text-xs font-mono text-white/20 uppercase tracking-widest">loading</p>
      </div>
    </div>
  );
  if (!user) return <AuthPage />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <AuthGate>
      <Layout>
        <Routes>
          <Route path={ROUTES.DASHBOARD}   element={<Dashboard />} />
          <Route path={ROUTES.HOMEWORK}    element={<Homework />} />
          <Route path={ROUTES.TODO}        element={<TodoList />} />
          <Route path={ROUTES.PAST_PAPERS} element={<PastPapers />} />
          <Route path={ROUTES.CALENDAR}    element={<CalendarPage />} />
          <Route path={ROUTES.STUDY}       element={<StudyTimer />} />
          <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </AuthGate>
  );
}

export default function App() {
  return (
    <AppProvider>
      <TimerProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TimerProvider>
    </AppProvider>
  );
}
