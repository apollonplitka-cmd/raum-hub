'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SYSTEM = `Ты — AI-ассистент для Данила, предпринимателя из Кемерово. У него два бизнеса:
1. РАУМ — производство бамбуковых стеновых панелей (60×15 см). Продают через Авито, Telegram, оптовых партнёров. Используют CRM и 1С.
2. Аполлон — тротуарная плитка и брусчатка. Активно работает, нужен рост.
Цель Данила — трансформировать оба бизнеса с помощью AI-агентов. Пиши на русском языке. Давай конкретные шаблоны, скрипты, инструкции.`

type Task = {
  id: string
  project: string
  phase: string
  label: string
  completed: boolean
  created_at: string
}


const PHASES: Record<string, { project: string; phase: string; name: string; status: 'done' | 'current' | 'upcoming'; defaultTasks: { label: string; completed: boolean }[] }[]> = {
  raum: [
    {
      project: 'raum', phase: 'f1', name: 'Фаза 1 — Фундамент и запуск', status: 'done',
      defaultTasks: [
        { label: 'Продажи через Авито и Telegram запущены', completed: true },
        { label: 'CRM система и 1С подключены', completed: true },
        { label: 'Продуктовая линейка: панели 60×15 см', completed: true },
      ]
    },
    {
      project: 'raum', phase: 'f2', name: 'Фаза 2 — AI-агенты: первые роли', status: 'current',
      defaultTasks: [
        { label: 'AI-академия и план обучения', completed: true },
        { label: 'Агент ответов на входящие (Авито, Telegram)', completed: false },
        { label: 'Агент расчёта стоимости заказа', completed: false },
        { label: 'Автоматический сбор лидов из Telegram', completed: false },
      ]
    },
    {
      project: 'raum', phase: 'f3', name: 'Фаза 3 — Маркетинг и контент', status: 'upcoming',
      defaultTasks: [
        { label: 'AI-контент: объявления и описания для Авито', completed: false },
        { label: 'Автопостинг в Telegram-канал', completed: false },
        { label: 'SEO-оптимизация объявлений', completed: false },
      ]
    },
    {
      project: 'raum', phase: 'f4', name: 'Фаза 4 — Масштабирование', status: 'upcoming',
      defaultTasks: [
        { label: 'Оптовые партнёры — автоматизация переговоров', completed: false },
        { label: 'Выход на Wildberries / Ozon', completed: false },
        { label: 'Дашборд финансов и KPI', completed: false },
      ]
    },
  ],
  apollo: [
    {
      project: 'apollo', phase: 'f1', name: 'Фаза 1 — Систематизация продаж', status: 'current',
      defaultTasks: [
        { label: 'Описать все позиции и прайс-лист', completed: false },
        { label: 'Настроить CRM для тротуарной плитки', completed: false },
        { label: 'Запустить объявления на Авито', completed: false },
      ]
    },
    {
      project: 'apollo', phase: 'f2', name: 'Фаза 2 — AI-агент продаж', status: 'upcoming',
      defaultTasks: [
        { label: 'Агент-консультант по видам плитки и брусчатки', completed: false },
        { label: 'Калькулятор количества и стоимости укладки', completed: false },
        { label: 'Автоответы на частые вопросы', completed: false },
      ]
    },
    {
      project: 'apollo', phase: 'f3', name: 'Фаза 3 — Маркетинг и партнёры', status: 'upcoming',
      defaultTasks: [
        { label: 'B2B-предложения для строительных компаний', completed: false },
        { label: 'Контент: портфолио укладок, кейсы', completed: false },
        { label: 'Партнёрства с ландшафтными дизайнерами', completed: false },
      ]
    },
  ]
}

function getDefaultTaskKey(project: string, phase: string, label: string) {
  return `default:${project}:${phase}:${label}`
}

export default function HubApp({ initialTasks, userEmail }: { initialTasks: Task[], userEmail: string }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [page, setPage] = useState<'overview' | 'roadmap' | 'automate' | 'aichat'>('overview')
  const [proj, setProj] = useState<'raum' | 'apollo'>('raum')
  const [addInputs, setAddInputs] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Привет, Данил! Я твой AI-помощник по трансформации РАУМ и Аполлон. Спроси меня что угодно — как запустить агента, с чего начать автоматизацию, как написать скрипт продаж или построить систему. Я здесь чтобы двигаться вперёд вместе с тобой 🚀' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([])
  const router = useRouter()

  // Merge default tasks with DB tasks
  function getTasksForPhase(project: string, phase: string): Task[] {
    const dbTasks = tasks.filter(t => t.project === project && t.phase === phase)
    if (dbTasks.length > 0) return dbTasks

    const phaseData = PHASES[project]?.find(p => p.phase === phase)
    if (!phaseData) return []
    return phaseData.defaultTasks.map((t, i) => ({
      id: getDefaultTaskKey(project, phase, t.label),
      project, phase, label: t.label, completed: t.completed,
      created_at: new Date(Date.now() - (1000 - i)).toISOString()
    }))
  }

  async function toggleTask(task: Task) {
    if (task.id.startsWith('default:')) {
      // Persist default task to DB first
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: task.project, phase: task.phase, label: task.label })
      })
      const newTask: Task = await res.json()
      // Now patch it
      const res2 = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newTask.id, completed: !task.completed, label: task.label })
      })
      const updated: Task = await res2.json()
      // Replace all defaults for this phase with DB tasks
      const phaseData = PHASES[task.project]?.find(p => p.phase === task.phase)
      if (phaseData) {
        const otherDefaults = phaseData.defaultTasks
          .filter(d => d.label !== task.label)
          .map((d, i) => ({
            id: getDefaultTaskKey(task.project, task.phase, d.label),
            project: task.project, phase: task.phase, label: d.label,
            completed: d.completed, created_at: new Date(Date.now() - (100 - i)).toISOString()
          }))
        setTasks(prev => [...prev.filter(t => t.project !== task.project || t.phase !== task.phase), ...otherDefaults, updated])
      }
      return
    }
    const res = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, completed: !task.completed, label: task.label })
    })
    const updated: Task = await res.json()
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
  }

  async function addTask(project: string, phase: string) {
    const key = `${project}-${phase}`
    const label = (addInputs[key] || '').trim()
    if (!label) return
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, phase, label })
    })
    const newTask: Task = await res.json()
    // If this phase was showing defaults, need to persist all defaults first
    const dbTasksForPhase = tasks.filter(t => t.project === project && t.phase === phase)
    if (dbTasksForPhase.length === 0) {
      const phaseData = PHASES[project]?.find(p => p.phase === phase)
      if (phaseData) {
        const persisted: Task[] = []
        for (const d of phaseData.defaultTasks) {
          const r = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project, phase, label: d.label })
          })
          const pt: Task = await r.json()
          if (d.completed) {
            await fetch('/api/tasks', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: pt.id, completed: true, label: pt.label })
            })
            persisted.push({ ...pt, completed: true })
          } else {
            persisted.push(pt)
          }
        }
        setTasks(prev => [...prev.filter(t => t.project !== project || t.phase !== phase), ...persisted, newTask])
      }
    } else {
      setTasks(prev => [...prev, newTask])
    }
    setAddInputs(prev => ({ ...prev, [key]: '' }))
  }

  async function deleteTask(task: Task) {
    if (task.id.startsWith('default:')) return
    await fetch('/api/tasks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id })
    })
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  async function saveEdit(task: Task) {
    if (task.id.startsWith('default:')) {
      setEditingId(null)
      return
    }
    const res = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, completed: task.completed, label: editValue })
    })
    const updated: Task = await res.json()
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    setEditingId(null)
  }

  function getProgress(project: string, phase: string) {
    const t = getTasksForPhase(project, phase)
    if (!t.length) return 0
    return Math.round(t.filter(x => x.completed).length / t.length * 100)
  }

  function getOverallProgress(project: string) {
    const phases = PHASES[project] || []
    const all = phases.flatMap(p => getTasksForPhase(project, p.phase))
    if (!all.length) return 0
    return Math.round(all.filter(x => x.completed).length / all.length * 100)
  }

  async function sendChat(text?: string) {
    const msg = (text || chatInput).trim()
    if (!msg || chatLoading) return
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: msg }])
    setChatLoading(true)
    const newHistory = [...chatHistory, { role: 'user', content: msg }]
    setChatHistory(newHistory)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory, system: SYSTEM })
      })
      const data = await res.json()
      const reply = data.content?.map((b: { text?: string }) => b.text || '').join('') || 'Ошибка ответа'
      setChatHistory(prev => [...prev, { role: 'assistant', content: reply }])
      setChatMessages(prev => [...prev, { role: 'ai', text: reply }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Ошибка соединения. Проверь интернет и попробуй снова.' }])
    }
    setChatLoading(false)
  }

  async function handleLogout() {
    const { createClient } = await import('@/lib/supabase')
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const totalCompleted = tasks.filter(t => t.completed).length +
    Object.values(PHASES).flat()
      .filter(p => !tasks.some(t => t.project === p.project && t.phase === p.phase))
      .flatMap(p => p.defaultTasks)
      .filter(t => t.completed).length

  const totalInProgress = 4
  const overallPct = Math.round((getOverallProgress('raum') + getOverallProgress('apollo')) / 2)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        :root {
          --bg-base:#0d0d12;--bg-surface:#13131a;--bg-card:#1a1a24;--bg-card-hover:#1f1f2e;
          --bg-glass:rgba(255,255,255,0.04);--border:rgba(255,255,255,0.07);--border-bright:rgba(255,255,255,0.13);
          --accent:#7c5cfc;--accent-light:#a78bfa;--accent-dim:rgba(124,92,252,0.15);--accent-glow:rgba(124,92,252,0.3);
          --green:#22d3a0;--green-dim:rgba(34,211,160,0.15);--amber:#f59e0b;--amber-dim:rgba(245,158,11,0.15);
          --red:#f43f5e;--red-dim:rgba(244,63,94,0.15);--text-primary:#f0eeff;
          --text-secondary:rgba(240,238,255,0.55);--text-muted:rgba(240,238,255,0.3);
          --sidebar-w:240px;--font-display:'Syne',sans-serif;--font-body:'DM Sans',sans-serif;
        }
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:var(--bg-base);color:var(--text-primary);font-family:var(--font-body);min-height:100vh;overflow-x:hidden;}
        .app{display:flex;min-height:100vh;}
        .sidebar{width:var(--sidebar-w);background:var(--bg-surface);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100;padding:24px 0;}
        .sidebar-logo{padding:0 20px 28px;border-bottom:1px solid var(--border);margin-bottom:20px;}
        .logo-mark{display:flex;align-items:center;gap:10px;}
        .logo-icon{width:34px;height:34px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;font-size:14px;color:white;box-shadow:0 0 20px var(--accent-glow);}
        .logo-text{font-family:var(--font-display);font-weight:700;font-size:18px;letter-spacing:0.02em;}
        .logo-sub{font-size:10px;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase;margin-top:2px;}
        .nav-group{padding:0 12px;margin-bottom:8px;}
        .nav-label{font-size:10px;font-weight:500;color:var(--text-muted);letter-spacing:0.12em;text-transform:uppercase;padding:0 8px 8px;}
        .nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;cursor:pointer;color:var(--text-secondary);font-size:14px;font-weight:400;transition:all 0.18s;margin-bottom:2px;border:1px solid transparent;text-decoration:none;background:none;width:100%;text-align:left;font-family:var(--font-body);}
        .nav-item:hover{background:var(--bg-glass);color:var(--text-primary);}
        .nav-item.active{background:var(--accent-dim);color:var(--accent-light);border-color:rgba(124,92,252,0.25);}
        .nav-badge{margin-left:auto;background:var(--accent);color:white;font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;}
        .proj-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
        .proj-dot.raum{background:var(--accent);}
        .proj-dot.apollo{background:var(--green);}
        .sidebar-bottom{margin-top:auto;padding:20px 12px 0;border-top:1px solid var(--border);}
        .user-card{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:var(--bg-glass);border:1px solid var(--border);}
        .user-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#c084fc);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;flex-shrink:0;}
        .user-name{font-size:13px;font-weight:500;}
        .user-role{font-size:11px;color:var(--text-muted);}
        .main{margin-left:var(--sidebar-w);flex:1;display:flex;flex-direction:column;min-height:100vh;}
        .topbar{position:sticky;top:0;z-index:50;background:rgba(13,13,18,0.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:0 32px;height:64px;display:flex;align-items:center;gap:16px;}
        .topbar-title{font-family:var(--font-display);font-size:20px;font-weight:700;flex:1;}
        .topbar-tabs{display:flex;gap:4px;}
        .tab-btn{padding:6px 16px;border-radius:8px;font-size:13px;font-weight:500;border:1px solid transparent;cursor:pointer;color:var(--text-secondary);background:transparent;transition:all 0.18s;font-family:var(--font-body);}
        .tab-btn:hover{color:var(--text-primary);background:var(--bg-glass);}
        .tab-btn.active{background:var(--accent-dim);color:var(--accent-light);border-color:rgba(124,92,252,0.3);}
        .content{padding:28px 32px;flex:1;}
        .card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:20px 22px;transition:border-color 0.2s;}
        .card:hover{border-color:var(--border-bright);}
        .card-label{font-size:12px;color:var(--text-muted);font-weight:400;margin-bottom:6px;letter-spacing:0.02em;}
        .card-value{font-family:var(--font-display);font-size:28px;font-weight:700;color:var(--text-primary);}
        .card-delta{font-size:12px;margin-top:4px;}
        .delta-up{color:var(--green);}
        .grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;}
        .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px;}
        .section-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
        .section-title{font-family:var(--font-display);font-size:16px;font-weight:600;}
        .section-action{font-size:12px;color:var(--accent-light);cursor:pointer;opacity:0.8;background:none;border:none;font-family:var(--font-body);}
        .section-action:hover{opacity:1;}
        .proj-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px 4px 8px;border-radius:20px;font-size:12px;font-weight:500;border:1px solid;}
        .proj-badge.raum{background:rgba(124,92,252,0.12);border-color:rgba(124,92,252,0.3);color:var(--accent-light);}
        .proj-badge.apollo{background:rgba(34,211,160,0.1);border-color:rgba(34,211,160,0.3);color:var(--green);}
        .phase-card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:12px;transition:all 0.2s;}
        .phase-card:hover{border-color:var(--border-bright);}
        .phase-card.active-phase{border-color:rgba(124,92,252,0.35);background:rgba(124,92,252,0.05);}
        .phase-card.done-phase{border-color:rgba(34,211,160,0.2);}
        .phase-top{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
        .phase-num{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;}
        .phase-num.done{background:var(--green-dim);color:var(--green);border:1px solid rgba(34,211,160,0.3);}
        .phase-num.current{background:var(--accent-dim);color:var(--accent-light);border:1px solid rgba(124,92,252,0.4);}
        .phase-num.upcoming{background:var(--bg-glass);color:var(--text-muted);border:1px solid var(--border);}
        .phase-name{font-family:var(--font-display);font-size:15px;font-weight:600;}
        .phase-status-pill{margin-left:auto;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500;}
        .phase-status-pill.done{background:var(--green-dim);color:var(--green);}
        .phase-status-pill.current{background:var(--accent-dim);color:var(--accent-light);}
        .phase-status-pill.upcoming{background:var(--bg-glass);color:var(--text-muted);}
        .task-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:background 0.15s;group:true;}
        .task-row:hover{background:var(--bg-glass);}
        .task-cb{width:18px;height:18px;border-radius:5px;border:1.5px solid var(--border-bright);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;font-size:10px;color:white;background:transparent;}
        .task-cb.checked{background:var(--green);border-color:var(--green);}
        .task-label{font-size:13px;color:var(--text-secondary);flex:1;}
        .task-label.done{text-decoration:line-through;color:var(--text-muted);}
        .task-edit-input{flex:1;padding:2px 6px;background:var(--bg-surface);border:1px solid var(--accent);border-radius:5px;color:var(--text-primary);font-size:13px;font-family:var(--font-body);outline:none;}
        .task-del-btn{opacity:0;width:20px;height:20px;border:none;background:none;color:var(--text-muted);cursor:pointer;font-size:14px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:all 0.15s;flex-shrink:0;}
        .task-row:hover .task-del-btn{opacity:1;}
        .task-del-btn:hover{color:var(--red);background:var(--red-dim);}
        .progress-track{height:3px;background:var(--border);border-radius:4px;margin-top:14px;overflow:hidden;}
        .progress-fill{height:100%;border-radius:4px;background:var(--green);transition:width 0.4s ease;}
        .progress-fill.accent{background:var(--accent);}
        .add-task-row{display:flex;gap:8px;margin-top:10px;}
        .add-task-input{flex:1;padding:8px 12px;background:var(--bg-glass);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-size:13px;font-family:var(--font-body);outline:none;}
        .add-task-input:focus{border-color:var(--accent);}
        .add-task-input::placeholder{color:var(--text-muted);}
        .add-btn{padding:8px 14px;background:var(--accent-dim);border:1px solid rgba(124,92,252,0.3);border-radius:8px;color:var(--accent-light);font-size:14px;cursor:pointer;transition:all 0.15s;}
        .add-btn:hover{background:var(--accent);color:white;}
        .auto-group-title{font-size:11px;font-weight:500;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase;margin:20px 0 10px;}
        .auto-row{display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;margin-bottom:8px;transition:all 0.18s;}
        .auto-row:hover{border-color:var(--border-bright);background:var(--bg-card-hover);}
        .auto-icon-wrap{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
        .auto-icon-wrap.purple{background:var(--accent-dim);}
        .auto-icon-wrap.green{background:var(--green-dim);}
        .auto-icon-wrap.amber{background:var(--amber-dim);}
        .auto-name{font-size:14px;font-weight:500;}
        .auto-desc{font-size:12px;color:var(--text-muted);margin-top:2px;}
        .priority-pill{font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;}
        .priority-pill.hot{background:rgba(244,63,94,0.15);color:#fb7185;}
        .priority-pill.med{background:var(--amber-dim);color:var(--amber);}
        .priority-pill.low{background:var(--bg-glass);color:var(--text-muted);}
        .chat-layout{display:grid;grid-template-columns:1fr 340px;gap:20px;}
        .chat-main{display:flex;flex-direction:column;height:calc(100vh - 160px);}
        .chat-messages{flex:1;overflow-y:auto;padding:20px;background:var(--bg-card);border:1px solid var(--border);border-radius:16px 16px 0 0;scrollbar-width:thin;scrollbar-color:var(--border) transparent;}
        .chat-input-wrap{background:var(--bg-card);border:1px solid var(--border);border-top:none;border-radius:0 0 16px 16px;padding:16px;display:flex;gap:10px;}
        .chat-input{flex:1;padding:10px 14px;background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-family:var(--font-body);font-size:14px;outline:none;resize:none;}
        .chat-input:focus{border-color:var(--accent);}
        .send-btn{padding:10px 20px;background:var(--accent);border:none;border-radius:10px;color:white;font-family:var(--font-display);font-weight:600;font-size:14px;cursor:pointer;transition:all 0.15s;flex-shrink:0;}
        .send-btn:hover{background:#6d4fe0;box-shadow:0 0 20px var(--accent-glow);}
        .send-btn:disabled{opacity:0.5;cursor:not-allowed;}
        .msg{margin-bottom:18px;animation:fadeUp 0.25s ease;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .msg-role{font-size:11px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px;}
        .msg-role.user{color:var(--accent-light);}
        .msg-role.ai{color:var(--green);}
        .msg-bubble{padding:12px 16px;border-radius:12px;font-size:14px;line-height:1.65;max-width:92%;white-space:pre-wrap;}
        .msg-bubble.user{background:var(--accent-dim);border:1px solid rgba(124,92,252,0.2);margin-left:auto;text-align:right;}
        .msg-bubble.ai{background:var(--bg-surface);border:1px solid var(--border);}
        .typing-dots{display:flex;gap:4px;padding:14px 16px;}
        .typing-dots span{width:6px;height:6px;border-radius:50%;background:var(--text-muted);animation:blink 1.2s infinite;}
        .typing-dots span:nth-child(2){animation-delay:0.2s;}
        .typing-dots span:nth-child(3){animation-delay:0.4s;}
        @keyframes blink{0%,80%,100%{opacity:0.3;}40%{opacity:1;}}
        .prompts-panel{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:20px;height:fit-content;}
        .prompts-panel-title{font-family:var(--font-display);font-size:14px;font-weight:600;margin-bottom:14px;}
        .prompt-chip{display:block;width:100%;padding:10px 14px;background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;color:var(--text-secondary);font-size:13px;cursor:pointer;text-align:left;margin-bottom:8px;transition:all 0.18s;font-family:var(--font-body);line-height:1.4;}
        .prompt-chip:hover{border-color:var(--accent);color:var(--text-primary);background:var(--accent-dim);}
        .prompt-chip-label{font-size:10px;color:var(--text-muted);letter-spacing:0.08em;text-transform:uppercase;margin:14px 0 8px;}
        .welcome-banner{background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:28px 32px;margin-bottom:24px;position:relative;overflow:hidden;}
        .welcome-banner::before{content:'';position:absolute;top:-60px;right:-60px;width:200px;height:200px;background:radial-gradient(circle,rgba(124,92,252,0.2) 0%,transparent 70%);pointer-events:none;}
        .welcome-title{font-family:var(--font-display);font-size:26px;font-weight:800;margin-bottom:8px;}
        .welcome-sub{font-size:14px;color:var(--text-secondary);line-height:1.6;}
        .proj-selector{display:flex;gap:10px;margin-bottom:20px;}
        .proj-btn{padding:8px 18px;border-radius:10px;font-size:13px;font-weight:500;border:1px solid var(--border);cursor:pointer;background:transparent;color:var(--text-secondary);transition:all 0.18s;font-family:var(--font-body);}
        .proj-btn:hover{border-color:var(--border-bright);color:var(--text-primary);}
        .proj-btn.active-raum{background:var(--accent-dim);border-color:rgba(124,92,252,0.4);color:var(--accent-light);}
        .proj-btn.active-apollo{background:var(--green-dim);border-color:rgba(34,211,160,0.4);color:var(--green);}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:var(--border-bright);border-radius:4px;}
        .glow-accent{box-shadow:0 0 30px rgba(124,92,252,0.15);}
        .logout-btn{margin-top:8px;width:100%;padding:8px 12px;border-radius:8px;background:transparent;border:1px solid var(--border);color:var(--text-muted);font-size:12px;cursor:pointer;font-family:var(--font-body);transition:all 0.15s;}
        .logout-btn:hover{border-color:var(--red);color:var(--red);}
      `}</style>

      <div className="app">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">
              <div className="logo-icon">R</div>
              <div>
                <div className="logo-text">RAUM HUB</div>
                <div className="logo-sub">Командный центр</div>
              </div>
            </div>
          </div>

          <div className="nav-group">
            <div className="nav-label">Главное</div>
            <button className={`nav-item ${page === 'overview' ? 'active' : ''}`} onClick={() => setPage('overview')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              Обзор
            </button>
            <button className={`nav-item ${page === 'roadmap' ? 'active' : ''}`} onClick={() => setPage('roadmap')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              Дорожная карта
              <span className="nav-badge">2</span>
            </button>
            <button className={`nav-item ${page === 'automate' ? 'active' : ''}`} onClick={() => setPage('automate')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M12 2v2m0 18v-2m8-8h-2M4 12H2"/></svg>
              Автоматизация
            </button>
            <button className={`nav-item ${page === 'aichat' ? 'active' : ''}`} onClick={() => setPage('aichat')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              AI-Ассистент
            </button>
          </div>

          <div className="nav-group">
            <div className="nav-label">Проекты</div>
            <button className="nav-item" onClick={() => { setPage('roadmap'); setProj('raum') }}>
              <span className="proj-dot raum"></span>
              РАУМ — Панели
            </button>
            <button className="nav-item" onClick={() => { setPage('roadmap'); setProj('apollo') }}>
              <span className="proj-dot apollo"></span>
              Аполлон — Плитка
            </button>
          </div>

          <div className="sidebar-bottom">
            <div className="user-card">
              <div className="user-avatar">Д</div>
              <div>
                <div className="user-name">Данил</div>
                <div className="user-role">Основатель</div>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>Выйти</button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          <header className="topbar">
            <div className="topbar-title">
              {page === 'overview' ? 'Обзор' : page === 'roadmap' ? 'Дорожная карта' : page === 'automate' ? 'Автоматизация' : 'AI-Ассистент'}
            </div>
            <div className="topbar-tabs">
              {(['overview','roadmap','automate','aichat'] as const).map(p => (
                <button key={p} className={`tab-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>
                  {p === 'overview' ? 'Обзор' : p === 'roadmap' ? 'Дорожная карта' : p === 'automate' ? 'Автоматизация' : 'AI-чат'}
                </button>
              ))}
            </div>
          </header>

          <div className="content">
            {/* OVERVIEW PAGE */}
            {page === 'overview' && (
              <div>
                <div className="welcome-banner glow-accent">
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                    <div>
                      <div className="welcome-title">Добро пожаловать, Данил 👋</div>
                      <div className="welcome-sub">Трансформация двух бизнесов с помощью AI-агентов.<br/>Следи за прогрессом, управляй задачами, запускай автоматизации.</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0, marginLeft:20 }}>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Общий прогресс</div>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:800, color:'var(--accent-light)' }}>{overallPct}%</div>
                    </div>
                  </div>
                  <div style={{ marginTop:16, display:'flex', gap:10 }}>
                    <span className="proj-badge raum"><span className="proj-dot raum"></span>РАУМ активен</span>
                    <span className="proj-badge apollo"><span className="proj-dot apollo"></span>Аполлон растёт</span>
                  </div>
                </div>

                <div className="grid-4">
                  <div className="card"><div className="card-label">Задач в работе</div><div className="card-value">{totalInProgress}</div><div className="card-delta delta-up">↑ активные фазы</div></div>
                  <div className="card"><div className="card-label">Завершено задач</div><div className="card-value">{totalCompleted}</div><div className="card-delta delta-up">↑ фундамент готов</div></div>
                  <div className="card"><div className="card-label">AI-агентов запущено</div><div className="card-value">0</div><div className="card-delta" style={{ color:'var(--amber)' }}>⚡ Следующий шаг</div></div>
                  <div className="card"><div className="card-label">Областей автоматизации</div><div className="card-value">12</div><div className="card-delta" style={{ color:'var(--text-muted)' }}>5 высокий приоритет</div></div>
                </div>

                <div className="grid-2">
                  <div>
                    <div className="section-hdr">
                      <div className="section-title">РАУМ — прогресс фаз</div>
                      <button className="section-action" onClick={() => { setPage('roadmap'); setProj('raum') }}>Подробнее →</button>
                    </div>
                    <div className="card" style={{ padding:'16px 20px' }}>
                      {PHASES.raum.map(p => (
                        <div key={p.phase} style={{ marginBottom:10 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
                            <span style={{ color:'var(--text-secondary)' }}>{p.name}</span>
                            <span style={{ color: getProgress('raum', p.phase) === 100 ? 'var(--green)' : 'var(--accent-light)' }}>{getProgress('raum', p.phase)}%</span>
                          </div>
                          <div className="progress-track"><div className={`progress-fill ${getProgress('raum', p.phase) === 100 ? '' : 'accent'}`} style={{ width: getProgress('raum', p.phase) + '%' }}></div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="section-hdr">
                      <div className="section-title">Аполлон — прогресс фаз</div>
                      <button className="section-action" onClick={() => { setPage('roadmap'); setProj('apollo') }}>Подробнее →</button>
                    </div>
                    <div className="card" style={{ padding:'16px 20px' }}>
                      {PHASES.apollo.map(p => (
                        <div key={p.phase} style={{ marginBottom:10 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
                            <span style={{ color:'var(--text-secondary)' }}>{p.name}</span>
                            <span style={{ color:'var(--accent-light)' }}>{getProgress('apollo', p.phase)}%</span>
                          </div>
                          <div className="progress-track"><div className="progress-fill accent" style={{ width: getProgress('apollo', p.phase) + '%' }}></div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="section-hdr">
                  <div className="section-title">Приоритеты автоматизации</div>
                  <button className="section-action" onClick={() => setPage('automate')}>Все задачи →</button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div className="auto-row"><div className="auto-icon-wrap purple">💬</div><div><div className="auto-name">Агент ответов на Авито</div><div className="auto-desc">РАУМ — бамбуковые панели</div></div><span className="priority-pill hot">🔥 Сначала</span></div>
                  <div className="auto-row"><div className="auto-icon-wrap purple">🧮</div><div><div className="auto-name">Калькулятор стоимости заказа</div><div className="auto-desc">РАУМ + Аполлон</div></div><span className="priority-pill hot">🔥 Сначала</span></div>
                  <div className="auto-row"><div className="auto-icon-wrap green">📝</div><div><div className="auto-name">Автогенерация объявлений Авито</div><div className="auto-desc">РАУМ — маркетинг</div></div><span className="priority-pill hot">🔥 Сначала</span></div>
                </div>
              </div>
            )}

            {/* ROADMAP PAGE */}
            {page === 'roadmap' && (
              <div>
                <div className="proj-selector">
                  <button className={`proj-btn ${proj === 'raum' ? 'active-raum' : ''}`} onClick={() => setProj('raum')}>▸ РАУМ — Бамбуковые панели</button>
                  <button className={`proj-btn ${proj === 'apollo' ? 'active-apollo' : ''}`} onClick={() => setProj('apollo')}>▸ Аполлон — Тротуарная плитка</button>
                </div>

                {PHASES[proj].map((phaseData) => {
                  const phaseTasks = getTasksForPhase(proj, phaseData.phase)
                  const progress = getProgress(proj, phaseData.phase)
                  const inputKey = `${proj}-${phaseData.phase}`
                  return (
                    <div key={phaseData.phase} className={`phase-card ${phaseData.status === 'done' ? 'done-phase' : phaseData.status === 'current' ? 'active-phase' : ''}`}>
                      <div className="phase-top">
                        <div className={`phase-num ${phaseData.status}`}>{phaseData.status === 'done' ? '✓' : PHASES[proj].indexOf(phaseData) + 1}</div>
                        <div className="phase-name">{phaseData.name}</div>
                        <div className={`phase-status-pill ${phaseData.status}`}>
                          {phaseData.status === 'done' ? 'Готово' : phaseData.status === 'current' ? 'В работе' : 'Далее'}
                        </div>
                      </div>

                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {phaseTasks.map((task) => (
                          <div key={task.id} className="task-row" onClick={() => { if (editingId !== task.id) toggleTask(task) }}>
                            <div className={`task-cb ${task.completed ? 'checked' : ''}`}>{task.completed ? '✓' : ''}</div>
                            {editingId === task.id ? (
                              <input
                                className="task-edit-input"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => saveEdit(task)}
                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(task); if (e.key === 'Escape') setEditingId(null) }}
                                onClick={e => e.stopPropagation()}
                                autoFocus
                              />
                            ) : (
                              <span
                                className={`task-label ${task.completed ? 'done' : ''}`}
                                onDoubleClick={e => { e.stopPropagation(); if (!task.id.startsWith('default:')) { setEditingId(task.id); setEditValue(task.label) } }}
                              >{task.label}</span>
                            )}
                            {!task.id.startsWith('default:') && (
                              <button className="task-del-btn" onClick={e => { e.stopPropagation(); deleteTask(task) }} title="Удалить">×</button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="add-task-row">
                        <input
                          className="add-task-input"
                          placeholder="Добавить задачу..."
                          value={addInputs[inputKey] || ''}
                          onChange={e => setAddInputs(prev => ({ ...prev, [inputKey]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') addTask(proj, phaseData.phase) }}
                        />
                        <button className="add-btn" onClick={() => addTask(proj, phaseData.phase)}>+</button>
                      </div>

                      <div className="progress-track">
                        <div className={`progress-fill ${phaseData.status === 'done' ? '' : 'accent'}`} style={{ width: progress + '%' }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* AUTOMATE PAGE */}
            {page === 'automate' && (
              <div>
                <div className="grid-3" style={{ marginBottom:24 }}>
                  <div className="card" style={{ borderColor:'rgba(244,63,94,0.2)' }}><div className="card-label">Высокий приоритет</div><div className="card-value" style={{ color:'#fb7185' }}>5</div><div className="card-delta" style={{ color:'var(--text-muted)' }}>Сделать первыми</div></div>
                  <div className="card" style={{ borderColor:'rgba(245,158,11,0.2)' }}><div className="card-label">Средний приоритет</div><div className="card-value" style={{ color:'var(--amber)' }}>5</div><div className="card-delta" style={{ color:'var(--text-muted)' }}>После первых побед</div></div>
                  <div className="card"><div className="card-label">Низкий приоритет</div><div className="card-value" style={{ color:'var(--text-muted)' }}>2</div><div className="card-delta" style={{ color:'var(--text-muted)' }}>Позже</div></div>
                </div>
                <div className="auto-group-title">🔥 Продажи и лидогенерация — высокий приоритет</div>
                <div className="auto-row"><div className="auto-icon-wrap purple">💬</div><div><div className="auto-name">Ответы на входящие запросы</div><div className="auto-desc">Авито и Telegram — оба проекта</div></div><span className="priority-pill hot">🔥 Сначала</span></div>
                <div className="auto-row"><div className="auto-icon-wrap purple">🧮</div><div><div className="auto-name">Расчёт стоимости заказа под клиента</div><div className="auto-desc">РАУМ + Аполлон — индивидуальные расчёты</div></div><span className="priority-pill hot">🔥 Сначала</span></div>
                <div className="auto-row"><div className="auto-icon-wrap purple">🎯</div><div><div className="auto-name">Квалификация лидов и сегментация</div><div className="auto-desc">Розница vs оптовик vs B2B</div></div><span className="priority-pill med">Потом</span></div>
                <div className="auto-row"><div className="auto-icon-wrap purple">🔔</div><div><div className="auto-name">Follow-up с клиентами без покупки</div><div className="auto-desc">Автоматическая реактивация лидов</div></div><span className="priority-pill med">Потом</span></div>
                <div className="auto-group-title">📣 Маркетинг и контент — высокий приоритет</div>
                <div className="auto-row"><div className="auto-icon-wrap green">✍️</div><div><div className="auto-name">Создание объявлений для Авито</div><div className="auto-desc">AI-копирайтинг под SEO Авито</div></div><span className="priority-pill hot">🔥 Сначала</span></div>
                <div className="auto-row"><div className="auto-icon-wrap green">📢</div><div><div className="auto-name">Автопостинг в Telegram-канал</div><div className="auto-desc">Расписание + генерация контента</div></div><span className="priority-pill hot">🔥 Сначала</span></div>
                <div className="auto-row"><div className="auto-icon-wrap green">📸</div><div><div className="auto-name">Описания к фотографиям продуктов</div><div className="auto-desc">Автоматические продающие тексты</div></div><span className="priority-pill med">Потом</span></div>
                <div className="auto-row"><div className="auto-icon-wrap green">🔍</div><div><div className="auto-name">Анализ конкурентов и цен на рынке</div><div className="auto-desc">Мониторинг Авито еженедельно</div></div><span className="priority-pill med">Потом</span></div>
                <div className="auto-group-title">⚙️ Операции и финансы</div>
                <div className="auto-row"><div className="auto-icon-wrap amber">🧾</div><div><div className="auto-name">Выставление счетов через 1С</div><div className="auto-desc">Триггер из CRM — авторучка</div></div><span className="priority-pill hot">🔥 Сначала</span></div>
                <div className="auto-row"><div className="auto-icon-wrap amber">📦</div><div><div className="auto-name">Уведомления об остатках и закупках</div><div className="auto-desc">Автоматический контроль склада</div></div><span className="priority-pill med">Потом</span></div>
                <div className="auto-row"><div className="auto-icon-wrap amber">📊</div><div><div className="auto-name">Еженедельный отчёт по выручке</div><div className="auto-desc">Дайджесты KPI каждый понедельник</div></div><span className="priority-pill low">Позже</span></div>
                <div className="auto-row"><div className="auto-icon-wrap amber">🚚</div><div><div className="auto-name">Отслеживание логистики и доставок</div><div className="auto-desc">Уведомления клиентам автоматически</div></div><span className="priority-pill low">Позже</span></div>
              </div>
            )}

            {/* AI CHAT PAGE */}
            {page === 'aichat' && (
              <div className="chat-layout">
                <div className="chat-main">
                  <div className="chat-messages" id="chat-box" ref={(el) => { if (el) el.scrollTop = el.scrollHeight }}>
                    {chatMessages.map((msg, i) => (
                      <div key={i} className="msg">
                        <div className={`msg-role ${msg.role}`}>{msg.role === 'user' ? 'Вы' : 'AI-Ассистент'}</div>
                        <div className={`msg-bubble ${msg.role}`}>{msg.text}</div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="msg">
                        <div className="msg-role ai">AI-Ассистент</div>
                        <div className="msg-bubble ai"><div className="typing-dots"><span></span><span></span><span></span></div></div>
                      </div>
                    )}
                  </div>
                  <div className="chat-input-wrap">
                    <textarea
                      className="chat-input"
                      rows={1}
                      placeholder="Спроси что угодно про автоматизацию РАУМ и Аполлон..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                    />
                    <button className="send-btn" disabled={chatLoading} onClick={() => sendChat()}>Отправить</button>
                  </div>
                </div>

                <div>
                  <div className="prompts-panel">
                    <div className="prompts-panel-title">Быстрые вопросы</div>
                    <div className="prompt-chip-label">РАУМ</div>
                    <button className="prompt-chip" onClick={() => sendChat('Как запустить AI-агента для ответов на Авито для РАУМ (бамбуковые панели 60×15 см)? С чего начать?')}>Агент для Авито с нуля →</button>
                    <button className="prompt-chip" onClick={() => sendChat('Создай скрипт продаж для AI-агента РАУМ: ответы на типичные вопросы по бамбуковым панелям')}>Скрипт продаж для агента →</button>
                    <button className="prompt-chip" onClick={() => sendChat('Как автоматизировать расчёт стоимости заказа бамбуковых панелей РАУМ? Сделай шаблон калькулятора')}>Калькулятор заказа →</button>
                    <div className="prompt-chip-label">АПОЛЛОН</div>
                    <button className="prompt-chip" onClick={() => sendChat('С чего начать систематизацию продаж тротуарной плитки и брусчатки Аполлон?')}>С чего начать в Аполлоне →</button>
                    <button className="prompt-chip" onClick={() => sendChat('Создай шаблон AI-агента-консультанта для бизнеса по тротуарной плитке и брусчатке')}>Агент-консультант по плитке →</button>
                    <button className="prompt-chip" onClick={() => sendChat('Как сделать B2B-предложение для строительных компаний от Аполлон (тротуарная плитка)?')}>B2B для строителей →</button>
                    <div className="prompt-chip-label">Стратегия</div>
                    <button className="prompt-chip" onClick={() => sendChat('Объясни как построить команду из 6 AI-агентов для двух бизнесов РАУМ и Аполлон. Какие агенты нужны?')}>6 AI-агентов для обоих →</button>
                    <button className="prompt-chip" onClick={() => sendChat('Какие no-code инструменты использовать для AI-автоматизации РАУМ и Аполлон? Составь список')}>No-code инструменты →</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
