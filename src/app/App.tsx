import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import AuthPage from './components/auth/AuthPage';
import Dashboard from './pages/Dashboard';
import Homework from './pages/Homework';
import TodoList from './pages/TodoList';
import PastPapers from './pages/PastPapers';
import NotFound from './pages/NotFound';
import { ROUTES } from './routes';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-gray-900 dark:border-white border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <AuthGate>
      <Layout>
        <Routes>
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
          <Route path={ROUTES.HOMEWORK} element={<Homework />} />
          <Route path={ROUTES.TODO} element={<TodoList />} />
          <Route path={ROUTES.PAST_PAPERS} element={<PastPapers />} />
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
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
