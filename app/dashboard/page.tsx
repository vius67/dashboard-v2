'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ hw: 0, hwDone: 0, todos: 0, todosDone: 0, papers: 0, studyMins: 0 })
  const [upcomingHW, setUpcomingHW] = useState<any[]>([])
  const [recentTodos, setRecentTodos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const [hw, todos, papers, sessions] = await Promise.all([
        supabase.from('homework').select('*').eq('user_id', user.id),
        supabase.from('todos').select('*').eq('user_id', user.id),
        supabase.from('past_papers').select('id').eq('user_id', user.id),
        supabase.from('study_sessions').select('duration_minutes').eq('user_id', user.id),
      ])
      const hwData = hw.data || []
      const todosData = todos.data || []
      const studyMins = (sessions.data || []).reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0)
      setStats({ hw: hwData.length, hwDone: hwData.filter((h: any) => h.completed).length, todos: todosData.length, todosDone: todosData.filter((t: any) => t.completed).length, papers: (papers.data || []).length, studyMins })
      setUpcomingHW(hwData.filter((h: any) => !h.completed && h.due_date).sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 5))
      setRecentTodos(todosData.filter((t: any) => !t.completed).slice(0, 5))
      setLoading(false)
    })()
  }, [user])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = user?.email?.split('@')[0] || 'student'

  const cards = [
    { label: 'Homework', value: loading ? '—' : `${stats.hwDone}/${stats.hw}`, sub: 'completed', color: '#6366f1', bg: 'rgba(99,102,241,0.08)', href: '/dashboard/homework' },
    { label: 'To-do', value: loading ? '—' : `${stats.todosDone}/${stats.todos}`, sub: 'done', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', href: '/dashboard/todos' },
    { label: 'Past Papers', value: loading ? '—' : String(stats.papers), sub: 'logged', color: '#34d399', bg: 'rgba(52,211,153,0.08)', href: '/dashboard/past-papers' },
    { label: 'Study Time', value: loading ? '—' : stats.studyMins >= 60 ? `${Math.floor(stats.studyMins/60)}h ${stats.studyMins%60}m` : `${stats.studyMins}m`, sub: 'total', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', href: '/dashboard/timer' },
  ]

  const getDueLabel = (due: string) => {
    const d = new Date(due)
    const today = new Date()
    const diff = Math.ceil((d.getTime() - today.setHours(0,0,0,0)) / 86400000)
    if (diff < 0) return { label: 'Overdue', color: '#ef4444' }
    if (diff === 0) return { label: 'Today', color: '#f59e0b' }
    if (diff === 1) return { label: 'Tomorrow', color: '#f59e0b' }
    return { label: `${diff}d`, color: 'var(--text-muted)' }
  }

  return (
    <div>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <p className="page-eyebrow">Overview</p>
        <h1 style={{ fontSize: 28, fontWeight: 650, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          {greeting}, {name}
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 5, fontWeight: 400 }}>
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {cards.map(card => (
          <Link key={card.label} href={card.href} style={{ textDecoration: 'none' }}>
            <div className="stat-card fade-up" style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.5))` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</span>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: card.color }} />
                </div>
              </div>
              <div style={{ fontSize: 30, fontWeight: 650, color: card.color, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{card.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>{card.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two column section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* Upcoming HW */}
        <div className="glass-card fade-up" style={{ padding: 22, animationDelay: '120ms' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Upcoming Homework</h2>
            <Link href="/dashboard/homework" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500, opacity: 0.8 }}>View all</Link>
          </div>
          {loading ? <Skeleton lines={3} /> :
            upcomingHW.length === 0
              ? <Empty label="All clear! 🎉" />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {upcomingHW.map((hw: any) => {
                    const due = getDueLabel(hw.due_date)
                    return (
                      <div key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'rgba(255,255,255,0.55)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.75)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hw.title}</div>
                          {hw.subject && <span className="subject-tag" style={{ marginTop: 3, display: 'inline-block' }}>{hw.subject}</span>}
                        </div>
                        <span style={{ fontSize: 11.5, color: due.color, fontWeight: 550, flexShrink: 0 }}>{due.label}</span>
                      </div>
                    )
                  })}
                </div>
          }
        </div>

        {/* Open tasks */}
        <div className="glass-card fade-up" style={{ padding: 22, animationDelay: '160ms' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Open Tasks</h2>
            <Link href="/dashboard/todos" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500, opacity: 0.8 }}>View all</Link>
          </div>
          {loading ? <Skeleton lines={3} /> :
            recentTodos.length === 0
              ? <Empty label="Nothing pending 🎉" />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recentTodos.map((t: any) => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'rgba(255,255,255,0.55)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.75)' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#22c55e' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                        {t.subject && <span className="subject-tag" style={{ marginTop: 3, display: 'inline-block' }}>{t.subject}</span>}
                      </div>
                    </div>
                  ))}
                </div>
          }
        </div>
      </div>

      {/* Quick nav tiles */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { href: '/dashboard/timer',       label: 'Study Timer',   sub: 'Start a session',     color: '#6366f1' },
          { href: '/dashboard/past-papers', label: 'Past Papers',   sub: 'Log a paper',         color: '#34d399' },
          { href: '/dashboard/calendar',    label: 'Calendar',      sub: 'View your schedule',  color: '#f59e0b' },
          { href: '/dashboard/notes',       label: 'Notes',         sub: 'Open notebook',       color: '#a78bfa' },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div className="glass-card fade-up" style={{ padding: '16px 18px', cursor: 'pointer' }}>
              <div style={{ width: 8, height: 8, borderRadius: 3, background: item.color, marginBottom: 10 }} />
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{item.sub}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function Skeleton({ lines }: { lines: number }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} style={{ height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.06)', animation: 'pulse-dot 1.8s ease infinite', animationDelay: `${i*120}ms` }} />
    ))}
  </div>
}
function Empty({ label }: { label: string }) {
  return <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{label}</div>
}
