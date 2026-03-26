import { createBrowserRouter } from 'react-router';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Homework from './pages/Homework';
import PastPapers from './pages/PastPapers';
import TodoList from './pages/TodoList';
import NotFound from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'homework', Component: Homework },
      { path: 'past-papers', Component: PastPapers },
      { path: 'todo', Component: TodoList },
      { path: '*', Component: NotFound },
    ],
  },
]);