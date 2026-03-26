import { RouterProvider } from 'react-router';
import { AppProvider } from './context/AppContext';
import { router } from './routes';

/**
 * Student Productivity Dashboard
 * 
 * A modern, minimalistic timetable-based app with extensive animations.
 * 
 * Features:
 * - Live countdown timer to next class
 * - Current class display
 * - Upcoming sessions preview
 * - Daily schedule timeline
 * - Homework tracker with status indicators
 * - Past paper results with analytics and charts
 * - To-Do list with drag-and-drop and confetti
 * - Dark mode with smooth transitions
 * - Welcome animation on first load
 * - Notification banner for upcoming classes
 * - Floating action button
 * - Responsive design (mobile and desktop)
 * - Smooth page transitions
 * - Micro-interactions throughout
 */
export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}