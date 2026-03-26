import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Clock, CheckCircle2, Circle, AlertCircle, Plus, X, Trash2, Loader2 } from 'lucide-react';
import { homeworkService } from '../../lib/db';
import { Homework } from '../types';
import { formatDate, getDaysUntil } from '../utils/timeUtils';

const COLORS = ['#8B5CF6','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16'];

export default function HomeworkPage() {
  const [homework,setHomework]=useState<Homework[]>([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState<'all'|'not-started'|'in-progress'|'done'>('all');
  const [showModal,setShowModal]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{load();},[]);
  const load=async()=>{try{setLoading(true);setHomework(await homeworkService.getAll());}catch(e:any){setError(e.message);}finally{setLoading(false);}};
  const updateStatus=async(id:string,status:Homework['status'])=>{try{await homeworkService.updateStatus(id,status);setHomework(prev=>prev.map(h=>h.id===id?{...h,status}:h));}catch(e:any){setError(e.message);}};
  const handleAdd=async(hw:Homework)=>{await homeworkService.upsert(hw);setHomework(prev=>[...prev,hw].sort((a,b)=>a.dueDate.localeCompare(b.dueDate)));setShowModal(false);};
  const handleDelete=async(id:string)=>{try{await homeworkService.delete(id);setHomework(prev=>prev.filter(h=>h.id!==id));}catch(e:any){setError(e.message);}};

  const filtered=filter==='all'?homework:homework.filter(h=>h.status===filter);
  const stats={total:homework.length,notStarted:homework.filter(h=>h.status==='not-started').length,inProgress:homework.filter(h=>h.status==='in-progress').length,done:homework.filter(h=>h.status==='done').length};

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="min-h-screen p-6 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} className="flex items-end justify-between gap-4">
          <div><h1 className="text-4xl md:text-5xl font-light mb-2 text-gray-900 dark:text-white">Homework</h1>
            <p className="text-gray-500 dark:text-gray-400">Track your assignments and deadlines</p></div>
          <motion.button onClick={()=>setShowModal(true)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex-shrink-0">
            <Plus className="w-4 h-4"/><span className="hidden sm:inline">Add Homework</span>
          </motion.button>
        </motion.div>

        {error&&<div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[['Total',stats.total,'bg-gray-500',0.1],['Not Started',stats.notStarted,'bg-red-500',0.15],['In Progress',stats.inProgress,'bg-yellow-500',0.2],['Completed',stats.done,'bg-green-500',0.25]].map(([label,val,color,delay]:any)=>(
            <motion.div key={label} initial={{opacity:0,y:20,scale:0.9}} animate={{opacity:1,y:0,scale:1}} transition={{delay,type:'spring',stiffness:200}} whileHover={{y:-4,scale:1.02}}
              className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className={`w-2 h-2 rounded-full ${color} mb-4`}/><div className="text-3xl font-light text-gray-900 dark:text-white mb-1">{val}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all','not-started','in-progress','done'] as const).map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filter===s?'bg-emerald-600 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {s==='all'?'All':s==='not-started'?'Not Started':s==='in-progress'?'In Progress':'Done'}
            </button>
          ))}
        </div>

        {loading?<div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-gray-400"/></div>:(
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((hw,i)=><HWCard key={hw.id} hw={hw} index={i} onStatus={updateStatus} onDelete={handleDelete}/>)}
            </AnimatePresence>
            {filtered.length===0&&(
              <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                className="rounded-3xl p-12 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600"/>
                <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-2">No homework found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{filter==='all'?'Add your first assignment to get started':`No ${filter.replace('-',' ')} assignments`}</p>
                {filter==='all'&&<motion.button onClick={()=>setShowModal(true)} whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                  <Plus className="w-4 h-4"/>Add Homework</motion.button>}
              </motion.div>
            )}
          </div>
        )}
      </div>
      <AnimatePresence>{showModal&&<AddHWModal onClose={()=>setShowModal(false)} onAdd={handleAdd}/>}</AnimatePresence>
    </motion.div>
  );
}

