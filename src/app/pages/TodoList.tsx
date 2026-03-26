import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { CheckCircle2, Circle, Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { todoService } from '../../lib/db';
import { TodoItem } from '../types';
import confetti from 'canvas-confetti';

export default function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await todoService.getAll();
      setTodos(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load todos');
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async () => {
    if (!newTodoText.trim()) return;
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      text: newTodoText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    try {
      await todoService.add(newTodo);
      setTodos(prev => [...prev, newTodo]);
      setNewTodoText('');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to add todo');
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const completed = !todo.completed;
    try {
      await todoService.toggle(id, completed);
      setTodos(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
      if (completed) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 }, colors: ['#8B5CF6', '#3B82F6', '#10B981'] });
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update todo');
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await todoService.delete(id);
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete todo');
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const stats = {
    total: todos.length,
    active: todos.filter(t => !t.completed).length,
    completed: todos.filter(t => t.completed).length,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-6 md:p-8 lg:p-12"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-light mb-2 text-gray-900 dark:text-white">To-Do List</h1>
          <p className="text-gray-500 dark:text-gray-400">Organize your tasks and stay productive</p>
        </motion.div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total" value={stats.total} delay={0.1} />
          <StatCard label="Active" value={stats.active} delay={0.15} />
          <StatCard label="Done" value={stats.completed} delay={0.2} />
        </div>

        {/* Add Todo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
              placeholder="Add a new task..."
              className="flex-1 px-6 py-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all"
            />
            <motion.button
              onClick={addTodo}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-4 rounded-2xl bg-purple-500 hover:bg-purple-600 text-white font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-2"
        >
          {(['all', 'active', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                filter === status
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-3">
            <Reorder.Group
              axis="y"
              values={filteredTodos}
              onReorder={(newOrder) => { if (filter === 'all') setTodos(newOrder); }}
              className="space-y-3"
            >
              <AnimatePresence mode="popLayout">
                {filteredTodos.map((todo, index) => (
                  <TodoCard key={todo.id} todo={todo} index={index} onToggle={toggleTodo} onDelete={deleteTodo} canReorder={filter === 'all'} />
                ))}
              </AnimatePresence>
            </Reorder.Group>

            {filteredTodos.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-3xl p-12 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 text-center"
              >
                <Circle className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-2">No tasks found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {filter === 'all' ? 'Add a task to get started' : filter === 'active' ? 'No active tasks' : 'No completed tasks'}
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center"
    >
      <div className="text-3xl font-light text-gray-900 dark:text-white mb-1">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    </motion.div>
  );
}

function TodoCard({ todo, index, onToggle, onDelete, canReorder }: {
  todo: TodoItem; index: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  canReorder: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const cardContent = (
    <>
      <motion.div className="flex items-center gap-4 flex-1 min-w-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {canReorder && (
          <motion.div className="cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-600" whileHover={{ scale: 1.2 }}>
            <GripVertical className="w-5 h-5" />
          </motion.div>
        )}
        <motion.button
          onClick={() => onToggle(todo.id)}
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          className={`flex-shrink-0 ${todo.completed ? 'text-green-500' : 'text-gray-400 dark:text-gray-600'}`}
        >
          {todo.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
        </motion.button>
        <span className={`flex-1 text-left transition-all ${todo.completed ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>
          {todo.text}
        </span>
      </motion.div>
      <AnimatePresence>
        {isHovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => onDelete(todo.id)}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );

  const commonProps = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { delay: index * 0.05, duration: 0.3 },
    onHoverStart: () => setIsHovered(true),
    onHoverEnd: () => setIsHovered(false),
    className: "flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
    whileHover: { scale: 1.01, y: -2 } as any,
  };

  if (canReorder) {
    return (
      <Reorder.Item value={todo} {...commonProps} style={{ cursor: 'pointer' }}>
        {cardContent}
      </Reorder.Item>
    );
  }
  return <motion.div {...commonProps}>{cardContent}</motion.div>;
}
