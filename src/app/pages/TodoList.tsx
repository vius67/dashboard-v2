import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Loader2, ChevronDown, ChevronRight,
  Flag, Calendar, Layout, List, MoreHorizontal, X, Check,
  Inbox, Tag, AlignLeft, GripVertical, Pencil,
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

// Section colours for board columns
const SECTION_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#f97316',
];

const SECTIONS_KEY = 'todo-board-sections-v2';

function genId() { return `todo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }
function genSectionId() { return `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

function fmtDate(d: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dt = new Date(d + 'T00:00:00');
  if (dt.getTime() === today.getTime()) return 'Today';
  if (dt.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function isOverdue(d: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(d + 'T00:00:00') < today;
}

interface Section {
  id: string;
  name: string;
  color: string;
}

export default function TodoList() {
  const { darkMode } = useApp();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'today' | 'board' | 'all'>('today');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overdueClosed, setOverdueClosed] = useState(false);

  // ── Sections stored in localStorage (they're UI state, not DB) ──
  const [sections, setSections] = useState<Section[]>(() => {
    try {
      const stored = localStorage.getItem(SECTIONS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'inbox', name: 'Inbox', color: '#10b981' },
      { id: 'in-progress', name: 'In Progress', color: '#3b82f6' },
      { id: 'done-sec', name: 'Done', color: '#8b5cf6' },
    ];
  });

  // Persist sections whenever they change
  useEffect(() => {
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
  }, [sections]);

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
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.6 }, colors: ['#10B981', '#3B82F6', '#8B5CF6'] });
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
    try {
      await todoService.update(updated);
      setTodos(prev => prev.map(t => t.id === updated.id ? updated : t));
    }
    catch (e: any) { setError(e.message); }
  };

  // ── Section management ──
  const addSection = (name: string) => {
    const colorIdx = sections.length % SECTION_COLORS.length;
    setSections(prev => [...prev, { id: genSectionId(), name, color: SECTION_COLORS[colorIdx] }]);
  };

  const renameSection = (id: string, name: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, name } : s));
    // Also rename any todos pointing to old name
    const old = sections.find(s => s.id === id);
    if (old) {
      setTodos(prev => prev.map(t => t.project === old.name ? { ...t, project: name } : t));
    }
  };

  const deleteSection = (id: string) => {
    const sec = sections.find(s => s.id === id);
    if (!sec) return;
    // Move its todos to Inbox
    setTodos(prev => prev.map(t => t.project === sec.name ? { ...t, project: undefined } : t));
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const totalActive = todos.filter(t => !t.completed).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 md:px-8 lg:px-12 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Tasks</h1>
            {totalActive > 0 && (
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                {totalActive}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800/80">
            {([
              ['today', 'Today', <List className="w-3.5 h-3.5" />],
              ['board', 'Board', <Layout className="w-3.5 h-3.5" />],
              ['all', 'All', <Inbox className="w-3.5 h-3.5" />],
            ] as const).map(([v, label, icon]) => (
              <button key={v} onClick={() => setView(v as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view === v
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
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
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {view === 'today' && (
              <TodayView todos={todos} overdueClosed={overdueClosed} setOverdueClosed={setOverdueClosed}
                editingId={editingId} setEditingId={setEditingId}
                onToggle={toggle} onDelete={remove} onUpdate={updateTodo} onAdd={addTodo} darkMode={darkMode} />
            )}
            {view === 'board' && (
              <BoardView todos={todos} sections={sections}
                editingId={editingId} setEditingId={setEditingId}
                onToggle={toggle} onDelete={remove} onUpdate={updateTodo} onAdd={addTodo}
                onAddSection={addSection} onRenameSection={renameSection} onDeleteSection={deleteSection}
                darkMode={darkMode} />
            )}
            {view === 'all' && (
              <AllView todos={todos} editingId={editingId} setEditingId={setEditingId}
                onToggle={toggle} onDelete={remove} onUpdate={updateTodo} onAdd={addTodo} darkMode={darkMode} />
            )}
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
            {overdueClosed
              ? <ChevronRight className="w-3.5 h-3.5 text-red-400" />
              : <ChevronDown className="w-3.5 h-3.5 text-red-400" />}
            <span className="text-xs font-semibold uppercase tracking-wider text-red-500">Overdue</span>
            <div className="flex-1 h-px bg-red-200 dark:bg-red-900/40 ml-1" />
          </button>
          <AnimatePresence>
            {!overdueClosed && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                {overdue.map((t: TodoItem) => (
                  <TaskRow key={t.id} todo={t} editing={editingId === t.id}
                    onStartEdit={() => setEditingId(t.id)} onEndEdit={() => setEditingId(null)}
                    onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} darkMode={darkMode} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} · Today
          </span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700/60" />
        </div>
        {todayTasks.map((t: TodoItem) => (
          <TaskRow key={t.id} todo={t} editing={editingId === t.id}
            onStartEdit={() => setEditingId(t.id)} onEndEdit={() => setEditingId(null)}
            onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} darkMode={darkMode} />
        ))}
        {noDateTasks.map((t: TodoItem) => (
          <TaskRow key={t.id} todo={t} editing={editingId === t.id}
            onStartEdit={() => setEditingId(t.id)} onEndEdit={() => setEditingId(null)}
            onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} darkMode={darkMode} />
        ))}
        <AddTaskInline onAdd={(text: string, opts: any) => onAdd({ text, dueDate: today, ...opts })} darkMode={darkMode} />
      </div>
    </div>
  );
}

// ── BOARD VIEW ─────────────────────────────────────────────────────────
function BoardView({
  todos, sections, editingId, setEditingId, onToggle, onDelete, onUpdate, onAdd,
  onAddSection, onRenameSection, onDeleteSection, darkMode,
}: {
  todos: TodoItem[]; sections: Section[];
  editingId: string | null; setEditingId: (id: string | null) => void;
  onToggle: (id: string) => void; onDelete: (id: string) => void;
  onUpdate: (t: TodoItem) => void; onAdd: (p: Partial<TodoItem> & { text: string }) => void;
  onAddSection: (name: string) => void; onRenameSection: (id: string, name: string) => void;
  onDeleteSection: (id: string) => void; darkMode: boolean;
}) {
  const [newSectionName, setNewSectionName] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (addingSection) inputRef.current?.focus(); }, [addingSection]);

  const submitSection = () => {
    if (!newSectionName.trim()) { setAddingSection(false); return; }
    onAddSection(newSectionName.trim());
    setNewSectionName('');
    setAddingSection(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-light text-gray-900 dark:text-white">Board</h2>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setAddingSection(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            darkMode ? 'text-gray-400 hover:bg-white/8 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}>
          <Plus className="w-3.5 h-3.5" /> Add section
        </motion.button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6" style={{ scrollSnapType: 'x mandatory' }}>
        {sections.map((section) => {
          const sectionTodos = todos
            .filter(t => !t.completed && (
              section.id === 'inbox' ? !t.project || t.project === 'Inbox'
              : t.project === section.name
            ))
            .sort((a, b) => (a.priority ?? 4) - (b.priority ?? 4));

          return (
            <KanbanColumn
              key={section.id}
              section={section}
              todos={sectionTodos}
              editingId={editingId}
              setEditingId={setEditingId}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onAdd={(text, opts) => onAdd({
                text,
                project: section.id === 'inbox' ? undefined : section.name,
                ...opts,
              })}
              onRename={(name) => onRenameSection(section.id, name)}
              onDeleteSection={() => onDeleteSection(section.id)}
              canDelete={sections.length > 1}
              darkMode={darkMode}
            />
          );
        })}

        {/* Add section inline input */}
        <AnimatePresence>
          {addingSection && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              style={{ scrollSnapAlign: 'start' }}
              className="flex-shrink-0 w-72"
            >
              <div className={`rounded-2xl border p-4 ${darkMode ? 'bg-gray-800/60 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                <input
                  ref={inputRef}
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitSection();
                    if (e.key === 'Escape') { setAddingSection(false); setNewSectionName(''); }
                  }}
                  placeholder="Section name…"
                  className={`w-full text-sm font-medium bg-transparent border-none outline-none mb-3 ${darkMode ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                />
                <div className="flex gap-2">
                  <button onClick={submitSection}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors">
                    Add section
                  </button>
                  <button onClick={() => { setAddingSection(false); setNewSectionName(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${darkMode ? 'text-gray-500 hover:bg-white/8' : 'text-gray-400 hover:bg-gray-100'}`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── KANBAN COLUMN ──────────────────────────────────────────────────────
function KanbanColumn({ section, todos, editingId, setEditingId, onToggle, onDelete, onUpdate, onAdd, onRename, onDeleteSection, canDelete, darkMode }: {
  section: Section; todos: TodoItem[];
  editingId: string | null; setEditingId: (id: string | null) => void;
  onToggle: (id: string) => void; onDelete: (id: string) => void;
  onUpdate: (t: TodoItem) => void; onAdd: (text: string, opts?: Partial<TodoItem>) => void;
  onRename: (name: string) => void; onDeleteSection: () => void;
  canDelete: boolean; darkMode: boolean;
}) {
  const [renamingSection, setRenamingSection] = useState(false);
  const [renameVal, setRenameVal] = useState(section.name);
  const [showMenu, setShowMenu] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (renamingSection) renameRef.current?.focus(); }, [renamingSection]);

  const submitRename = () => {
    if (renameVal.trim() && renameVal.trim() !== section.name) {
      onRename(renameVal.trim());
    }
    setRenamingSection(false);
    setRenameVal(section.name);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ scrollSnapAlign: 'start' }}
      className="flex-shrink-0 w-72"
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 group">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Colour dot */}
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: section.color }} />

          {renamingSection ? (
            <input
              ref={renameRef}
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onBlur={submitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') submitRename();
                if (e.key === 'Escape') { setRenamingSection(false); setRenameVal(section.name); }
              }}
              className={`flex-1 text-sm font-semibold bg-transparent border-b outline-none ${darkMode ? 'text-white border-white/20' : 'text-gray-900 border-gray-300'}`}
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{section.name}</span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{todos.length}</span>
        </div>

        {/* Column menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className={`p-1 rounded transition-all opacity-0 group-hover:opacity-100 ${darkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}>
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className={`absolute right-0 top-7 z-20 rounded-xl border shadow-lg overflow-hidden min-w-[140px] ${darkMode ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}
                onMouseLeave={() => setShowMenu(false)}
              >
                <button
                  onClick={() => { setRenamingSection(true); setShowMenu(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${darkMode ? 'text-gray-300 hover:bg-white/8' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <Pencil className="w-3.5 h-3.5" /> Rename
                </button>
                {canDelete && (
                  <button
                    onClick={() => { onDeleteSection(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-red-500 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete section
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        <AnimatePresence>
          {todos.map(t => (
            <KanbanCard key={t.id} todo={t} editing={editingId === t.id}
              onStartEdit={() => setEditingId(t.id)} onEndEdit={() => setEditingId(null)}
              onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} darkMode={darkMode} />
          ))}
        </AnimatePresence>
      </div>

      <AddTaskInline onAdd={onAdd} darkMode={darkMode} compact />
    </motion.div>
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
        <Inbox className="w-5 h-5 text-gray-400" />
        <h2 className="text-2xl font-light text-gray-900 dark:text-white">All Tasks</h2>
      </div>
      <div>
        {active.map((t: TodoItem) => (
          <TaskRow key={t.id} todo={t} editing={editingId === t.id}
            onStartEdit={() => setEditingId(t.id)} onEndEdit={() => setEditingId(null)}
            onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} darkMode={darkMode} showProject />
        ))}
        {active.length === 0 && (
          <div className="text-center py-16">
            <Check className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-600">All done!</p>
          </div>
        )}
      </div>
      <AddTaskInline onAdd={onAdd} darkMode={darkMode} />
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
    <TaskEditRow todo={todo}
      onSave={(updated: TodoItem) => { onUpdate(updated); onEndEdit(); }}
      onCancel={onEndEdit}
      onDelete={() => { onDelete(todo.id); onEndEdit(); }}
      darkMode={darkMode} />
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
          {completing && <Check className="w-2.5 h-2.5 text-white" />}
        </motion.div>
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white leading-snug">{todo.text}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {todo.dueDate && (
            <span className={`text-xs flex items-center gap-0.5 ${overdue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
              <Calendar className="w-3 h-3" />{fmtDate(todo.dueDate)}
            </span>
          )}
          {showProject && todo.project && (
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
              <Tag className="w-3 h-3" />{todo.project}
            </span>
          )}
          {todo.notes && <AlignLeft className="w-3 h-3 text-gray-400 dark:text-gray-600" />}
        </div>
      </div>
      <AnimatePresence>
        {hovered && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { e.stopPropagation(); onDelete(todo.id); }}
            className="flex-shrink-0 p-1 rounded text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
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
    <TaskEditRow todo={todo}
      onSave={(updated: TodoItem) => { onUpdate(updated); onEndEdit(); }}
      onCancel={onEndEdit}
      onDelete={() => { onDelete(todo.id); onEndEdit(); }}
      darkMode={darkMode} />
  );

  const overdue = todo.dueDate && isOverdue(todo.dueDate);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: completing ? 0 : 1, scale: completing ? 0.95 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.2 }}
      onClick={onStartEdit}
      className={`p-3 rounded-xl border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-sm ${
        darkMode ? 'bg-gray-800/80 border-gray-700/60 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
      }`}>
      <div className="flex items-start gap-2 mb-1.5">
        <button onClick={handleToggle} className="flex-shrink-0 mt-0.5">
          <div className="w-4 h-4 rounded-full border-2 transition-all"
            style={{ borderColor: PRIORITY_FLAG_COLOR[todo.priority ?? 4] }} />
        </button>
        <p className="flex-1 text-sm text-gray-900 dark:text-white leading-snug">{todo.text}</p>
      </div>
      {(todo.dueDate || todo.notes || (todo.priority && todo.priority < 4)) && (
        <div className="flex items-center gap-2 pl-6 flex-wrap">
          {todo.dueDate && (
            <span className={`text-xs flex items-center gap-0.5 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
              <Calendar className="w-3 h-3" />{fmtDate(todo.dueDate)}
            </span>
          )}
          {todo.priority && todo.priority < 4 && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_BG[todo.priority]} ${PRIORITY_COLOR[todo.priority]}`}>
              {PRIORITY_LABEL[todo.priority]}
            </span>
          )}
          {todo.notes && <AlignLeft className="w-3 h-3 text-gray-400" />}
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
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(todo.priority ?? 4);
  const [dueDate, setDueDate] = useState(todo.dueDate ?? '');
  const [notes, setNotes] = useState(todo.notes ?? '');
  const [showNotes, setShowNotes] = useState(!!todo.notes);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const save = () => {
    if (!text.trim()) return;
    onSave({ ...todo, text: text.trim(), priority, dueDate: dueDate || undefined, notes: notes.trim() || undefined });
  };

  const inp = darkMode
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';

  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-3 mb-1 ${darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
      <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel(); }}
        className="w-full text-sm bg-transparent border-none outline-none text-gray-900 dark:text-white mb-2" />
      {showNotes && (
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes…"
          className="w-full text-xs bg-transparent border-none outline-none resize-none text-gray-500 dark:text-gray-400 placeholder-gray-400 mb-2" />
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
          className={`text-xs px-2 py-1 rounded-lg border focus:outline-none ${inp}`} />
        <div className="flex items-center gap-0.5">
          {([1, 2, 3, 4] as const).map(p => (
            <button key={p} onClick={() => setPriority(p)}
              className={`w-6 h-6 rounded flex items-center justify-center transition-all ${priority === p ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <Flag className={`w-3.5 h-3.5 ${PRIORITY_COLOR[p]}`} style={{ fill: priority === p ? PRIORITY_FLAG_COLOR[p] : 'none' }} />
            </button>
          ))}
        </div>
        <button onClick={() => setShowNotes(p => !p)}
          className={`p-1 rounded transition-colors ${showNotes ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'} hover:bg-gray-100 dark:hover:bg-gray-700`}>
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1" />
        <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        <button onClick={onCancel} className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
        <button onClick={save} disabled={!text.trim()} className="px-3 py-1 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-40">Save</button>
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
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4);
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

  const inp = darkMode
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 w-full mt-2 px-2 py-2 rounded-lg text-sm text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
      <Plus className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-emerald-400 group-hover:text-emerald-500`} />
      <span className={compact ? 'text-xs' : 'text-sm'}>Add task</span>
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className={`mt-2 rounded-xl border p-3 ${darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
      <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setOpen(false); setText(''); } }}
        placeholder="Task name"
        className="w-full text-sm bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 mb-2" />
      {showNotes && (
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes…"
          className="w-full text-xs bg-transparent border-none outline-none resize-none text-gray-500 dark:text-gray-400 placeholder-gray-400 mb-2" />
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
          className={`text-xs px-2 py-1 rounded-lg border focus:outline-none ${inp}`} />
        <div className="flex items-center gap-0.5">
          {([1, 2, 3, 4] as const).map(p => (
            <button key={p} onClick={() => setPriority(p)}
              className={`w-6 h-6 rounded flex items-center justify-center transition-all ${priority === p ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <Flag className={`w-3 h-3 ${PRIORITY_COLOR[p]}`} style={{ fill: priority === p ? PRIORITY_FLAG_COLOR[p] : 'none' }} />
            </button>
          ))}
        </div>
        <button onClick={() => setShowNotes(p => !p)}
          className={`p-1 rounded transition-colors ${showNotes ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'} hover:bg-gray-100 dark:hover:bg-gray-700`}>
          <AlignLeft className="w-3 h-3" />
        </button>
        <div className="flex-1" />
        <button onClick={() => { setOpen(false); setText(''); }}
          className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
        <button onClick={submit} disabled={!text.trim()}
          className="px-3 py-1 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-40">Add task</button>
      </div>
    </motion.div>
  );
}