function HWCard({hw,index,onStatus,onDelete}:{hw:Homework;index:number;onStatus:(id:string,s:Homework['status'])=>void;onDelete:(id:string)=>void}) {
  const [expanded,setExpanded]=useState(false);const [hovered,setHovered]=useState(false);
  const daysUntil=getDaysUntil(hw.dueDate);const urgent=daysUntil<=2&&hw.status!=='done';
  const cfg={'not-started':{Icon:Circle,color:'text-red-500',bg:'bg-red-500/10'},'in-progress':{Icon:AlertCircle,color:'text-yellow-500',bg:'bg-yellow-500/10'},'done':{Icon:CheckCircle2,color:'text-green-500',bg:'bg-green-500/10'}}[hw.status];
  return (
    <motion.div layout initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.95}} transition={{delay:index*0.04}}
      onHoverStart={()=>setHovered(true)} onHoverEnd={()=>setHovered(false)}
      className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{backgroundColor:hw.color}}/>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <motion.button onClick={()=>{const s:Homework['status'][]=['not-started','in-progress','done'];onStatus(hw.id,s[(s.indexOf(hw.status)+1)%3]);}}
                whileHover={{scale:1.1}} whileTap={{scale:0.9}} className={`flex-shrink-0 ${cfg.color}`}>
                <cfg.Icon className="w-6 h-6"/>
              </motion.button>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">{hw.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{hw.subject}</p>
              </div>
            </div>
            <AnimatePresence>
              {expanded&&hw.description&&<motion.p initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                className="text-gray-600 dark:text-gray-300 mt-3 text-sm">{hw.description}</motion.p>}
            </AnimatePresence>
          </div>
          <div className="flex items-start gap-2 flex-shrink-0">
            <div className="text-right">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${urgent?'bg-red-500/20 text-red-600 dark:text-red-400':'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                <Clock className="w-3 h-3"/>{formatDate(hw.dueDate)}
              </div>
              {daysUntil>0&&<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{daysUntil} day{daysUntil!==1?'s':''} left</div>}
              {daysUntil===0&&<div className="text-xs text-red-500 mt-1">Due today</div>}
            </div>
            <AnimatePresence>
              {hovered&&<motion.button initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.8}}
                onClick={()=>onDelete(hw.id)} className="text-red-400 hover:text-red-600" whileHover={{scale:1.1}}>
                <Trash2 className="w-5 h-5"/></motion.button>}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <motion.button onClick={()=>setExpanded(!expanded)} whileHover={{x:4}} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            {expanded?'Show less':'Show more'}
          </motion.button>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>{hw.status.replace('-',' ')}</span>
        </div>
        {hw.status!=='done'&&(
          <div className="mt-4 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div className="h-full" style={{backgroundColor:hw.color}} initial={{width:0}}
              animate={{width:hw.status==='in-progress'?'50%':'0%'}} transition={{duration:0.8,ease:'easeOut'}}/>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AddHWModal({onClose,onAdd}:{onClose:()=>void;onAdd:(hw:Homework)=>Promise<void>}) {
  const [subject,setSubject]=useState('');const [title,setTitle]=useState('');const [description,setDescription]=useState('');
  const [dueDate,setDueDate]=useState(new Date().toISOString().split('T')[0]);const [color,setColor]=useState(COLORS[0]);
  const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setError('');
    try{setLoading(true);await onAdd({id:`hw-${Date.now()}`,subject:subject.trim(),title:title.trim(),description:description.trim(),dueDate,status:'not-started',color});}
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
          <h2 className="text-2xl font-light text-gray-900 dark:text-white">Add Homework</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-6 h-6"/></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {[['Title',title,setTitle,'e.g. Chapter 5 Problems'],['Subject',subject,setSubject,'e.g. Mathematics']].map(([label,val,setter,ph]:any)=>(
            <div key={label}><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input required value={val} onChange={e=>setter(e.target.value)} placeholder={ph}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"/></div>
          ))}
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Notes or details…" rows={3}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none"/></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
            <input required type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"/></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Colour</label>
            <div className="flex gap-2 flex-wrap">{COLORS.map(c=><button key={c} type="button" onClick={()=>setColor(c)}
              className={`w-8 h-8 rounded-full transition-all ${color===c?'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110':'hover:scale-110'}`}
              style={{backgroundColor:c}}/>)}</div></div>
          {error&&<div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 transition">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{scale:1.01}} whileTap={{scale:0.99}}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50 transition flex items-center justify-center gap-2">
              {loading&&<Loader2 className="w-4 h-4 animate-spin"/>}{loading?'Saving…':'Add Homework'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
