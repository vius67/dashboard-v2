import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Loader2, ChevronDown, ChevronRight,
  Flag, Calendar, Layout, List, MoreHorizontal, X, Check,
  Inbox, Tag, AlignLeft,
} from 'lucide-react';
import { todoService } from '../../lib/db';
import { TodoItem } from '../types';
import { useApp } from '../context/AppContext';
import confetti from 'canvas-confetti';

const PRIORITY_LABEL: Record<number, string> = { 1: 'Urgent', 2: 'High', 3: 'Medium', 4: 'None' };
const PRIORITY_COLOR: Record<number, string> = {
  1: 'text-red-500', 2: 'text-orange-400', 3: 'text-blue-400', 4: 'text-gray-400',
};
const PRIORITY_BG: Record<number, string> = {
  1: 'bg-red-500/10 border-red-500/20', 2: 'bg-orange-400/10 border-orange-400/20',
  3: 'bg-blue-400/10 border-blue-400/20', 4: 'bg-gray-400/10 border-gray-300/20',
};
const PRIORITY_FLAG_COLOR: Record<number, string> = {
  1: '#ef4444', 2: '#fb923c', 3: '#60a5fa', 4: '#9ca3af',
};

function genId() { return `todo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

function fmtDate(d: string) {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dt = new Date(d + 'T00:00:00');
  if (dt.getTime() === today.getTime()) return 'Today';
  if (dt.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function isOverdue(d: string) {
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(d + 'T00:00:00') < today;
}

export default function TodoList() {
  const { darkMode } = useApp();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'today' | 'board' | 'all'>('today');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overdueClosed, setOverdueClosed] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setLoading(true); setTodos(await todoService.getAll()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const addTodo = async (partial: Partial<TodoItem> & { text: string }) => {
    const t: TodoItem = {
      id: genId(), text: partial.text, completed: false, createdAt: new Date().toISOString(),
      project: partial.project, priority: partial.priority ?? 4,
      dueDate: partial.dueDate, notes: partial.notes,
    };
    try { await todoService.add(t); setTodos(prev => [...prev, t]); }
    catch (e: any) { setError(e.message); }
  };

  const toggle = async (id: string) => {
    const todo = todos.find(t => t.id === id); if (!todo) return;
    const completed = !todo.completed;
    try {
      await todoService.toggle(id, completed);
      if (completed) {
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.6 }, colors: ['#10B981','#3B82F6','#8B5CF6'] });
        setTimeout(() => setTodos(prev => prev.filter(t => t.id !== id)), 600);
      } else {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
      }
    } catch (e: any) { setError(e.message); }
  };

  const remove = async (id: string) => {
    try { await todoService.delete(id); setTodos(prev => prev.filter(t => t.id !== id)); }
    catch (e: any) { setError(e.message); }
  };

  const updateTodo = async (updated: TodoItem) => {
    try { await todoService.update(updated); setTodos(prev => prev.map(t => t.id === updated.id ? updated : t)); }
    catch (e: any) { setError(e.message); }
  };

  const projects = Array.from(new Set(todos.map(t => t.project).filter(Boolean))) as string[];
  const totalActive = todos.filter(t => !t.completed).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 md:px-8 lg:px-12 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Tasks</h1>
            {totalActive > 0 && (
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                {totalActive}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
            {([['today','Today',<List className="w-3.5 h-3.5"/>],['board','Board',<Layout className="w-3.5 h-3.5"/>],['all','Inbox',<Inbox className="w-3.5 h-3.5"/>]] as const).map(([v,label,icon]) => (
              <button key={v} onClick={() => setView(v as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view === v ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}>
                {icon}<span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-gray-400"/></div>
        ) : (
          <>
            {view === 'today' && <TodayView todos={todos} overdueClosed={overdueClosed} setOverdueClosed={setOverdueClosed} editingId={editingId} setEditingId={setEditingId} onToggle={toggle} onDelete={remove} onUpdate={updateTodo} onAdd={addTodo} darkMode={darkMode}/>}
            {view === 'board' && <BoardView todos={todos} projects={projects} editingId={editingId} setEditingId={setEditingId} onToggle={toggle} onDelete={remove} onUpdate={updateTodo} onAdd={addTodo} showNewProject={showNewProject} setShowNewProject={setShowNewProject} newProjectName={newProjectName} setNewProjectName={setNewProjectName} darkMode={darkMode}/>}
            {view === 'all' && <AllView todos={todos} editingId={editingId} setEditingId={setEditingId} onToggle={toggle} onDelete={remove} onUpdate={updateTodo} onAdd={addTodo} darkMode={darkMode}/>}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── TODAY VIEW ─────────────────────────────────────────────────────────
function TodayView({ todos, overdueClosed, setOverdueClosed, editingId, setEditingId, onToggle, onDelete, onUpdate, onAdd, darkMode }: any) {
  const today = new Date().toISOString().split('T')[0];
  const todayStr = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  const overdue = todos.filter((t: TodoItem) => !t.completed && t.dueDate && isOverdue(t.dueDate));
  const todayTasks = todos.filter((t: TodoItem) => !t.completed && t.dueDate === today);
  const noDateTasks = todos.filter((t: TodoItem) => !t.completed && !t.dueDate);
  const total = overdue.length + todayTasks.length + noDateTasks.length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-light text-gray-900 dark:text-white mb-0.5">Today</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500">{todayStr} · {total} task{total !== 1 ? 's' : ''}</p>
      </div>

      {overdue.length > 0 && (
        <div>
          <button onClick={() => setOverdueClosed((p: boolean) => !p)} className="flex items-center gap-2 w-full text-left mb-1 group">
            {overdueClosed ? <ChevronRight className="w-3.5 h-3.5 text-red-400"/> : <ChevronDown className="w-3.5 h-3.5 text-red-400"/>}
            <span className="text-xs font-semibold uppercase tracking-wider text-red-500">Overdue</span>
            <div className="flex-1 h-px bg-red-200 dark:bg-red-900/40 ml-1"/>
            <span className="text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity mr-1">Reschedule</span>
          </button>
          <AnimatePresence>
            {!overdueClosed && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                {overdue.map((t: TodoItem) => <TaskRow key={t.id} todo={t} editing={editingId === t.id} onStartEdit={() => setEditingId(t.id)} onEndEdit={() => setEditingId(null)} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} darkMode={darkMode}/>)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} · Today · {new Date().toLocaleDateString('en-AU', { weekday: 'long' })}
          </span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700/60"/>
        </div>
        {todayTasks.map((t: TodoItem) => <TaskRow key={t.id} todo={t} editing={editingId === t.id} onStartEdit={() => setEditingId(t.id)} onEndEdit={() => setEditingId(null)} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} darkMode={darkMode}/>)}
        {noDateTasks.map((t: TodoItem) => <TaskRow key={t.id} todo={t} editing={editingId === t.id} onStartEdit={() => setEditingId(t.id)} onEndEdit={() => setEditingId(null)} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} darkMode={darkMode}/>)}
        <AddTaskInline onAdd={(text: string, opts: any) => onAdd({ text, dueDate: today, ...opts })} darkMode={darkMode}/>
      </div>
    </div>
  );
}

// ── BOARD VIEW ─────────────────────────────────────────────────────────
function BoardView({ todos, projects, editingId, setEditingId, onToggle, onDelete, onUpdate, onAdd, showNewProject, setShowNewProject, newProjectName, setNewProjectName, darkMode }: any) {
  const allProjects = ['Inbox', ...projects.filter((p: string) => p !== 'Inbox')];

  const addProject = () => {
    if (!newProjectName.trim()) return;
    setNewProjectName('');
    setShowNewProject(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-light text-gray-900 dark:text-white">Board</h2>
        <button onClick={() => setShowNewProject(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Plus className="w-3.5 h-3.5"/> Add project
        </button>
      </div>

      {showNewProject && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-4">
          <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addProject(); if (e.key === 'Escape') setShowNewProject(false); }}
            placeholder="Project name…"
            className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}/>
          <button onClick={addProject} className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600">Add</button>
          <button onClick={() => setShowNewProject(false)} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
        </motion.div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {allProjects.map((project: string) => {
          const projectTodos = todos.filter((t: TodoItem) =>
            !t.completed && (project === 'Inbox' ? !t.project : t.project === project)
          ).sort((a: TodoItem, b: TodoItem) => (a.priority ?? 4) - (b.priority ?? 4));
          return (
            <KanbanColumn key={project} project={project} todos={projectTodos} editingId={editingId} setEditingId={setEditingId}
              onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate}
              onAdd={(text: string, opts: any) => onAdd({ text, project: project === 'Inbox' ? undefined : project, ...opts })}
              darkMode={darkMode}/>
          );
        })}
      </div>
    </div>
  );
}

function KanbanColumn({ project, todos, editingId, setEditingId, onToggle, onDelete, onUpdate, onAdd, darkMode }: any) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{project}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{todos.length}</span>
        </div>
        <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><MoreHorizontal className="w-4 h-4"/></button>
      </div>
      <div className="space-y-2">
        {todos.map((t: TodoItem) => (
          <KanbanCard key={t.id} todo={t} editing={editingId === t.id} onStartEdit={() => setEditingId(t.id)} onEndEdit={() => setEditingId(null)}
            onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} darkMode={darkMode}/>
        ))}
      </div>
      <AddTaskInline onAdd={onAdd} darkMode={darkMode} compact/>
    </div>
  );
}

// ── ALL / INBOX VIEW ───────────────────────────────────────────────────
function AllView({ todos, editingId, setEditingId, onToggle, onDelete, onUpdate, onAdd, darkMode }: any) {
  const active = todos.filter((t: TodoItem) => !t.completed)
    .sort((a: TodoItem, b: TodoItem) => {
      const pDiff = (a.priority ?? 4) - (b.priority ?? 4);
      if (pDiff !== 0) return pDiff;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1; if (b.dueDate) return 1;
      return 0;
    });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Inbox className="w-5 h-5 text-gray-400"/>
        <h2 className="text-2xl font-light text-gray-900 dark:text-white">Inbox</h2>
      </div>
      <div>
        {active.map((t: TodoItem) => (
          <TaskRow key={t.id} todo={t} editing={editingId === t.id} onStartEdit={() => setEditingId(t.id)} onEndEdit={() => setEditingId(null)}
            onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} darkMode={darkMode} showProject/>
        ))}
        {active.length === 0 && (
          <div className="text-center py-16">
            <Check className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700"/>
            <p className="text-sm text-gray-400 dark:text-gray-600">All done!</p>
          </div>
        )}
      </div>
      <AddTaskInline onAdd={onAdd} darkMode={darkMode}/>
    </div>
  );
}

// ── TASK ROW ───────────────────────────────────────────────────────────
function TaskRow({ todo, editing, onStartEdit, onEndEdit, onToggle, onDelete, onUpdate, darkMode, showProject }: {
  todo: TodoItem; editing: boolean; onStartEdit: () => void; onEndEdit: () => void;
  onToggle: (id: string) => void; onDelete: (id: string) => void; onUpdate: (t: TodoItem) => void;
  darkMode: boolean; showProject?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [completing, setCompleting] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); setCompleting(true);
    setTimeout(() => onToggle(todo.id), 250);
  };

  if (editing) return (
    <TaskEditRow todo={todo} onSave={(updated: TodoItem) => { onUpdate(updated); onEndEdit(); }}
      onCancel={onEndEdit} onDelete={() => { onDelete(todo.id); onEndEdit(); }} darkMode={darkMode}/>
  );

  const overdue = todo.dueDate && isOverdue(todo.dueDate);

  return (
    <motion.div
      animate={{ opacity: completing ? 0 : 1 }} transition={{ duration: 0.25 }}
      onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)}
      className={`group flex items-start gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors ${hovered ? (darkMode ? 'bg-white/5' : 'bg-gray-50') : ''}`}
      onClick={onStartEdit}>
      <button onClick={handleToggle} className="flex-shrink-0 mt-0.5">
        <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
          className={`rounded-full border-2 flex items-center justify-center transition-all ${completing ? 'border-emerald-500 bg-emerald-500' : ''}`}
          style={{ width: 18, height: 18, borderColor: completing ? '#10b981' : PRIORITY_FLAG_COLOR[todo.priority ?? 4] }}>
          {completing && <Check className="w-2.5 h-2.5 text-white"/>}
        </motion.div>
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white leading-snug">{todo.text}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {todo.dueDate && (
            <span className={`text-xs flex items-center gap-0.5 ${overdue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
              <Calendar className="w-3 h-3"/>{fmtDate(todo.dueDate)}
            </span>
          )}
          {showProject && todo.project && (
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
              <Tag className="w-3 h-3"/>{todo.project}
            </span>
          )}
          {todo.notes && <AlignLeft className="w-3 h-3 text-gray-400 dark:text-gray-600"/>}
        </div>
      </div>
      <AnimatePresence>
        {hovered && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { e.stopPropagation(); onDelete(todo.id); }}
            className="flex-shrink-0 p-1 rounded text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5"/>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── KANBAN CARD ────────────────────────────────────────────────────────
