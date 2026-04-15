'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Modal from '@/components/Modal'

type Ev = { id: string; title: string; description: string|null; start_time: string; end_time: string|null; color: string|null }
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const COLORS = ['#6366f1','#a78bfa','#34d399','#f59e0b','#ef4444','#ec4899']

export default function CalendarPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Ev[]>([])
  const [cur, setCur] = useState(new Date())
  const [view, setView] = useState<'month'|'week'>('month')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', start_time: '', end_time: '', color: '#6366f1' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!user) return
    const { data } = await supabase.from('calendar_events').select('*').eq('user_id', user.id)
    setEvents(data || [])
  }
  useEffect(() => { if (user) load() }, [user])

  const save = async () => {
    if (!user || !form.title || !form.start_time) return
    setSaving(true)
    await supabase.from('calendar_events').insert({ ...form, user_id: user.id })
    setForm({ title: '', description: '', start_time: '', end_time: '', color: '#6366f1' })
    setShowModal(false); setSaving(false); load()
  }

  const del = async (id: string) => {
    await supabase.from('calendar_events').delete().eq('id', id)
    setEvents(events.filter(e => e.id !== id))
  }

  const openDay = (d: Date) => {
    const iso = d.toISOString().split('T')[0]
    setForm({ ...form, start_time: `${iso}T09:00`, end_time: `${iso}T10:00` })
    setShowModal(true)
  }

  const firstDay = new Date(cur.getFullYear(), cur.getMonth(), 1)
  const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
  const cells: (Date|null)[] = []
  for (let i = 0; i < firstDay.getDay(); i++) cells.push(null)
  for (let i = 1; i <= lastDay.getDate(); i++) cells.push(new Date(cur.getFullYear(), cur.getMonth(), i))

  const today = new Date()
  const isToday = (d: Date) => d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  const dayEvs = (d: Date) => events.filter(e => { const ed = new Date(e.start_time); return ed.getDate() === d.getDate() && ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear() })

  const weekDays = (() => {
    const s = new Date(cur); s.setDate(s.getDate() - s.getDay())
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d })
  })()

  const hours = Array.from({ length: 14 }, (_, i) => i + 7)

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <p className="page-eyebrow">Schedule</p>
            <h1 style={{ fontSize: 26, fontWeight: 650, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{MONTHS[cur.getMonth()]} {cur.getFullYear()}</h1>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button className="glass-button" onClick={() => { const d = new Date(cur); d.setMonth(d.getMonth()-1); setCur(d) }} style={{ padding: '6px 11px' }}>‹</button>
            <button className="glass-button" onClick={() => setCur(new Date())} style={{ padding: '6px 12px', fontSize: 12.5 }}>Today</button>
            <button className="glass-button" onClick={() => { const d = new Date(cur); d.setMonth(d.getMonth()+1); setCur(d) }} style={{ padding: '6px 11px' }}>›</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(200,210,240,0.5)', borderRadius: 10, padding: 3 }}>
            {(['month','week'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 500, transition: 'all 0.18s', background: view === v ? 'white' : 'transparent', color: view === v ? 'var(--accent-deep)' : 'var(--text-muted)', boxShadow: view === v ? '0 1px 6px rgba(80,100,200,0.1)' : 'none' }}>
                {v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>
          <button className="glass-button-primary" onClick={() => { const iso = today.toISOString().split('T')[0]; setForm({...form, start_time:`${iso}T09:00`, end_time:`${iso}T10:00`}); setShowModal(true) }}>+ Add event</button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="glass-card fade-up" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
            {DAYS.map(d => <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 650, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {cells.map((day, i) => {
              const evs = day ? dayEvs(day) : []
              const tod = day && isToday(day)
              return (
                <div key={i} onClick={() => day && openDay(day)} style={{ minHeight: 90, padding: '8px 10px', borderRight: '1px solid rgba(99,102,241,0.05)', borderBottom: '1px solid rgba(99,102,241,0.05)', cursor: day ? 'pointer' : 'default', background: tod ? 'rgba(99,102,241,0.03)' : 'transparent', transition: 'background 0.15s' }}>
                  {day && (
                    <>
                      <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: 12.5, fontWeight: tod ? 650 : 400, color: tod ? 'white' : 'var(--text-primary)', background: tod ? 'var(--accent)' : 'transparent', marginBottom: 4 }}>{day.getDate()}</div>
                      {evs.slice(0,3).map(e => (
                        <div key={e.id} onClick={ev => { ev.stopPropagation(); del(e.id) }} style={{ fontSize: 10.5, fontWeight: 500, padding: '2px 6px', borderRadius: 4, background: (e.color||'#6366f1')+'22', color: e.color||'#6366f1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', marginBottom: 2, transition: 'opacity 0.15s' }} title="Click to delete">{e.title}</div>
                      ))}
                      {evs.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 6 }}>+{evs.length-3}</div>}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="glass-card fade-up" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7,1fr)' }}>
            <div style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }} />
            {weekDays.map(d => (
              <div key={d.toISOString()} style={{ padding: '11px 0', textAlign: 'center', borderBottom: '1px solid rgba(99,102,241,0.08)', borderLeft: '1px solid rgba(99,102,241,0.05)' }}>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{DAYS[d.getDay()]}</div>
                <div style={{ width: 26, height: 26, margin: '3px auto 0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: 13.5, fontWeight: isToday(d) ? 650 : 400, color: isToday(d) ? 'white' : 'var(--text-primary)', background: isToday(d) ? 'var(--accent)' : 'transparent' }}>{d.getDate()}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7,1fr)', maxHeight: 560, overflow: 'auto' }}>
            <div>
              {hours.map(h => <div key={h} style={{ height: 48, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 3, fontSize: 10.5, color: 'var(--text-muted)' }}>{h}:00</div>)}
            </div>
            {weekDays.map(d => {
              const evs = dayEvs(d)
              return (
                <div key={d.toISOString()} onClick={() => openDay(d)} style={{ borderLeft: '1px solid rgba(99,102,241,0.05)', position: 'relative', cursor: 'pointer' }}>
                  {hours.map(h => <div key={h} style={{ height: 48, borderBottom: '1px solid rgba(99,102,241,0.04)' }} />)}
                  {evs.map(e => {
                    const s = new Date(e.start_time)
                    const en = e.end_time ? new Date(e.end_time) : new Date(s.getTime()+3600000)
                    const top = ((s.getHours()+s.getMinutes()/60-7)/14)*100
                    const h = ((en.getTime()-s.getTime())/3600000/14)*100
                    return (
                      <div key={e.id} onClick={ev => { ev.stopPropagation(); del(e.id) }} style={{ position: 'absolute', left: 2, right: 2, top: `${top}%`, height: `${Math.max(h,2.5)}%`, background: (e.color||'#6366f1')+'33', border: `1px solid ${(e.color||'#6366f1')}55`, borderRadius: 6, padding: '2px 6px', fontSize: 10.5, fontWeight: 500, color: e.color||'var(--accent-deep)', overflow: 'hidden', cursor: 'pointer', zIndex: 1 }}>{e.title}</div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Event">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 550, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Title *</label>
            <input className="glass-input" value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Event name" autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 550, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Start *</label>
              <input className="glass-input" type="datetime-local" value={form.start_time} onChange={e => setForm({...form,start_time:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 550, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>End</label>
              <input className="glass-input" type="datetime-local" value={form.end_time} onChange={e => setForm({...form,end_time:e.target.value})} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 550, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Description</label>
            <input className="glass-input" value={form.description||''} onChange={e => setForm({...form,description:e.target.value})} placeholder="Optional" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 550, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Colour</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => <div key={c} onClick={() => setForm({...form,color:c})} style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', outline: form.color===c ? `3px solid ${c}` : 'none', outlineOffset: 2, transition: 'outline 0.15s, transform 0.15s', transform: form.color===c ? 'scale(1.15)' : 'scale(1)' }} />)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="glass-button" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="glass-button-primary" onClick={save} disabled={saving||!form.title||!form.start_time}>{saving?'Saving…':'Add event'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
