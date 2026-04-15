'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

type Note = { id: string; title: string; content: string; subject: string | null; created_at: string; updated_at: string }
const SUBJECTS = ['Mathematics','English','Science','Physics','Chemistry','Biology','History','Geography','German','Enterprise Computing','PDHPE','Personal','Other']

export default function NotesPage() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [selected, setSelected] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const saveRef = useRef<NodeJS.Timeout | null>(null)
  const selectedRef = useRef<Note | null>(null)

  useEffect(() => { selectedRef.current = selected }, [selected])

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    if (!user) return
    const { data, error } = await supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
    if (!error) setNotes(data || [])
    setLoading(false)
  }

  const createNote = async () => {
    if (!user) return
    const { data, error } = await supabase.from('notes')
      .insert({ title: 'Untitled', content: '', user_id: user.id })
      .select().single()
    if (!error && data) {
      setNotes(prev => [data, ...prev])
      openNote(data)
    }
  }

  const openNote = (note: Note) => {
    if (saveRef.current) clearTimeout(saveRef.current)
    setSelected(note)
    setEditTitle(note.title)
    setEditContent(note.content || '')
    setEditSubject(note.subject || '')
  }

  const triggerSave = (title: string, content: string, subject: string) => {
    if (saveRef.current) clearTimeout(saveRef.current)
    saveRef.current = setTimeout(async () => {
      const cur = selectedRef.current
      if (!cur) return
      setSaving(true)
      const now = new Date().toISOString()
      const { error } = await supabase.from('notes')
        .update({ title: title || 'Untitled', content, subject: subject || null, updated_at: now })
        .eq('id', cur.id)
      if (!error) {
        setNotes(prev => prev.map(n => n.id === cur.id ? { ...n, title: title || 'Untitled', content, subject: subject || null, updated_at: now } : n))
      }
      setSaving(false)
    }, 700)
  }

  const handleTitleChange = (v: string) => { setEditTitle(v); triggerSave(v, editContent, editSubject) }
  const handleContentChange = (v: string) => { setEditContent(v); triggerSave(editTitle, v, editSubject) }
  const handleSubjectChange = (v: string) => { setEditSubject(v); triggerSave(editTitle, editContent, v) }

  const deleteNote = async (id: string) => {
    await supabase.from('notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
    if (selected?.id === id) { setSelected(null); setEditTitle(''); setEditContent(''); setEditSubject('') }
  }

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.content || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 20 }}>
        <p className="page-eyebrow">Workspace</p>
        <h1 style={{ fontSize: 26, fontWeight: 650, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Notes</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '256px 1fr', gap: 0, height: 'calc(100vh - 160px)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.82)', boxShadow: '0 4px 24px rgba(80,100,200,0.07)' }}>
        {/* Sidebar */}
        <div style={{ background: 'rgba(248,250,255,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRight: '1px solid rgba(99,102,241,0.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid rgba(99,102,241,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Notes</span>
              <button onClick={createNote} style={{ width: 26, height: 26, border: 'none', background: 'rgba(99,102,241,0.12)', borderRadius: 7, cursor: 'pointer', color: 'var(--accent-deep)', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300, transition: 'all 0.18s' }}>+</button>
            </div>
            <input className="glass-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ fontSize: 13, padding: '7px 10px' }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
            {loading
              ? <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
              : filtered.length === 0
                ? <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{search ? 'No results' : 'No notes yet'}</div>
                : filtered.map((n, i) => (
                  <div key={n.id} onClick={() => openNote(n)} style={{
                    padding: '10px 11px', borderRadius: 10, cursor: 'pointer', marginBottom: 3,
                    background: selected?.id === n.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                    border: `1px solid ${selected?.id === n.id ? 'rgba(99,102,241,0.18)' : 'transparent'}`,
                    transition: 'all 0.15s',
                    animation: `fadeUp 0.3s ease ${i*30}ms both`,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 530, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title || 'Untitled'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      {n.subject && <span className="subject-tag" style={{ fontSize: 10 }}>{n.subject}</span>}
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(n.updated_at).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    {n.content && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>{n.content.slice(0, 55)}</div>}
                  </div>
                ))
            }
          </div>

          <div style={{ padding: '10px 10px 14px', borderTop: '1px solid rgba(99,102,241,0.07)' }}>
            <button onClick={createNote} className="glass-button" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}>
              + New note
            </button>
          </div>
        </div>

        {/* Editor */}
        {selected ? (
          <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <div style={{ padding: '13px 24px', borderBottom: '1px solid rgba(99,102,241,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <select className="glass-input" value={editSubject} onChange={e => handleSubjectChange(e.target.value)} style={{ width: 160, padding: '5px 10px', fontSize: 12.5 }}>
                <option value="">No subject</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11.5, color: saving ? 'var(--accent-mid)' : 'var(--text-muted)', transition: 'color 0.3s' }}>
                  {saving ? 'Saving…' : 'Saved'}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {new Date(selected.updated_at).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <button onClick={() => deleteNote(selected.id)} style={{ border: 'none', background: 'rgba(239,68,68,0.07)', color: '#ef4444', cursor: 'pointer', borderRadius: 8, padding: '5px 11px', fontSize: 12.5, fontFamily: 'Geist, sans-serif', fontWeight: 500, transition: 'all 0.15s' }}>Delete</button>
              </div>
            </div>

            {/* Title */}
            <input
              value={editTitle}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Untitled"
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 24, fontWeight: 650, color: 'var(--text-primary)', fontFamily: 'Geist, sans-serif', padding: '26px 30px 8px', letterSpacing: '-0.025em', flexShrink: 0 }}
            />

            {/* Content */}
            <textarea
              value={editContent}
              onChange={e => handleContentChange(e.target.value)}
              placeholder="Start writing…"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14.5, color: 'var(--text-secondary)', fontFamily: 'Geist, sans-serif', padding: '4px 30px 30px', resize: 'none', lineHeight: 1.75 }}
            />
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="var(--accent-mid)" strokeWidth="1.5" strokeLinecap="round"><path d="M5 3h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M7 7h6M7 10h6M7 13h4"/></svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>Select a note</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 3 }}>or create a new one to get started</p>
            </div>
            <button className="glass-button-primary" onClick={createNote}>+ New note</button>
          </div>
        )}
      </div>
    </div>
  )
}
