import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, User, Calendar, Plus, X, Trash2, Loader2, ChevronDown, Upload } from 'lucide-react';
import { timetableService } from '../../lib/db';
import { getNextClass, getCurrentClass, getTodaysClasses, getTimeUntil, getDayName } from '../utils/timeUtils';
import { ClassPeriod } from '../types';
import { useApp } from '../context/AppContext';

const COLORS = ['#8B5CF6','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// --- HELPERS ---
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate() {
  return new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
}

// --- UPDATED PARSER (MORE ROBUST) ---
function parseICS(text: string): Omit<ClassPeriod, 'id'>[] {
  const events: Omit<ClassPeriod, 'id'>[] = [];
  // Split by VEVENT but handle different line endings (\r\n vs \n)
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1);
  const colorMap: Record<string, string> = {};
  const palette = [...COLORS];
  const seenFingerprints = new Set<string>();

  console.log(`Found ${blocks.length} raw events in ICS file.`);

  for (const block of blocks) {
    const get = (key: string) => {
      const regex = new RegExp(`${key}[^:]*:([^\\r\\n]+)`, 'i');
      const match = block.match(regex);
      return match ? match[1].trim() : '';
    };

    const summary = get('SUMMARY') || 'Unknown Class';
    const location = get('LOCATION') || '';
    const description = get('DESCRIPTION') || '';
    const dtstart = get('DTSTART');
    
    if (!dtstart) continue;

    // Handle standard YYYYMMDDTHHMMSS format
    const dateMatch = dtstart.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
    if (!dateMatch) continue;

    const [, year, month, day, hh, mm] = dateMatch;
    const startTime = `${hh}:${mm}`;

    const dtend = get('DTEND');
    let endTime = startTime;
    const endMatch = dtend ? dtend.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/) : null;
    if (endMatch) endTime = `${endMatch[4]}:${endMatch[5]}`;

    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dayOfWeek = date.getDay();
    
    // Ignore weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // FINGERPRINT: Subject + Day + Time. 
    // This stops 40 "Maths" entries for 40 weeks from appearing.
    const fingerprint = `${summary}-${dayOfWeek}-${startTime}`;
    if (seenFingerprints.has(fingerprint)) continue;
    seenFingerprints.add(fingerprint);

    if (!colorMap[summary]) {
      colorMap[summary] = palette[Object.keys(colorMap).length % palette.length];
    }

    const teacherMatch = description.match(/teacher[:\s]+([^\n,]+)/i);
    const teacher = teacherMatch ? teacherMatch[1].trim() : '';

    events.push({ 
      subject: summary, 
      teacher, 
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
  const scheduleRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try { 
      setLoading(true); 
      const data = await timetableService.getAll();
      setTimetable(data || []); 
    } catch(e: any) { 
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

  // Handlers
  const handleAdd = async (p: ClassPeriod) => { 
    try {
      await timetableService.upsert(p); 
      await loadData();
      setShowModal(false); 
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => { 
    try {
      await timetableService.delete(id); 
      setTimetable(prev => prev.filter(c => c.id !== id)); 
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleICSImport = async (classes: Omit<ClassPeriod, 'id'>[]) => {
    if (classes.length === 0) {
      setError("No valid classes found in the ICS file.");
      return;
    }

    try {
      setLoading(true);
      const newClasses: ClassPeriod[] = classes.map(cls => ({
        ...cls,
        id: crypto.randomUUID() 
      }));

      // NOTE: Ensure your timetableService.upsert accepts an array for batching
      await timetableService.upsert(newClasses); 
      await loadData(); 
      setShowICSModal(false);
    } catch (e: any) {
      console.error("Import Error:", e);
      setError("Failed to save to database. Check your Supabase connection.");
    } finally {
      setLoading(false);
    }
  };

  const todaysClasses = getTodaysClasses(timetable);
  const glass = darkMode ? 'backdrop-blur-xl bg-white/5 border border-white/10' : 'backdrop-blur-xl bg-white/60 border border-white/70';
  const cardBg = darkMode ? 'bg-white/5 border border-white/10' : 'bg-white/70 border border-white/80';

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="w-full">
      <section className="relative min-h-[calc(100vh-5rem)] flex flex-col px-6 md:px-10 pt-10 pb-16 w-full">
        
        {/* Header */}
        <motion.div initial={{ opacity:0, y:-24 }} animate={{ opacity:1, y:0 }} className="mb-10">
          <h1 className={`text-4xl md:text-6xl font-light mb-2 ${darkMode?'text-white':'text-gray-900'}`}>{getGreeting()} 👋</h1>
          <p className={`text-lg ${darkMode?'text-white/50':'text-gray-500'}`}>{getFormattedDate()}</p>
        </motion.div>

        {/* Action Buttons */}
        <div className="absolute top-10 right-6 md:right-10 flex items-center gap-2">
          <motion.button onClick={() => setShowICSModal(true)} whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition
              ${darkMode?'bg-white/10 hover:bg-white/15 text-white border border-white/10':'bg-white/70 hover:bg-white/90 text-gray-700 border border-white/80 shadow-sm'}`}>
            <Upload className="w-4 h-4"/>
            <span className="hidden sm:inline">Import ICS</span>
          </motion.button>
          <motion.button onClick={() => setShowModal(true)} whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-lg shadow-emerald-600/20">
            <Plus className="w-4 h-4"/>
            <span className="hidden sm:inline">Add Class</span>
          </motion.button>
        </div>

        {/* Main Content (Current/Next Class) */}
        {loading && timetable.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500"/>
          </div>
        ) : (
          <div className="flex-1 flex items-center w-full">
            <AnimatePresence mode="wait">
              {currentClass ? (
                 <motion.div key="current" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }}
                 className={`w-full rounded-3xl p-10 relative overflow-hidden ${glass}`}>
                   <div className="relative z-10">
                     <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 text-green-500 text-sm font-medium mb-6">
                       <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> In class now
                     </div>
                     <h2 className={`text-4xl md:text-5xl font-light mb-6 ${darkMode?'text-white':'text-gray-900'}`}>{currentClass.subject}</h2>
                     <div className={`flex flex-wrap gap-5 text-sm ${darkMode?'text-white/60':'text-gray-500'}`}>
                       {currentClass.room && <span className="flex items-center gap-2"><MapPin className="w-4 h-4"/>{currentClass.room}</span>}
                       <span className="flex items-center gap-2"><Clock className="w-4 h-4"/>{currentClass.startTime} – {currentClass.endTime}</span>
                     </div>
                   </div>
                 </motion.div>
              ) : nextClass ? (
                <motion.div key="countdown" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
                  className={`w-full rounded-3xl p-10 relative overflow-hidden ${glass}`}>
                  <div className="relative z-10">
                    <p className={`text-sm uppercase tracking-widest mb-8 ${darkMode?'text-white/40':'text-gray-400'}`}>Next class in</p>
                    <div className="flex items-end gap-4 md:gap-10 mb-10">
                      <TimeUnit value={timeRemaining.hours} label="hrs" darkMode={darkMode}/>
                      <TimeUnit value={timeRemaining.minutes} label="min" darkMode={darkMode}/>
                      <TimeUnit value={timeRemaining.seconds} label="sec" darkMode={darkMode}/>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-1.5 h-12 rounded-full flex-shrink-0" style={{ backgroundColor:nextClass.color }}/>
                      <h3 className={`text-2xl md:text-3xl font-light ${darkMode?'text-white':'text-gray-900'}`}>{nextClass.subject}</h3>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" className={`w-full rounded-3xl p-12 text-center ${glass}`}>
                  <Calendar className="w-14 h-14 mx-auto mb-5 text-gray-400"/>
                  <h3 className={`text-2xl font-light mb-2 ${darkMode?'text-white':'text-gray-900'}`}>No classes today</h3>
                  <p className={`${darkMode?'text-white/40':'text-gray-400'}`}>Add classes manually or via ICS import.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Today's Row Section */}
      {todaysClasses.length > 0 && (
        <section className="px-6 md:px-10 pb-16">
          <h2 className={`text-2xl font-light mb-8 ${darkMode?'text-white':'text-gray-900'}`}>Today's Schedule</h2>
          <div className="space-y-2">
            {todaysClasses.map((cls, idx) => (
              <ScheduleRow key={cls.id} classData={cls} index={idx} total={todaysClasses.length} onDelete={handleDelete} darkMode={darkMode} cardBg={cardBg} isNow={currentClass?.id === cls.id}/>
            ))}
          </div>
        </section>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showModal && <AddClassModal onClose={()=>setShowModal(false)} onAdd={handleAdd} darkMode={darkMode}/>}
        {showICSModal && <ICSImportModal onClose={()=>setShowICSModal(false)} onImport={handleICSImport} darkMode={darkMode}/>}
      </AnimatePresence>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-500 text-white rounded-2xl shadow-xl z-[100]">
          {error} <button onClick={()=>setError('')} className="ml-2 font-bold">×</button>
        </div>
      )}
    </motion.div>
  );
}

// --- SUB-COMPONENTS ---

function TimeUnit({ value, label, darkMode }: { value:number; label:string; darkMode:boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`text-5xl md:text-7xl font-extralight tabular-nums ${darkMode?'text-white':'text-gray-900'}`}>
        {String(value).padStart(2,'0')}
      </div>
      <div className={`text-xs uppercase tracking-widest mt-1 ${darkMode?'text-white/30':'text-gray-400'}`}>{label}</div>
    </div>
  );
}

function ScheduleRow({ classData, index, total, onDelete, darkMode, cardBg, isNow }: any) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl ${cardBg} ${isNow ? 'ring-2 ring-emerald-500' : ''}`}>
      <div className="w-16 text-right">
        <div className={`text-sm font-bold ${darkMode?'text-white':'text-gray-900'}`}>{classData.startTime}</div>
      </div>
      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: classData.color }}/>
      <div className="flex-1">
        <div className={`font-medium ${darkMode?'text-white':'text-gray-900'}`}>{classData.subject}</div>
        <div className="text-xs text-gray-500">{classData.room} · {classData.teacher}</div>
      </div>
      <button onClick={() => onDelete(classData.id)} className="text-red-400 hover:text-red-600 transition-colors">
        <Trash2 className="w-4 h-4"/>
      </button>
    </div>
  );
}

function ICSImportModal({ onClose, onImport, darkMode }: any) {
  const [parsed, setParsed] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseICS(text);
      setParsed(result);
    };
    reader.readAsText(file);
  };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ y:20 }} animate={{ y:0 }} className={`w-full max-w-md p-8 rounded-3xl ${darkMode?'bg-gray-900 border border-white/10':'bg-white'}`}>
        <h2 className={`text-2xl font-light mb-4 ${darkMode?'text-white':'text-gray-900'}`}>Import ICS</h2>
        <input type="file" accept=".ics" ref={fileRef} onChange={handleFile} className="hidden"/>
        
        {!parsed.length ? (
          <button onClick={() => fileRef.current?.click()} className="w-full py-12 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center gap-3 hover:bg-gray-50 transition">
            <Upload className="text-gray-400"/>
            <span className="text-gray-500 text-sm">Click to select .ics file</span>
          </button>
        ) : (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${darkMode?'bg-white/5':'bg-gray-50'} max-h-40 overflow-y-auto`}>
              <p className="text-sm text-emerald-500 font-medium mb-2">Successfully parsed {parsed.length} unique classes</p>
              {parsed.slice(0, 5).map((p, i) => (
                <div key={i} className="text-xs opacity-60 mb-1">{p.subject} ({DAYS[p.dayOfWeek]})</div>
              ))}
            </div>
            <button 
              onClick={() => onImport(parsed)} 
              disabled={loading}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin"/>}
              Save to Timetable
            </button>
          </div>
        )}
        <button onClick={onClose} className="w-full mt-4 text-sm text-gray-500 hover:underline">Cancel</button>
      </motion.div>
    </motion.div>
  );
}

function AddClassModal({ onClose, onAdd, darkMode }: any) {
  const [subject, setSubject] = useState('');
  const [day, setDay] = useState(1);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [color, setColor] = useState(COLORS[0]);

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ y:20 }} animate={{ y:0 }} className={`w-full max-w-md p-8 rounded-3xl ${darkMode?'bg-gray-900 border border-white/10':'bg-white'}`}>
        <h2 className={`text-2xl font-light mb-6 ${darkMode?'text-white':'text-gray-900'}`}>Add Class</h2>
        <div className="space-y-4">
          <input placeholder="Subject" className="w-full p-4 rounded-xl border" onChange={e => setSubject(e.target.value)}/>
          <select className="w-full p-4 rounded-xl border" onChange={e => setDay(Number(e.target.value))}>
            {[1,2,3,4,5].map(d => <option value={d}>{DAYS[d]}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="time" className="flex-1 p-4 rounded-xl border" value={start} onChange={e => setStart(e.target.value)}/>
            <input type="time" className="flex-1 p-4 rounded-xl border" value={end} onChange={e => setEnd(e.target.value)}/>
          </div>
          <button 
            onClick={() => onAdd({ id: crypto.randomUUID(), subject, dayOfWeek: day, startTime: start, endTime: end, color, teacher: '', room: '' })}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold"
          >
            Add to Schedule
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-4 text-sm text-gray-500 hover:underline">Cancel</button>
      </motion.div>
    </motion.div>
  );
}
