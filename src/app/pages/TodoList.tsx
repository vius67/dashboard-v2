import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { CheckCircle2, Circle, Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { todoService } from '../../lib/db';
import { TodoItem } from '../types';
import confetti from 'canvas-confetti';

export default function TodoList() {
  const [todos,setTodos]=useState<TodoItem[]>([]);const [newText,setNewText]=useState('');
  const [filter,setFilter]=useState<'all'|'active'|'completed'>('all');
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');

  useEffect(()=>{load();},[]);
  const load=async()=>{try{setLoading(true);setTodos(await todoService.getAll());}catch(e:any){setError(e.message);}finally{setLoading(false);}};

  const addTodo=async()=>{
    if(!newText.trim())return;
    const t:TodoItem={id:`todo-${Date.now()}`,text:newText.trim(),completed:false,createdAt:new Date().toISOString()};
    try{await todoService.add(t);setTodos(prev=>[...prev,t]);setNewText('');}catch(e:any){setError(e.message);}
  };

  const toggle=async(id:string)=>{
    const todo=todos.find(t=>t.id===id);if(!todo)return;
    const completed=!todo.completed;
    try{await todoService.toggle(id,completed);setTodos(prev=>prev.map(t=>t.id===id?{...t,completed}:t));
      if(completed)confetti({particleCount:50,spread:60,origin:{y:0.6},colors:['#10B981','#3B82F6','#8B5CF6']});}
    catch(e:any){setError(e.message);}
  };

  const remove=async(id:string)=>{try{await todoService.delete(id);setTodos(prev=>prev.filter(t=>t.id!==id));}catch(e:any){setError(e.message);}};

  const filtered=todos.filter(t=>filter==='active'?!t.completed:filter==='completed'?t.completed:true);
  const stats={total:todos.length,active:todos.filter(t=>!t.completed).length,done:todos.filter(t=>t.completed).length};

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="min-h-screen p-6 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}}>
          <h1 className="text-4xl md:text-5xl font-light mb-2 text-gray-900 dark:text-white">To-Do List</h1>
          <p className="text-gray-500 dark:text-gray-400">Organise your tasks and stay productive</p>
        </motion.div>

        {error&&<div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>}

        <div className="grid grid-cols-3 gap-4">
          {[['Total',stats.total,0.1],['Active',stats.active,0.15],['Done',stats.done,0.2]].map(([label,val,delay]:any)=>(
            <motion.div key={label} initial={{opacity:0,y:20,scale:0.9}} animate={{opacity:1,y:0,scale:1}} transition={{delay,type:'spring',stiffness:200}} whileHover={{y:-4,scale:1.02}}
              className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
              <div className="text-3xl font-light text-gray-900 dark:text-white mb-1">{val}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.25}}>
          <div className="flex gap-3">
            <input type="text" value={newText} onChange={e=>setNewText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTodo()}
              placeholder="Add a new task…"
              className="flex-1 px-6 py-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"/>
            <motion.button onClick={addTodo} whileHover={{scale:1.05}} whileTap={{scale:0.95}}
              className="px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-2 transition-colors">
              <Plus className="w-5 h-5"/><span className="hidden sm:inline">Add</span>
            </motion.button>
          </div>
        </motion.div>

        <div className="flex gap-2">
          {(['all','active','completed'] as const).map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${filter===s?'bg-emerald-600 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>

        {loading?<div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-gray-400"/></div>:(
          <div className="space-y-3">
            <Reorder.Group axis="y" values={filtered} onReorder={o=>{if(filter==='all')setTodos(o);}} className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((todo,i)=><TodoCard key={todo.id} todo={todo} index={i} onToggle={toggle} onDelete={remove} canReorder={filter==='all'}/>)}
              </AnimatePresence>
            </Reorder.Group>
            {filtered.length===0&&(
              <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                className="rounded-3xl p-12 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 text-center">
                <Circle className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600"/>
                <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-2">No tasks found</h3>
                <p className="text-gray-500 dark:text-gray-400">{filter==='all'?'Add a task above to get started':filter==='active'?'No active tasks':'No completed tasks'}</p>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TodoCard({todo,index,onToggle,onDelete,canReorder}:{todo:TodoItem;index:number;onToggle:(id:string)=>void;onDelete:(id:string)=>void;canReorder:boolean}) {
  const [hovered,setHovered]=useState(false);
  const cls="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700";
  const content=(
    <>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {canReorder&&<div className="cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-600"><GripVertical className="w-5 h-5"/></div>}
        <motion.button onClick={()=>onToggle(todo.id)} whileHover={{scale:1.1}} whileTap={{scale:0.9}}
          className={`flex-shrink-0 ${todo.completed?'text-green-500':'text-gray-400 dark:text-gray-600'}`}>
          {todo.completed?<CheckCircle2 className="w-6 h-6"/>:<Circle className="w-6 h-6"/>}
        </motion.button>
        <span className={`flex-1 text-left transition-all ${todo.completed?'line-through text-gray-400 dark:text-gray-600':'text-gray-900 dark:text-white'}`}>{todo.text}</span>
      </div>
      <AnimatePresence>
        {hovered&&<motion.button initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.8}}
          onClick={()=>onDelete(todo.id)} whileHover={{scale:1.1}} whileTap={{scale:0.9}} className="text-red-500 hover:text-red-600">
          <Trash2 className="w-5 h-5"/></motion.button>}
      </AnimatePresence>
    </>
  );
  if(canReorder) return (
    <Reorder.Item value={todo} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.95}} transition={{delay:index*0.04}}
      onHoverStart={()=>setHovered(true)} onHoverEnd={()=>setHovered(false)} className={cls} whileHover={{scale:1.01,y:-2}}>
      {content}
    </Reorder.Item>
  );
  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.95}} transition={{delay:index*0.04}}
      onHoverStart={()=>setHovered(true)} onHoverEnd={()=>setHovered(false)} className={cls} whileHover={{scale:1.01,y:-2}}>
      {content}
    </motion.div>
  );
}
