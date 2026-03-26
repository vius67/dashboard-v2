import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Award, Target, BarChart3, Plus, X, Trash2, Loader2 } from 'lucide-react';
import { pastPaperService } from '../../lib/db';
import { PastPaperResult } from '../types';

export default function PastPapers() {
  const [results,setResults]=useState<PastPaperResult[]>([]);
  const [loading,setLoading]=useState(true);const [showModal,setShowModal]=useState(false);
  const [deleting,setDeleting]=useState<string|null>(null);const [error,setError]=useState('');

  useEffect(()=>{load();},[]);
  const load=async()=>{try{setLoading(true);setResults(await pastPaperService.getAll());}catch(e:any){setError(e.message);}finally{setLoading(false);}};
  const handleAdd=async(r:PastPaperResult)=>{await pastPaperService.add(r);setResults(prev=>[...prev,r].sort((a,b)=>a.date.localeCompare(b.date)));setShowModal(false);};
  const handleDelete=async(id:string)=>{try{setDeleting(id);await pastPaperService.delete(id);setResults(prev=>prev.filter(r=>r.id!==id));}catch(e:any){setError(e.message);}finally{setDeleting(null);}};

  const avg=results.length?Math.round(results.reduce((s,r)=>s+r.percentage,0)/results.length):0;
  const high=results.length?Math.max(...results.map(r=>r.percentage)):0;
  const low=results.length?Math.min(...results.map(r=>r.percentage)):0;
  const subMap=results.reduce((acc,r)=>{if(!acc[r.subject])acc[r.subject]={total:0,count:0};acc[r.subject].total+=r.percentage;acc[r.subject].count++;return acc;},{} as Record<string,{total:number;count:number}>);
  const subAvgs=Object.entries(subMap).map(([subject,s])=>({subject,average:Math.round(s.total/s.count),count:s.count})).sort((a,b)=>b.average-a.average);
  const trendData=results.slice(-10).map((r,i)=>({i:i+1,score:r.percentage,date:new Date(r.date).toLocaleDateString('en-AU',{month:'short',day:'numeric'})}));

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="min-h-screen p-6 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} className="flex items-end justify-between gap-4">
          <div><h1 className="text-4xl md:text-5xl font-light mb-2 text-gray-900 dark:text-white">Past Paper Results</h1>
            <p className="text-gray-500 dark:text-gray-400">Track your performance and progress</p></div>
          <motion.button onClick={()=>setShowModal(true)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex-shrink-0">
            <Plus className="w-4 h-4"/><span className="hidden sm:inline">Add Result</span>
          </motion.button>
        </motion.div>

        {error&&<div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>}

        {loading?<div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-gray-400"/></div>:(
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[[BarChart3,'Average',`${avg}%`,0.1],[TrendingUp,'Highest',`${high}%`,0.15],[Target,'Lowest',`${low}%`,0.2],[Award,'Total',String(results.length),0.25]].map(([Icon,label,val,delay]:any)=>(
                <motion.div key={label} initial={{opacity:0,y:20,scale:0.9}} animate={{opacity:1,y:0,scale:1}} transition={{delay,type:'spring',stiffness:200}} whileHover={{y:-4,scale:1.02}}
                  className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <Icon className="w-8 h-8 text-emerald-500 mb-4"/>
                  <div className="text-3xl font-light text-gray-900 dark:text-white mb-1">{val}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{label} Score</div>
                </motion.div>
              ))}
            </div>

            {results.length>0&&(
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Performance Trend</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                        <XAxis dataKey="date" stroke="#9ca3af" tick={{fill:'#9ca3af'}}/>
                        <YAxis stroke="#9ca3af" tick={{fill:'#9ca3af'}} domain={[0,100]}/>
                        <Tooltip contentStyle={{backgroundColor:'rgba(255,255,255,0.95)',border:'1px solid #e5e7eb',borderRadius:'8px'}}/>
                        <Line type="monotone" dataKey="score" stroke="#10B981" strokeWidth={3} dot={{fill:'#10B981',r:5}} activeDot={{r:7}}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>
                  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.35}} className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Subject Averages</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={subAvgs}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                        <XAxis dataKey="subject" stroke="#9ca3af" tick={{fill:'#9ca3af',fontSize:11}} angle={-35} textAnchor="end" height={70}/>
                        <YAxis stroke="#9ca3af" tick={{fill:'#9ca3af'}} domain={[0,100]}/>
                        <Tooltip contentStyle={{backgroundColor:'rgba(255,255,255,0.95)',border:'1px solid #e5e7eb',borderRadius:'8px'}}/>
                        <Bar dataKey="average" fill="#3B82F6" radius={[6,6,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                </div>

                <div>
                  <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-6">Subject Breakdown</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subAvgs.map((s,i)=>{
                      const gc=s.average>=90?'from-green-500 to-emerald-500':s.average>=80?'from-blue-500 to-cyan-500':s.average>=70?'from-yellow-500 to-orange-500':'from-red-500 to-pink-500';
                      return (
                        <motion.div key={s.subject} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.45+i*0.05}} whileHover={{y:-4,scale:1.02}}
                          className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">{s.subject}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{s.count} {s.count===1?'paper':'papers'}</p>
                          <div className="flex items-end justify-between mb-2">
                            <span className="text-3xl font-light text-gray-900 dark:text-white">{s.average}%</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">Average</span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div className={`h-full bg-gradient-to-r ${gc}`} initial={{width:0}} animate={{width:`${s.average}%`}} transition={{delay:0.5+i*0.05,duration:1,ease:'easeOut'}}/>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-6">All Results</h2>
                  <div className="space-y-3">
                    {[...results].reverse().map((r,i)=><ResultCard key={r.id} result={r} index={i} onDelete={handleDelete} isDeleting={deleting===r.id}/>)}
                  </div>
                </div>
              </>
            )}

            {results.length===0&&(
              <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                className="rounded-3xl p-16 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600"/>
                <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-2">No results yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Add your first past paper result to start tracking</p>
                <motion.button onClick={()=>setShowModal(true)} whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                  <Plus className="w-4 h-4"/>Add Result
                </motion.button>
              </motion.div>
            )}
          </>
        )}
      </div>
      <AnimatePresence>{showModal&&<AddResultModal onClose={()=>setShowModal(false)} onAdd={handleAdd}/>}</AnimatePresence>
    </motion.div>
  );
}

