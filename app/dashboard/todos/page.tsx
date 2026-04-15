'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Modal from '@/components/Modal'

type Todo = { id: string; title: string; description: string | null; subject: string | null; due_date: string | null; priority: 'low'|'medium'|'high'|null; completed: boolean; status: string; created_at: string }
const SUBJECTS = ['Mathematics','English','Science','Physics','Chemistry','Biology','History','Geography','German','Enterprise Computing','PDHPE','Personal','Other']
const PRIOS = [{ v: 'high', label: 'High', color: '#ef4444' },{ v: 'medium', label: 'Medium', color: '#f59e0b' },{ v: 'low', label: 'Low', color: '#22c55e' }]
const KANBAN_COLS: { key: string; label: string; color: string }[] = [
  { key: 'todo',       label: 'To Do',       color: '#6366f1' },
  { key: 'in_progress',label: 'In Progress', color: '#f59e0b' },
  { key: 'done',       label: 'Done',        color: '#22c55e' },
]

const emptyForm = { title: '', description: '', subject: '', due_date: '', priority: 'medium' as 'low'|'medium'|'high' }

export default function TodosPage() {
  const { user } = useAuth()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list'|'kanban'>('list')
  const [filter, setFilter] = useState<'all'|'today'|'high'|'done'>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [inlineTitle, setInlineTitle] = useState('')
  const [showInline, setShowInline] = useState(false)
  const [dragging, setDragging] = useState<string|null>(null)

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    if (!user) return
    const { data } = await supabase.from('todos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setTodos((data || []).map((t: any) => ({ ...t, status: t.status || (t.completed ? 'done' : 'todo') })))
    setLoading(false)
  }

  const save = async () => {
    if (!user || !form.title.trim()) return
    setSaving(true)
    await supabase.from('todos').insert({ ...form, user_id: user.id, completed: false, status: 'todo' })
    setForm(emptyForm)
    setShowModal(false)
    setSaving(false)
    load()
  }

  const quickAdd = async () => {
    if (!user || !inlineTitle.trim()) return
    await supabase.from('todos').insert({ title: inlineTitle, user_id: user.id, completed: false, priority: 'medium', status: 'todo' })
    setInlineTitle(''); setShowInline(false); load()
  }

  const toggle = async (id: string, current: boolean) => {
    const newStatus = !current ? 'done' : 'todo'
    await supabase.from('todos').update({ completed: !current, status: newStatus }).eq('id', id)
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !current, status: newStatus } : t))
  }

  const del = async (id: string) => {
    await supabase.from('todos').delete().eq('id', id)
    setTodos(todos.filter(t => t.id !== id))
  }

  const moveStatus = async (id: string, status: string) => {
    await supabase.from('todos').update({ status, completed: status === 'done' }).eq('id', id)
    setTodos(todos.map(t => t.id === id ? { ...t, status, completed: status === 'done' } : t))
  }

  const today = new Date().toISOString().split('T')[0]
  const filtered = todos.filter(t => {
    if (filter === 'done')  return t.completed
    if (filter === 'today') return !t.completed && t.due_date === today
    if (filter === 'high')  return !t.completed && t.priority === 'high'
    return !t.completed
  })

  const prioColor = (p: string|null) => p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#22c55e'

  return (
    <div>
      {/* Header */}
      <div className="fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p className="page-eyebrow">Tasks</p>
          <h1 style={{ fontSize: 26, fontWeight: 650, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>To-do</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{todos.filter(t => !t.completed).length} remaining</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(200,210,240,0.5)', borderRadius: 10, padding: 3 }}>
            {(['list','kanban'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 500, transition: 'all 0.18s', background: view === v ? 'white' : 'transparent', color: view === v ? 'var(--accent-deep)' : 'var(--text-muted)', boxShadow: view === v ? '0 1px 6px rgba(80,100,200,0.1)' : 'none' }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button className="glass-button-primary" onClick={() => setShowModal(true)}>+ Add task</button>
        </div>
      </div>

      {/* Filters (list only) */}
      {view === 'list' && (
        <div className="fade-up" style={{ display: 'flex', gap: 7, marginBottom: 18 }}>
          {([{k:'all',l:'All'},{k:'today',l:'Today'},{k:'high',l:'High priority'},{k:'done',l:'Done'}] as const).map(f => (
            <button key={f.k} onClick={() => setFilter(f.k as any)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'Geist, sans-serif', transition: 'all 0.18s', background: filter === f.k ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.6)', borderColor: filter === f.k ? 'rgba(99,102,241,0.3)' : 'rgba(200,210,240,0.5)', color: filter === f.k ? 'var(--accent-deep)' : 'var(--text-secondary)' }}>
              {f.l}
            </button>
          ))}
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div>
          {/* Inline add */}
          <div style={{ marginBottom: 12 }}>
            {showInline ? (
              <div className="glass-card fade-up" style={{ padding: '11px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <input className="glass-input" value={inlineTitle} onChange={e => setInlineTitle(e.target.value)} placeholder="Task name…" autoFocus onKeyDown={e => { if (e.key === 'Enter') quickAdd(); if (e.key === 'Escape') setShowInline(false) }} style={{ flex: 1 }} />
                <button className="glass-button-primary" onClick={quickAdd} style={{ padding: '8px 14px', whiteSpace: 'nowrap', fontSize: 13 }}>Add</button>
                <button className="glass-button" onClick={() => setShowInline(false)} style={{ padding: '8px 12px', fontSize: 13 }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setShowInline(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1.5px dashed rgba(99,102,241,0.22)', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13.5, transition: 'all 0.18s', width: '100%', fontFamily: 'Geist, sans-serif' }}>
                <span style={{ fontSize: 18, color: 'var(--accent)', lineHeight: 1 }}>+</span> Add a task…
              </button>
            )}
          </div>

          {loading
            ? <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
            : filtered.length === 0
              ? <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No tasks here 🎉</div>
              : <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filtered.map((t, i) => (
                    <div key={t.id} className="glass-card fade-up" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, animationDelay: `${i*35}ms` }}>
                      <div className={`custom-checkbox ${t.completed ? 'checked' : ''}`} onClick={() => toggle(t.id, t.completed)} style={{ borderColor: t.priority === 'high' ? 'rgba(239,68,68,0.4)' : undefined }}>
                        {t.completed && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.2 5.8L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: t.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          {t.subject && <span className="subject-tag">{t.subject}</span>}
                          {t.due_date && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(t.due_date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}</span>}
                          {t.description && <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{t.description}</span>}
                        </div>
                      </div>
                      {t.priority && <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: prioColor(t.priority) }} />}
                      <button onClick={() => del(t.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, opacity: 0.5, transition: 'opacity 0.15s', fontSize: 14 }}>✕</button>
                    </div>
                  ))}
                </div>
          }
        </div>
      )}

      {/* KANBAN VIEW */}
      {view === 'kanban' && (
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>
          {KANBAN_COLS.map(col => {
            const colTodos = todos.filter(t => (t.status || (t.completed ? 'done' : 'todo')) === col.key)
            return (
              <div
                key={col.key}
                className="kanban-col"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); if (dragging) moveStatus(dragging, col.key) }}
              >
                {/* Col header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 3, background: col.color }} />
                  <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>{col.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', background: 'rgba(255,255,255,0.6)', padding: '1px 7px', borderRadius: 6 }}>{colTodos.length}</span>
                </div>

                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
                  {colTodos.map((t, i) => (
                    <div
                      key={t.id}
                      className="kanban-card"
                      draggable
                      onDragStart={() => setDragging(t.id)}
                      onDragEnd={() => setDragging(null)}
                      style={{ opacity: dragging === t.id ? 0.5 : 1, animation: `fadeUp 0.3s ease ${i*40}ms both` }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 520, color: 'var(--text-primary)', lineHeight: 1.4, flex: 1 }}>{t.title}</span>
                        <button onClick={() => del(t.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, opacity: 0.4, fontSize: 13, flexShrink: 0 }}>✕</button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        {t.subject && <span className="subject-tag">{t.subject}</span>}
                        {t.priority && <div style={{ width: 6, height: 6, borderRadius: '50%', background: prioColor(t.priority), flexShrink: 0 }} />}
                        {t.due_date && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(t.due_date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {col.key === 'todo' && (
                  <button onClick={() => setShowModal(true)} style={{ marginTop: 10, width: '100%', padding: '8px', border: '1.5px dashed rgba(99,102,241,0.2)', borderRadius: 9, background: 'transparent', cursor: 'pointer', fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'Geist, sans-serif', transition: 'all 0.15s' }}>
                    + Add task
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Task">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 550, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Task name *</label>
            <input className="glass-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="What needs to be done?" autoFocus />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 550, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea className="glass-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Optional details…" rows={2} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 550, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Subject</label>
              <select className="glass-input" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}>
                <option value="">None</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 550, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Due date</label>
              <input className="glass-input" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 550, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Priority</label>
              <select className="glass-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value as any})}>
                {PRIOS.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="glass-button" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="glass-button-primary" onClick={save} disabled={saving || !form.title.trim()}>{saving ? 'Adding…' : 'Add task'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
