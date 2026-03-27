import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, User, Calendar, Plus, X, Trash2, Loader2, ChevronDown, Upload, AlertCircle } from 'lucide-react';
import { timetableService } from '../../lib/db';
import { getNextClass, getCurrentClass, getTodaysClasses, getTimeUntil, getDayName } from '../utils/timeUtils';
import { ClassPeriod } from '../types';
import { useApp } from '../context/AppContext';

const COLORS = ['#8B5CF6','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// --- UTILS ---
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate() {
  return new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
}

function parseICS(text: string): Omit<ClassPeriod, 'id'>[] {
  const events: Omit<ClassPeriod, 'id'>[] = [];
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1);
  const colorMap: Record<string, string> = {};
  const palette = [...COLORS];
  const seenFingerprints = new Set<string>();

  for (const block of blocks) {
    const get = (key: string) => {
      const regex = new RegExp(`${key}[^:]*:([^\\r\\n]+)`, 'i');
      const match = block.match(regex);
      return match ? match[1].trim() : '';
    };

    const summary = get('SUMMARY') || 'Unknown Class';
    const location = get('LOCATION') || '';
    const dtstart = get('DTSTART');
    if (!dtstart) continue;

    const dateMatch = dtstart.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
    if (!dateMatch) continue;

    const [, year, month, day, hh, mm] = dateMatch;
    const startTime = `${hh}:${mm}`;
    
    const dtend = get('DTEND');
    let endTime = startTime;
    const endMatch = dtend?.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
    if (endMatch) endTime = `${endMatch[4]}:${endMatch[5]}`;

    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const fingerprint = `${summary}-${dayOfWeek}-${startTime}`;
    if (seenFingerprints.has(fingerprint)) continue;
    seenFingerprints.add(fingerprint);

    if (!colorMap[summary]) {
      colorMap[summary] = palette[Object.keys(colorMap).length % palette.length];
    }

    events.push({ 
      subject: summary, 
      teacher: '', 
      room: location, 
      startTime, 
      endTime, 
      dayOfWeek, 
      color: colorMap[summary] 
    });
  }
  return events;
}