function KanbanCard({ todo, editing, onStartEdit, onEndEdit, onToggle, onDelete, onUpdate, darkMode }: any) {
  const [completing, setCompleting] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); setCompleting(true);
    setTimeout(() => onToggle(todo.id), 300);
  };

  if (editing) return (
    <TaskEditRow todo={todo} onSave={(updated: TodoItem) => { onUpdate(updated); onEndEdit(); }}
      onCancel={onEndEdit} onDelete={() => { onDelete(todo.id); onEndEdit(); }} darkMode={darkMode}/>
  );

  const overdue = todo.dueDate && isOverdue(todo.dueDate);

  return (
    <motion.div animate={{ opacity: completing ? 0 : 1, scale: completing ? 0.95 : 1 }} transition={{ duration: 0.25 }}
      onClick={onStartEdit}
      className={`p-3 rounded-xl border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-sm ${darkMode ? 'bg-gray-800/80 border-gray-700/60 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'}`}>
      <div className="flex items-start gap-2 mb-1.5">
        <button onClick={handleToggle} className="flex-shrink-0 mt-0.5">
          <div className="w-4 h-4 rounded-full border-2 transition-all"
            style={{ borderColor: PRIORITY_FLAG_COLOR[todo.priority ?? 4] }}/>
        </button>
        <p className="flex-1 text-sm text-gray-900 dark:text-white leading-snug">{todo.text}</p>
      </div>
      {(todo.dueDate || todo.notes || (todo.priority && todo.priority < 4)) && (
        <div className="flex items-center gap-2 pl-6 flex-wrap">
          {todo.dueDate && (
            <span className={`text-xs flex items-center gap-0.5 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
              <Calendar className="w-3 h-3"/>{fmtDate(todo.dueDate)}
            </span>
          )}
          {todo.priority && todo.priority < 4 && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_BG[todo.priority]} ${PRIORITY_COLOR[todo.priority]}`}>
              {PRIORITY_LABEL[todo.priority]}
            </span>
          )}
          {todo.notes && <AlignLeft className="w-3 h-3 text-gray-400"/>}
        </div>
      )}
    </motion.div>
  );
}