function ResultCard({result,index,onDelete,isDeleting}:{result:PastPaperResult;index:number;onDelete:(id:string)=>void;isDeleting:boolean}) {
  const [hovered,setHovered]=useState(false);
  const gc=result.percentage>=90?'text-green-500 bg-green-500/10':result.percentage>=80?'text-blue-500 bg-blue-500/10':result.percentage>=70?'text-yellow-500 bg-yellow-500/10':'text-red-500 bg-red-500/10';
  return (
    <motion.div initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:0.02*index}}
      onHoverStart={()=>setHovered(true)} onHoverEnd={()=>setHovered(false)} whileHover={{x:4}}
      className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`flex items-center justify-center w-16 h-16 rounded-xl flex-shrink-0 ${gc}`}>
          <span className="text-xl font-medium">{result.percentage}%</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">{result.title||result.subject}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">{result.subject}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(result.date).toLocaleDateString('en-AU',{month:'long',day:'numeric',year:'numeric'})}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <div className="text-lg font-medium text-gray-900 dark:text-white">{result.score}/{result.maxScore}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">marks</div>
        </div>
        <AnimatePresence>
          {hovered&&<motion.button initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.8}}
            onClick={()=>onDelete(result.id)} disabled={isDeleting} className="text-red-400 hover:text-red-600 disabled:opacity-50" whileHover={{scale:1.1}}>
            {isDeleting?<Loader2 className="w-5 h-5 animate-spin"/>:<Trash2 className="w-5 h-5"/>}
          </motion.button>}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function AddResultModal({onClose,onAdd}:{onClose:()=>void;onAdd:(r:PastPaperResult)=>Promise<void>}) {
  const [subject,setSubject]=useState('');const [title,setTitle]=useState('');
  const [score,setScore]=useState('');const [maxScore,setMaxScore]=useState('');
  const [date,setDate]=useState(new Date().toISOString().split('T')[0]);
  const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  const pct=score&&maxScore&&+maxScore>0&&+score>=0&&+score<=+maxScore?Math.round((+score/+maxScore)*100):null;
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setError('');
    const s=parseFloat(score),m=parseFloat(maxScore);
    if(isNaN(s)||isNaN(m)||m<=0||s<0||s>m){setError('Score must be between 0 and max score');return;}
    try{setLoading(true);await onAdd({id:`pp-${Date.now()}`,subject:subject.trim(),title:title.trim(),date,score:s,maxScore:m,percentage:Math.round((s/m)*100)});}
    catch(err:any){setError(err.message);}finally{setLoading(false);}
  };
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <motion.div initial={{opacity:0,scale:0.95,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:20}}
        transition={{type:'spring',stiffness:300,damping:30}}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-light text-gray-900 dark:text-white">Add Result</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-6 h-6"/></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {[['Title',title,setTitle,'e.g. 2023 HSC Trial'],['Subject',subject,setSubject,'e.g. Mathematics']].map(([label,val,setter,ph]:any)=>(
            <div key={label}><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input required value={val} onChange={e=>setter(e.target.value)} placeholder={ph}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"/></div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            {[['Score',score,setScore,'e.g. 78'],['Max Score',maxScore,setMaxScore,'e.g. 100']].map(([label,val,setter,ph]:any)=>(
              <div key={label}><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <input required type="number" min="0" step="0.5" value={val} onChange={e=>setter(e.target.value)} placeholder={ph}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"/></div>
            ))}
          </div>
          {pct!==null&&<div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm text-center font-medium">Percentage: {pct}%</div>}
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input required type="date" value={date} onChange={e=>setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"/></div>
          {error&&<div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 transition">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{scale:1.01}} whileTap={{scale:0.99}}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50 transition flex items-center justify-center gap-2">
              {loading&&<Loader2 className="w-4 h-4 animate-spin"/>}{loading?'Saving…':'Add Result'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
