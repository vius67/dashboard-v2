import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Loader2, CalendarDays, BookOpen } from 'lucide-react';
import { calendarService, homeworkService } from '../../lib/db';
import { CalendarEvent, Homework } from '../types';
import { useApp } from '../context/AppContext';

const COLORS=['#10B981','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16'];
const EVENT_TYPES:CalendarEvent['type'][]=['exam','assignment','event','reminder'];
const TYPE_STYLE:Record<CalendarEvent['type'],string>={
  exam:'bg-red-500/20 text-red-600 dark:text-red-400',
  assignment:'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  event:'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  reminder:'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
};
const HW_STATUS_STYLE:Record<Homework['status'],string>={
  'not-started':'bg-red-500/20 text-red-600 dark:text-red-400',
  'in-progress':'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  'done':'bg-green-500/20 text-green-600 dark:text-green-400',
};
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_SHORT=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function CalendarPage() {
  const { darkMode } = useApp();
  const [events,    setEvents]    = useState<CalendarEvent[]>([]);
  const [homework,  setHomework]  = useState<Homework[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string|null>(null);
  const [viewDate,  setViewDate]  = useState(new Date());
  const [error,     setError]     = useState('');
  const [sidebarTab, setSidebarTab] = useState<'upcoming'|'homework'>('upcoming');

  useEffect(()=>{ load(); },[]);

  const load = async () => {
    try {
      setLoading(true);
      const [evs, hws] = await Promise.all([calendarService.getAll(), homeworkService.getAll()]);
      setEvents(evs);
      setHomework(hws);
    } catch(e:any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleAdd = async (ev:CalendarEvent) => {
    await calendarService.add(ev);
    setEvents(prev=>[...prev,ev].sort((a,b)=>a.date.localeCompare(b.date)));
    setShowModal(false);
  };
  const handleDelete = async (id:string) => {
    try { await calendarService.delete(id); setEvents(prev=>prev.filter(e=>e.id!==id)); }
    catch(e:any) { setError(e.message); }
  };

  const year=viewDate.getFullYear(); const month=viewDate.getMonth();
  const firstDay=new Date(year,month,1).getDay(); const daysInMonth=new Date(year,month+1,0).getDate();
  const today=new Date().toISOString().split('T')[0];

  const eventsForDate=(d:number)=>{
    const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return events.filter(e=>e.date===ds);
  };
  const homeworkForDate=(d:number)=>{
    const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return homework.filter(h=>h.dueDate===ds);
  };

  const selectedEvents   = selectedDate ? events.filter(e=>e.date===selectedDate) : [];
  const selectedHomework = selectedDate ? homework.filter(h=>h.dueDate===selectedDate) : [];

  const upcoming = events.filter(e=>e.date>=today).slice(0,8);
  const upcomingHw = homework.filter(h=>h.dueDate>=today && h.status!=='done')
    .sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,8);

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="min-h-screen p-6 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">

        <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-light mb-2 text-gray-900 dark:text-white">Calendar</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage your schedule and important dates</p>
          </div>
          <motion.button onClick={()=>setShowModal(true)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex-shrink-0">
            <Plus className="w-4 h-4"/><span className="hidden sm:inline">Add Event</span>
          </motion.button>
        </motion.div>

        {error&&<div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-gray-400"/></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── LEFT: Calendar grid ── */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <motion.button onClick={()=>setViewDate(new Date(year,month-1,1))} whileHover={{scale:1.1}} whileTap={{scale:0.9}}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
                    <ChevronLeft className="w-5 h-5"/>
                  </motion.button>
                  <h2 className="text-xl font-medium text-gray-900 dark:text-white">{MONTHS[month]} {year}</h2>
                  <motion.button onClick={()=>setViewDate(new Date(year,month+1,1))} whileHover={{scale:1.1}} whileTap={{scale:0.9}}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
                    <ChevronRight className="w-5 h-5"/>
                  </motion.button>
                </div>
                <div className="grid grid-cols-7 mb-2">
                  {DAY_SHORT.map(d=><div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
                  {Array.from({length:daysInMonth}).map((_,i)=>{
                    const d=i+1;
                    const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const dayEvs=eventsForDate(d);
                    const dayHws=homeworkForDate(d);
                    const isToday=ds===today; const isSel=ds===selectedDate;
                    const totalDots = dayEvs.length + dayHws.length;
                    return (
                      <motion.button key={d} onClick={()=>setSelectedDate(isSel?null:ds)} whileHover={{scale:1.08}} whileTap={{scale:0.95}}
                        className={`relative aspect-square rounded-xl p-1 text-sm font-medium transition-all flex flex-col items-center justify-start pt-1 ${
                          isSel ? 'bg-emerald-600 text-white'
                          : isToday ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                        }`}>
                        <span className="text-xs leading-none">{d}</span>
                        {totalDots > 0 && (
                          <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                            {/* event dots (emerald) */}
                            {dayEvs.slice(0,2).map((ev,idx)=>(
                              <div key={`ev${idx}`} className="w-1 h-1 rounded-full" style={{backgroundColor:isSel?'rgba(255,255,255,0.8)':ev.color}}/>
                            ))}
                            {/* homework dots (orange) */}
                            {dayHws.slice(0,2).map((hw,idx)=>(
                              <div key={`hw${idx}`} className="w-1 h-1 rounded-full" style={{backgroundColor:isSel?'rgba(255,255,255,0.6)':'#f97316'}}/>
                            ))}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Selected date detail panel */}
              <AnimatePresence>
                {selectedDate && (
                  <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
                    className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedDate+'T12:00:00').toLocaleDateString('en-AU',{weekday:'long',month:'long',day:'numeric'})}
                      </h3>
                      <motion.button onClick={()=>setShowModal(true)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium">
                        <Plus className="w-3 h-3"/>Add
                      </motion.button>
                    </div>

                    {/* Events */}
                    {selectedEvents.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Events</p>
                        <div className="space-y-2">{selectedEvents.map(ev=><EventRow key={ev.id} event={ev} onDelete={handleDelete}/>)}</div>
                      </div>
                    )}

                    {/* Homework due */}
                    {selectedHomework.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Homework due</p>
                        <div className="space-y-2">
                          {selectedHomework.map(hw => (
                            <div key={hw.id} className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:hw.color}}/>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{hw.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{hw.subject}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${HW_STATUS_STYLE[hw.status]}`}>
                                {hw.status.replace('-',' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedEvents.length === 0 && selectedHomework.length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No events or homework due on this day</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── RIGHT: sidebar ── */}
            <div className="space-y-4">

              {/* Sidebar tab switcher */}
              <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-700 mb-4">
                  <button onClick={()=>setSidebarTab('upcoming')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${sidebarTab==='upcoming' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                    <CalendarDays className="w-3.5 h-3.5"/>Events
                  </button>
                  <button onClick={()=>setSidebarTab('homework')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${sidebarTab==='homework' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                    <BookOpen className="w-3.5 h-3.5"/>Homework
                    {upcomingHw.length > 0 && (
                      <span className="ml-0.5 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {upcomingHw.length > 9 ? '9+' : upcomingHw.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Upcoming events */}
                {sidebarTab === 'upcoming' && (
                  upcoming.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"/>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">No upcoming events</p>
                      <motion.button onClick={()=>setShowModal(true)} whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
                        <Plus className="w-4 h-4"/>Add Event
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcoming.map(ev=>(
                        <motion.div key={ev.id} whileHover={{x:4}} className="flex items-start gap-3 group">
                          <div className="w-1 min-h-[40px] rounded-full flex-shrink-0 mt-1" style={{backgroundColor:ev.color}}/>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ev.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(ev.date+'T12:00:00').toLocaleDateString('en-AU',{month:'short',day:'numeric'})}
                              {ev.time&&` · ${ev.time}`}
                            </p>
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${TYPE_STYLE[ev.type]}`}>{ev.type}</span>
                          </div>
                          <motion.button onClick={()=>handleDelete(ev.id)} whileHover={{scale:1.1}} whileTap={{scale:0.9}}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0 mt-1">
                            <Trash2 className="w-4 h-4"/>
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  )
                )}

                {/* Upcoming homework */}
                {sidebarTab === 'homework' && (
                  upcomingHw.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"/>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No pending homework</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingHw.map(hw => {
                        const daysLeft = Math.ceil((new Date(hw.dueDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
                        const urgent = daysLeft <= 2;
                        return (
                          <motion.div key={hw.id} whileHover={{x:4}} className="flex items-start gap-3">
                            <div className="w-1 min-h-[40px] rounded-full flex-shrink-0 mt-1" style={{backgroundColor:hw.color}}/>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{hw.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{hw.subject}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${HW_STATUS_STYLE[hw.status]}`}>
                                  {hw.status.replace('-',' ')}
                                </span>
                                <span className={`text-xs font-medium ${urgent ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                                  {daysLeft === 0 ? 'Due today' : daysLeft === 1 ? 'Due tomorrow' : `${daysLeft}d left`}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Event type legend */}
              <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Legend</h3>
                <div className="space-y-2">
                  {EVENT_TYPES.map(t=>(
                    <div key={t} className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLE[t]}`}>{t}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-500"/>
                      <span className="text-xs text-gray-500 dark:text-gray-400">homework due</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <AnimatePresence>{showModal&&<AddEventModal onClose={()=>setShowModal(false)} onAdd={handleAdd} defaultDate={selectedDate??today}/>}</AnimatePresence>
    </motion.div>
  );
}

function EventRow({event,onDelete}:{event:CalendarEvent;onDelete:(id:string)=>void}) {
  const [hovered,setHovered]=useState(false);
  return (
    <motion.div onHoverStart={()=>setHovered(true)} onHoverEnd={()=>setHovered(false)}
      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:event.color}}/>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{event.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {event.time&&<span className="text-xs text-gray-500 dark:text-gray-400">{event.time}{event.endTime&&` – ${event.endTime}`}</span>}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${TYPE_STYLE[event.type]}`}>{event.type}</span>
        </div>
        {event.description&&<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{event.description}</p>}
      </div>
      <AnimatePresence>
        {hovered&&<motion.button initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.8}}
          onClick={()=>onDelete(event.id)} className="text-red-400 hover:text-red-600 flex-shrink-0" whileHover={{scale:1.1}}>
          <Trash2 className="w-4 h-4"/></motion.button>}
      </AnimatePresence>
    </motion.div>
  );
}

function AddEventModal({onClose,onAdd,defaultDate}:{onClose:()=>void;onAdd:(e:CalendarEvent)=>Promise<void>;defaultDate:string}) {
  const [title,setTitle]=useState('');const [date,setDate]=useState(defaultDate);
  const [time,setTime]=useState('');const [endTime,setEndTime]=useState('');
  const [type,setType]=useState<CalendarEvent['type']>('event');
  const [subject,setSubject]=useState('');const [description,setDescription]=useState('');
  const [color,setColor]=useState(COLORS[0]);const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setError('');
    try{setLoading(true);await onAdd({id:`ev-${Date.now()}`,title:title.trim(),date,time:time||undefined,endTime:endTime||undefined,type,subject:subject.trim()||undefined,color,description:description.trim()||undefined});}
    catch(err:any){setError(err.message);}finally{setLoading(false);}
  };
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <motion.div initial={{opacity:0,scale:0.95,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:20}}
        transition={{type:'spring',stiffness:300,damping:30}}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-light text-gray-900 dark:text-white">Add Event</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-6 h-6"/></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Maths Exam"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"/></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {EVENT_TYPES.map(t=><button key={t} type="button" onClick={()=>setType(t)}
                className={`py-2 rounded-xl text-xs font-medium transition-all border ${type===t?'bg-emerald-600 text-white border-emerald-600':'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-400'}`}>
                {t}</button>)}
            </div></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input required type="date" value={date} onChange={e=>setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"/></div>
          <div className="grid grid-cols-2 gap-4">
            {[['Start Time',time,setTime],['End Time',endTime,setEndTime]].map(([label,val,setter]:any)=>(
              <div key={label}><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label} <span className="text-gray-400 font-normal">(opt)</span></label>
                <input type="time" value={val} onChange={e=>setter(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"/></div>
            ))}
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject <span className="text-gray-400 font-normal">(optional)</span></label>
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Mathematics"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"/></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Additional details…" rows={2}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none"/></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Colour</label>
            <div className="flex gap-2 flex-wrap">{COLORS.map(c=><button key={c} type="button" onClick={()=>setColor(c)}
              className={`w-8 h-8 rounded-full transition-all ${color===c?'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110':'hover:scale-110'}`}
              style={{backgroundColor:c}}/>)}</div></div>
          {error&&<div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 transition">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{scale:1.01}} whileTap={{scale:0.99}}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50 transition flex items-center justify-center gap-2">
              {loading&&<Loader2 className="w-4 h-4 animate-spin"/>}{loading?'Saving…':'Add Event'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