// ── TASK EDIT ROW ──────────────────────────────────────────────────────
function TaskEditRow({ todo, onSave, onCancel, onDelete, darkMode }: {
  todo: TodoItem; onSave: (t: TodoItem) => void; onCancel: () => void; onDelete: () => void; darkMode: boolean;
}) {
  const [text, setText] = useState(todo.text);
  const [priority, setPriority] = useState<1|2|3|4>(todo.priority ?? 4);
  const [dueDate, setDueDate] = useState(todo.dueDate ?? '');
  const [notes, setNotes] = useState(todo.notes ?? '');
  const [showNotes, setShowNotes] = useState(!!todo.notes);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const save = () => {
    if (!text.trim()) return;
    onSave({ ...todo, text: text.trim(), priority, dueDate: dueDate || undefined, notes: notes.trim() || undefined });
  };

  const inp = darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';

  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-3 mb-1 ${darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
      <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel(); }}
        className="w-full text-sm bg-transparent border-none outline-none text-gray-900 dark:text-white mb-2"/>
      {showNotes && (
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes…"
          className="w-full text-xs bg-transparent border-none outline-none resize-none text-gray-500 dark:text-gray-400 placeholder-gray-400 mb-2"/>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
          className={`text-xs px-2 py-1 rounded-lg border focus:outline-none ${inp}`}/>
        <div className="flex items-center gap-0.5">
          {([1,2,3,4] as const).map(p => (
            <button key={p} onClick={() => setPriority(p)}
              className={`w-6 h-6 rounded flex items-center justify-center transition-all ${priority === p ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <Flag className={`w-3.5 h-3.5 ${PRIORITY_COLOR[p]}`} style={{ fill: priority === p ? PRIORITY_FLAG_COLOR[p] : 'none' }}/>
            </button>
          ))}
        </div>
        <button onClick={() => setShowNotes(p => !p)}
          className={`p-1 rounded transition-colors ${showNotes ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'} hover:bg-gray-100 dark:hover:bg-gray-700`}>
          <AlignLeft className="w-3.5 h-3.5"/>
        </button>
        <div className="flex-1"/>
        <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
        <button onClick={onCancel} className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
        <button onClick={save} disabled={!text.trim()} className="px-3 py-1 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-40">Save</button>
      </div>
    </motion.div>
  );
}

// ── ADD TASK INLINE ────────────────────────────────────────────────────
function AddTaskInline({ onAdd, darkMode, defaultProject, compact }: {
  onAdd: (text: string, opts?: Partial<TodoItem>) => void;
  darkMode: boolean; defaultProject?: string; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<1|2|3|4>(4);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const submit = () => {
    if (!text.trim()) return;
    onAdd(text.trim(), { priority, dueDate: dueDate || undefined, notes: notes.trim() || undefined, project: defaultProject });
    setText(''); setPriority(4); setDueDate(''); setNotes(''); setShowNotes(false); setOpen(false);
  };

  const inp = darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 w-full mt-2 px-2 py-2 rounded-lg text-sm text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
      <Plus className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-red-400 group-hover:text-red-500`}/>
      <span className={compact ? 'text-xs' : 'text-sm'}>Add task</span>
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className={`mt-2 rounded-xl border p-3 ${darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
      <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setOpen(false); setText(''); } }}
        placeholder="Task name"
        className="w-full text-sm bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 mb-2"/>
      {showNotes && (
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes…"
          className="w-full text-xs bg-transparent border-none outline-none resize-none text-gray-500 dark:text-gray-400 placeholder-gray-400 mb-2"/>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
          className={`text-xs px-2 py-1 rounded-lg border focus:outline-none ${inp}`}/>
        <div className="flex items-center gap-0.5">
          {([1,2,3,4] as const).map(p => (
            <button key={p} onClick={() => setPriority(p)}
              className={`w-6 h-6 rounded flex items-center justify-center transition-all ${priority === p ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <Flag className={`w-3 h-3 ${PRIORITY_COLOR[p]}`} style={{ fill: priority === p ? PRIORITY_FLAG_COLOR[p] : 'none' }}/>
            </button>
          ))}
        </div>
        <button onClick={() => setShowNotes(p => !p)}
          className={`p-1 rounded transition-colors ${showNotes ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'} hover:bg-gray-100 dark:hover:bg-gray-700`}>
          <AlignLeft className="w-3 h-3"/>
        </button>
        <div className="flex-1"/>
        <button onClick={() => { setOpen(false); setText(''); }} className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
        <button onClick={submit} disabled={!text.trim()} className="px-3 py-1 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-40">Add task</button>
      </div>
    </motion.div>
  );
}