// --- MAIN COMPONENT ---
export default function Dashboard() {
  const { darkMode } = useApp();
  const [timetable, setTimetable] = useState<ClassPeriod[]>([]);
  const [currentClass, setCurrentClass] = useState<ClassPeriod | null>(null);
  const [nextClass, setNextClass] = useState<ClassPeriod | null>(null);
  const [timeRemaining, setTimeRemaining] = useState({ days:0, hours:0, minutes:0, seconds:0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showICSModal, setShowICSModal] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await timetableService.getAll();
      setTimetable(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const tick = () => {
      setCurrentClass(getCurrentClass(timetable));
      setNextClass(getNextClass(timetable));
    };
    tick();
    const i = setInterval(tick, 10000);
    return () => clearInterval(i);
  }, [timetable]);

  useEffect(() => {
    if (!nextClass) return;
    const tick = () => setTimeRemaining(getTimeUntil(nextClass.startTime, nextClass.dayOfWeek));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [nextClass]);

  const handleAdd = async (p: ClassPeriod) => {
    try {
      await timetableService.upsert(p);
      await loadData();
      setShowModal(false);
    } catch (e: any) { setError(e.message); }
  };

  const handleICSImport = async (classes: Omit<ClassPeriod, 'id'>[]) => {
    try {
      setLoading(true);
      const newClasses = classes.map(c => ({ ...c, id: crypto.randomUUID() }));
      await timetableService.upsert(newClasses);
      await loadData();
      setShowICSModal(false);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const todaysClasses = getTodaysClasses(timetable);
  const glass = darkMode ? 'backdrop-blur-xl bg-white/5 border border-white/10' : 'backdrop-blur-xl bg-white/60 border border-white/70';

  return (
    <div className={`min-h-screen w-full p-6 md:p-10 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-light">{getGreeting()}</h1>
          <p className="text-gray-500">{getFormattedDate()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowICSModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition">
            <Upload className="w-4 h-4"/> Import
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 transition">
            <Plus className="w-4 h-4"/> Add
          </button>
        </div>
      </div>

      {/* Hero Card */}
      <div className={`rounded-3xl p-8 mb-10 ${glass}`}>
        {currentClass ? (
          <div>
            <div className="text-xs font-bold text-green-500 uppercase mb-2">Happening Now</div>
            <h2 className="text-4xl font-light mb-2">{currentClass.subject}</h2>
            <p className="opacity-60">{currentClass.startTime} - {currentClass.endTime} • {currentClass.room}</p>
          </div>
        ) : nextClass ? (
          <div>
            <p className="text-xs uppercase text-gray-400 mb-4">Next class in</p>
            <div className="text-6xl font-extralight mb-4 tabular-nums">
              {String(timeRemaining.hours).padStart(2,'0')}:{String(timeRemaining.minutes).padStart(2,'0')}:{String(timeRemaining.seconds).padStart(2,'0')}
            </div>
            <h3 className="text-xl text-emerald-500">{nextClass.subject}</h3>
          </div>
        ) : (
          <p className="text-gray-400 italic">No classes found.</p>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        <h3 className="text-xl font-light">Today's Schedule</h3>
        {todaysClasses.map(cls => (
          <div key={cls.id} className={`flex items-center gap-4 p-4 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
            <div className="w-1 h-10 rounded-full" style={{ backgroundColor: cls.color }}/>
            <div className="flex-1">
              <p className="font-medium">{cls.subject}</p>
              <p className="text-xs opacity-50">{cls.startTime} • {cls.room}</p>
            </div>
            <button onClick={() => timetableService.delete(cls.id).then(loadData)} className="text-gray-400 hover:text-red-500 transition">
              <Trash2 className="w-4 h-4"/>
            </button>
          </div>
        ))}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showModal && (
          <AddModal onClose={() => setShowModal(false)} onAdd={handleAdd} darkMode={darkMode} />
        )}
        {showICSModal && (
          <ICSModal onClose={() => setShowICSModal(false)} onImport={handleICSImport} darkMode={darkMode} />
        )}
      </AnimatePresence>

      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

// --- MODAL COMPONENTS ---

function AddModal({ onClose, onAdd, darkMode }: any) {
  const [form, setForm] = useState({ subject: '', day: 1, start: '09:00', end: '10:00' });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-md p-8 rounded-3xl ${darkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}>
        <h2 className="text-2xl mb-6">Add Class</h2>
        <input placeholder="Subject" className="w-full p-4 mb-4 rounded-xl border dark:bg-white/5" onChange={e => setForm({...form, subject: e.target.value})} />
        <select className="w-full p-4 mb-4 rounded-xl border dark:bg-white/5" onChange={e => setForm({...form, day: Number(e.target.value)})}>
          {[1,2,3,4,5].map(d => <option key={d} value={d}>{DAYS[d]}</option>)}
        </select>
        <div className="flex gap-2 mb-6">
          <input type="time" className="flex-1 p-4 rounded-xl border dark:bg-white/5" value={form.start} onChange={e => setForm({...form, start: e.target.value})} />
          <input type="time" className="flex-1 p-4 rounded-xl border dark:bg-white/5" value={form.end} onChange={e => setForm({...form, end: e.target.value})} />
        </div>
        <button onClick={() => onAdd({ ...form, id: crypto.randomUUID(), dayOfWeek: form.day, startTime: form.start, endTime: form.end, color: COLORS[0], room: '', teacher: '' })} 
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold">Save Class</button>
        <button onClick={onClose} className="w-full mt-4 text-gray-500">Cancel</button>
      </div>
    </div>
  );
}

function ICSModal({ onClose, onImport, darkMode }: any) {
  const [parsed, setParsed] = useState<any[]>([]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-md p-8 rounded-3xl ${darkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}>
        <h2 className="text-2xl mb-4">Import ICS</h2>
        <input type="file" accept=".ics" onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            const r = new FileReader();
            r.onload = (ev) => setParsed(parseICS(ev.target?.result as string));
            r.readAsText(file);
          }
        }} className="mb-6 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        {parsed.length > 0 && (
          <button onClick={() => onImport(parsed)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">Import {parsed.length} Classes</button>
        )}
        <button onClick={onClose} className="w-full mt-4 text-gray-500">Cancel</button>
      </div>
    </div>
  );
}
