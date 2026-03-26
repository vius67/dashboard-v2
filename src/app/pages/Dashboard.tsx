import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, User, Calendar, Plus, X, Trash2, Loader2 } from 'lucide-react';
import { timetableService } from '../../lib/db';
import { getNextClass, getCurrentClass, getUpcomingClasses, getTodaysClasses, getTimeUntil, getDayName } from '../utils/timeUtils';
import { ClassPeriod } from '../types';

const COLORS = ['#8B5CF6','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function Dashboard() {
  const [timetable, setTimetable] = useState<ClassPeriod[]>([]);
  const [currentClass, setCurrentClass] = useState<ClassPeriod | null>(null);
  const [nextClass, setNextClass] = useState<ClassPeriod | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<ClassPeriod[]>([]);
  const [timeRemaining, setTimeRemaining] = useState({ days:0, hours:0, minutes:0, seconds:0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { setLoading(true); setTimetable(await timetableService.getAll()); }
    catch(e:any){ setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    const tick = () => { setCurrentClass(getCurrentClass(timetable)); setNextClass(getNextClass(timetable)); setUpcomingClasses(getUpcomingClasses(timetable,4)); };
    tick(); const i = setInterval(tick, 10000); return () => clearInterval(i);
  }, [timetable]);

  useEffect(() => {
    if (!nextClass) return;
    const tick = () => setTimeRemaining(getTimeUntil(nextClass.startTime, nextClass.dayOfWeek));
    tick(); const i = setInterval(tick, 1000); return () => clearInterval(i);
  }, [nextClass]);

  const handleAdd = async (p: ClassPeriod) => { await timetableService.upsert(p); setTimetable(prev=>[...prev,p]); setShowModal(false); };
  const handleDelete = async (id: string) => { await timetableService.delete(id); setTimetable(prev=>prev.filter(c=>c.id!==id)); };

  const todaysClasses = getTodaysClasses(timetable);
  const now = new Date();
  const greeting = now.getHours()<12?'Good morning':now.getHours()<18?'Good afternoon':'Good evening';

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="min-h-screen p-6 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div initial={{ opacity:0,y:-20 }} animate={{ opacity:1,y:0 }} className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-light mb-2 text-gray-900 dark:text-white">{greeting}</h1>
            <p className="text-gray-500 dark:text-gray-400">{now.toLocaleDateString('en-AU',{weekday:'long',month:'long',day:'numeric'})}</p>
          </div>
          <motion.button onClick={()=>setShowModal(true)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex-shrink-0">
            <Plus className="w-4 h-4"/><span className="hidden sm:inline">Add Class</span>
          </motion.button>
        </motion.div>

        {error && <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-gray-400"/></div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              {currentClass && (
                <motion.div key="cur" initial={{opacity:0,scale:0.95,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:-20}}
                  className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:via-green-500/20 dark:to-teal-500/20 border border-white/20 dark:border-white/10">
                  <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" animate={{x:['-100%','100%']}} transition={{duration:3,repeat:Infinity,ease:'linear'}}/>
                  <div className="relative">
                    <div className="inline-block px-3 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 text-sm font-medium mb-4">Currently in class</div>
                    <h2 className="text-3xl font-light text-gray-900 dark:text-white mb-2">{currentClass.subject}</h2>
                    <div className="flex flex-wrap gap-4 text-gray-600 dark:text-gray-300">
                      <span className="flex items-center gap-2"><User className="w-4 h-4"/>{currentClass.teacher}</span>
                      <span className="flex items-center gap-2"><MapPin className="w-4 h-4"/>{currentClass.room}</span>
                      <span className="flex items-center gap-2"><Clock className="w-4 h-4"/>{currentClass.startTime} – {currentClass.endTime}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {nextClass && !currentClass && (
              <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                className="rounded-3xl p-12 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/50 dark:border-gray-700/50">
                <div className="text-center">
                  <div className="text-gray-500 dark:text-gray-400 mb-4">Next class in</div>
                  <div className="flex justify-center gap-4 md:gap-8 mb-8">
                    {timeRemaining.days>0&&<TimeUnit value={timeRemaining.days} label="days"/>}
                    <TimeUnit value={timeRemaining.hours} label="hours"/>
                    <TimeUnit value={timeRemaining.minutes} label="min"/>
                    <TimeUnit value={timeRemaining.seconds} label="sec"/>
                  </div>
                  <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-3">{nextClass.subject}</h3>
                  <div className="flex flex-wrap justify-center gap-4 text-gray-600 dark:text-gray-300">
                    <span className="flex items-center gap-2"><User className="w-4 h-4"/>{nextClass.teacher}</span>
                    <span className="flex items-center gap-2"><MapPin className="w-4 h-4"/>{nextClass.room}</span>
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4"/>{nextClass.startTime} – {nextClass.endTime}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {!nextClass && !currentClass && (
              <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                className="rounded-3xl p-12 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600"/>
                <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-2">No upcoming classes</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Add your timetable to get started</p>
                <motion.button onClick={()=>setShowModal(true)} whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                  <Plus className="w-4 h-4"/>Add Class
                </motion.button>
              </motion.div>
            )}

            {upcomingClasses.length>0 && (
              <div>
                <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-6">Upcoming Classes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingClasses.map((cls,i)=><ClassCard key={cls.id} classData={cls} index={i} onDelete={handleDelete}/>)}
                </div>
              </div>
            )}

            {todaysClasses.length>0 && (
              <div>
                <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-6">Today's Schedule</h2>
                <div className="space-y-3">
                  {todaysClasses.map((cls,i)=><TimelineItem key={cls.id} classData={cls} index={i} total={todaysClasses.length} onDelete={handleDelete}/>)}
                </div>
              </div>
            )}

            {timetable.length>0 && (
              <div>
                <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-6">Full Timetable</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1,2,3,4,5].map(day=>{
                    const dc = timetable.filter(c=>c.dayOfWeek===day).sort((a,b)=>a.startTime.localeCompare(b.startTime));
                    if(!dc.length) return null;
                    return (
                      <div key={day} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{DAYS[day]}</h3>
                        <div className="space-y-2">
                          {dc.map(cls=>(
                            <div key={cls.id} className="flex items-center gap-3 group">
                              <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{backgroundColor:cls.color}}/>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{cls.subject}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{cls.startTime}–{cls.endTime} · {cls.room}</div>
                              </div>
                              <motion.button onClick={()=>handleDelete(cls.id)} whileHover={{scale:1.1}} whileTap={{scale:0.9}}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0">
                                <Trash2 className="w-4 h-4"/>
                              </motion.button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <AnimatePresence>{showModal&&<AddClassModal onClose={()=>setShowModal(false)} onAdd={handleAdd}/>}</AnimatePresence>
    </motion.div>
  );
}

function TimeUnit({value,label}:{value:number;label:string}) {
  return (
    <div className="flex flex-col items-center">
      <motion.div key={value} initial={{y:-10,opacity:0}} animate={{y:0,opacity:1}} className="text-5xl md:text-7xl font-light text-gray-900 dark:text-white mb-1 tabular-nums">
        {String(value).padStart(2,'0')}
      </motion.div>
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function ClassCard({classData,index,onDelete}:{classData:ClassPeriod;index:number;onDelete:(id:string)=>void}) {
  const [hovered,setHovered]=useState(false);
  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.1+index*0.05}}
      onHoverStart={()=>setHovered(true)} onHoverEnd={()=>setHovered(false)}
      className="relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" whileHover={{scale:1.02,y:-4}}>
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{backgroundColor:classData.color}}/>
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{classData.subject}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">{classData.startTime}</span>
          <AnimatePresence>
            {hovered&&<motion.button initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.8}}
              onClick={()=>onDelete(classData.id)} className="text-red-400 hover:text-red-600" whileHover={{scale:1.1}}>
              <Trash2 className="w-4 h-4"/></motion.button>}
          </AnimatePresence>
        </div>
      </div>
      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
        <div className="flex items-center gap-2"><User className="w-4 h-4"/>{classData.teacher}</div>
        <div className="flex items-center gap-2"><MapPin className="w-4 h-4"/>{classData.room}</div>
        <div className="flex items-center gap-2"><Calendar className="w-4 h-4"/>{getDayName(classData.dayOfWeek)}</div>
      </div>
    </motion.div>
  );
}

function TimelineItem({classData,index,total,onDelete}:{classData:ClassPeriod;index:number;total:number;onDelete:(id:string)=>void}) {
  const [hovered,setHovered]=useState(false);
  return (
    <motion.div initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:0.1+index*0.05}}
      onHoverStart={()=>setHovered(true)} onHoverEnd={()=>setHovered(false)} className="flex gap-4 items-center">
      <div className="flex-shrink-0 text-right w-20">
        <div className="text-sm font-medium text-gray-900 dark:text-white">{classData.startTime}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{classData.endTime}</div>
      </div>
      <div className="relative flex-shrink-0">
        <div className="w-3 h-3 rounded-full" style={{backgroundColor:classData.color}}/>
        {index<total-1&&<div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gray-200 dark:bg-gray-700"/>}
      </div>
      <motion.div className="flex-1 rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-between" whileHover={{x:4}}>
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">{classData.subject}</h4>
          <div className="flex gap-3 text-sm text-gray-600 dark:text-gray-300 mt-1">
            <span className="flex items-center gap-1"><User className="w-3 h-3"/>{classData.teacher}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{classData.room}</span>
          </div>
        </div>
        <AnimatePresence>
          {hovered&&<motion.button initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.8}}
            onClick={()=>onDelete(classData.id)} className="text-red-400 hover:text-red-600 ml-3" whileHover={{scale:1.1}}>
            <Trash2 className="w-4 h-4"/></motion.button>}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function AddClassModal({onClose,onAdd}:{onClose:()=>void;onAdd:(p:ClassPeriod)=>Promise<void>}) {
  const [subject,setSubject]=useState('');const [teacher,setTeacher]=useState('');const [room,setRoom]=useState('');
  const [day,setDay]=useState(1);const [start,setStart]=useState('09:00');const [end,setEnd]=useState('10:00');
  const [color,setColor]=useState(COLORS[0]);const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setError('');
    try{setLoading(true);await onAdd({id:`cls-${Date.now()}`,subject:subject.trim(),teacher:teacher.trim(),room:room.trim(),dayOfWeek:day,startTime:start,endTime:end,color});}
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
          <h2 className="text-2xl font-light text-gray-900 dark:text-white">Add Class</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-6 h-6"/></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {[['Subject',subject,setSubject,'e.g. Mathematics'],['Teacher',teacher,setTeacher,'e.g. Mr Smith'],['Room',room,setRoom,'e.g. Room 204']].map(([label,val,setter,ph]:any)=>(
            <div key={label}><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input required value={val} onChange={e=>setter(e.target.value)} placeholder={ph}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"/></div>
          ))}
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Day</label>
            <select value={day} onChange={e=>setDay(+e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition">
              {DAYS.map((d,i)=><option key={d} value={i}>{d}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-4">
            {[['Start',start,setStart],['End',end,setEnd]].map(([label,val,setter]:any)=>(
              <div key={label}><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label} Time</label>
                <input required type="time" value={val} onChange={e=>setter(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"/></div>
            ))}
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Colour</label>
            <div className="flex gap-2 flex-wrap">{COLORS.map(c=><button key={c} type="button" onClick={()=>setColor(c)}
              className={`w-8 h-8 rounded-full transition-all ${color===c?'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110':'hover:scale-110'}`}
              style={{backgroundColor:c}}/>)}</div></div>
          {error&&<div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 transition">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{scale:1.01}} whileTap={{scale:0.99}}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50 transition flex items-center justify-center gap-2">
              {loading&&<Loader2 className="w-4 h-4 animate-spin"/>}{loading?'Saving…':'Add Class'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
