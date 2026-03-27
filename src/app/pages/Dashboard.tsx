import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, User, Calendar, Plus, X, Trash2, Loader2, ChevronDown, Upload, AlertCircle } from 'lucide-react';
import { timetableService } from '../../lib/db';
import { getNextClass, getCurrentClass, getTodaysClasses, getTimeUntil, getDayName } from '../utils/timeUtils';
import { ClassPeriod } from '../types';
import { useApp } from '../context/AppContext';

const COLORS = ['#8B5CF6','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// --- ROBUST ICS PARSER ---
function parseICS(text: string): Omit<ClassPeriod, 'id'>[] {
  const events: Omit<ClassPeriod, 'id'>[] = [];
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1);
  const colorMap: Record<string, string> = {};
  const palette = [...COLORS];
  
  // CRITICAL: This Set prevents the duplication seen in your screenshot
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
    
    // Calculate End Time
    const dtend = get('DTEND');
    let endTime = startTime;
    const endMatch = dtend?.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
    if (endMatch) endTime = `${endMatch[4]}:${endMatch[5]}`;

    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // FINGERPRINT LOGIC: If Subject + Day + Time is the same, it's a duplicate recurring event.
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
      setError("Database Error: " + e.message);
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
    const timer = setInterval(tick, 10000);
    return () => clearInterval(timer);
  }, [timetable]);

  useEffect(() => {
    if (!nextClass) return;
    const tick = () => setTimeRemaining(getTimeUntil(nextClass.startTime, nextClass.dayOfWeek));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [nextClass]);

  // FIX: Using .upsert directly instead of .upsertBatch to avoid the "not a function" error
  const handleICSImport = async (classes: Omit<ClassPeriod, 'id'>[]) => {
    if (classes.length === 0) {
      setError("No valid classes found in file.");
      return;
    }
    try {
      setLoading(true);
      const newClassesWithIds = classes.map(cls => ({
        ...cls,
        id: crypto.randomUUID()
      }));

      await timetableService.upsert(newClassesWithIds);
      await loadData();
      setShowICSModal(false);
    } catch (e: any) {
      setError("Import failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure? This will delete your entire timetable.")) return;
    try {
      setLoading(true);
      // Deletes all rows where ID is not null (everything)
      await timetableService.deleteAll(); 
      await loadData();
    } catch (e: any) {
      setError("Clear failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const todaysClasses = getTodaysClasses(timetable);
  const glass = darkMode ? 'backdrop-blur-xl bg-white/5 border border-white/10' : 'backdrop-blur-xl bg-white/60 border border-white/70';

  return (
    <div className="w-full min-h-screen p-6 md:p-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className={`text-4xl font-light ${darkMode ? 'text-white' : 'text-gray-900'}`}>{getGreeting()}</h1>
          <p className="text-gray-500">{getFormattedDate()}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button onClick={handleClearAll} className="px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-xl transition">
            <Trash2 className="w-4 h-4 inline mr-1"/> Clear All
          </button>
          <button onClick={() => setShowICSModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
            <Upload className="w-4 h-4"/> Import ICS
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
            <Plus className="w-4 h-4"/> Add Class
          </button>
        </div>
      </div>

      {/* ERROR DISPLAY */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4"/> {error}</div>
            <button onClick={() => setError('')}><X className="w-4 h-4"/></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO SECTION (STATUS) */}
      <div className={`w-full rounded-3xl p-8 mb-10 ${glass}`}>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-500"/></div>
        ) : currentClass ? (
          <div>
            <span className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-xs font-bold uppercase">In Class Now</span>
            <h2 className={`text-5xl font-light mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentClass.subject}</h2>
            <p className="text-gray-500 mt-2">{currentClass.startTime} — {currentClass.endTime} • {currentClass.room}</p>
          </div>
        ) : nextClass ? (
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400">Next class in</p>
            <div className={`text-6xl font-extralight my-4 tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {String(timeRemaining.hours).padStart(2,'0')}:{String(timeRemaining.minutes).padStart(2,'0')}:{String(timeRemaining.seconds).padStart(2,'0')}
            </div>
            <h3 className="text-xl text-emerald-500 font-medium">{nextClass.subject}</h3>
          </div>
        ) : (
          <div className="text-center py-10">
            <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4"/>
            <p className="text-gray-400">No more classes scheduled.</p>
          </div>
        )}
      </div>

      {/* TODAY'S SCHEDULE LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <h3 className={`text-xl font-light mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Today's Schedule</h3>
          <div className="space-y-3">
            {todaysClasses.length > 0 ? todaysClasses.map((cls) => (
              <div key={cls.id} className={`flex items-center gap-4 p-4 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                <div className="w-1 h-10 rounded-full" style={{ backgroundColor: cls.color }} />
                <div className="flex-1">
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{cls.subject}</p>
                  <p className="text-xs text-gray-500">{cls.startTime} • {cls.room}</p>
                </div>
                <button onClick={() => timetableService.delete(cls.id).then(loadData)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            )) : <p className="text-gray-500 italic">Nothing scheduled for today.</p>}
          </div>
        </div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showICSModal && (
          <ICSImportModal 
            onClose={() => setShowICSModal(false)} 
            onImport={handleICSImport} 
            darkMode={darkMode} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- ICS MODAL SUB-COMPONENT ---
function ICSImportModal({ onClose, onImport, darkMode }: any) {
  const [parsed, setParsed] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setParsed(parseICS(text));
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ y:20, opacity:0 }} animate={{ y:0, opacity:1 }} 
        className={`w-full max-w-md p-8 rounded-3xl ${darkMode ? 'bg-gray-900 border border-white/10' : 'bg-white'}`}>
        <h2 className={`text-2xl font-light mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Import ICS</h2>
        
        <input type="file" accept=".ics" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        
        {!parsed.length ? (
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-10 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 hover:bg-gray-50 transition">
            <Upload className="mx-auto mb-2"/>
            Select School .ics File
          </button>
        ) : (
          <div>
            <div className="mb-6 p-4 bg-emerald-500/10 rounded-xl">
              <p className="text-emerald-500 text-sm font-bold">✓ Ready to import {parsed.length} unique classes</p>
              <p className="text-xs text-emerald-500/70">Duplicates from recurring events were automatically removed.</p>
            </div>
            <button onClick={() => onImport(parsed)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700">
              Complete Import
            </button>
          </div>
        )}
        <button onClick={onClose} className="w-full mt-4 text-gray-500 text-sm hover:underline">Cancel</button>
      </motion.div>
    </div>
  );
}
