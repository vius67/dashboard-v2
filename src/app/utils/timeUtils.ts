import { ClassPeriod } from '../types';

export function parseTime(timeString: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
}

export function getTodaysClasses(timetable: ClassPeriod[]): ClassPeriod[] {
  const today = new Date().getDay();
  return timetable.filter(cls => cls.dayOfWeek === today).sort((a, b) => {
    const timeA = parseTime(a.startTime);
    const timeB = parseTime(b.startTime);
    return timeA.hours * 60 + timeA.minutes - (timeB.hours * 60 + timeB.minutes);
  });
}

export function getNextClass(timetable: ClassPeriod[]): ClassPeriod | null {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  // Get today's classes
  const todaysClasses = getTodaysClasses(timetable);
  
  // Find next class today
  for (const cls of todaysClasses) {
    const classTime = parseTime(cls.startTime);
    const classTimeInMinutes = classTime.hours * 60 + classTime.minutes;
    
    if (classTimeInMinutes > currentTimeInMinutes) {
      return cls;
    }
  }

  // If no more classes today, find first class of next day
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7;
    const nextDayClasses = timetable
      .filter(cls => cls.dayOfWeek === nextDay)
      .sort((a, b) => {
        const timeA = parseTime(a.startTime);
        const timeB = parseTime(b.startTime);
        return timeA.hours * 60 + timeA.minutes - (timeB.hours * 60 + timeB.minutes);
      });
    
    if (nextDayClasses.length > 0) {
      return nextDayClasses[0];
    }
  }

  return null;
}

export function getCurrentClass(timetable: ClassPeriod[]): ClassPeriod | null {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  const todaysClasses = getTodaysClasses(timetable);
  
  for (const cls of todaysClasses) {
    const startTime = parseTime(cls.startTime);
    const endTime = parseTime(cls.endTime);
    const startInMinutes = startTime.hours * 60 + startTime.minutes;
    const endInMinutes = endTime.hours * 60 + endTime.minutes;
    
    if (currentTimeInMinutes >= startInMinutes && currentTimeInMinutes < endInMinutes) {
      return cls;
    }
  }

  return null;
}

export function getUpcomingClasses(timetable: ClassPeriod[], count: number = 4): ClassPeriod[] {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  const upcoming: ClassPeriod[] = [];

  // Get remaining classes today
  const todaysClasses = getTodaysClasses(timetable);
  for (const cls of todaysClasses) {
    const classTime = parseTime(cls.startTime);
    const classTimeInMinutes = classTime.hours * 60 + classTime.minutes;
    
    if (classTimeInMinutes > currentTimeInMinutes) {
      upcoming.push(cls);
    }
  }

  // If we need more, get classes from next days
  let daysChecked = 1;
  while (upcoming.length < count && daysChecked <= 7) {
    const nextDay = (currentDay + daysChecked) % 7;
    const nextDayClasses = timetable
      .filter(cls => cls.dayOfWeek === nextDay)
      .sort((a, b) => {
        const timeA = parseTime(a.startTime);
        const timeB = parseTime(b.startTime);
        return timeA.hours * 60 + timeA.minutes - (timeB.hours * 60 + timeB.minutes);
      });
    
    upcoming.push(...nextDayClasses);
    daysChecked++;
  }

  return upcoming.slice(0, count);
}

export function getTimeUntil(targetTime: string, targetDay?: number): { days: number; hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const currentDay = now.getDay();
  
  const target = new Date();
  const time = parseTime(targetTime);
  target.setHours(time.hours, time.minutes, 0, 0);

  // If targetDay is provided and different from today
  if (targetDay !== undefined && targetDay !== currentDay) {
    let daysUntil = targetDay - currentDay;
    if (daysUntil < 0) {
      daysUntil += 7;
    }
    target.setDate(target.getDate() + daysUntil);
  }

  const diff = target.getTime() - now.getTime();
  
  if (diff < 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

export function getDayName(dayNum: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNum];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  const diff = date.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
