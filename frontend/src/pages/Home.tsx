import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useApp } from '../ctx'
import { Badge, Banner, statusTone } from '../components'
import { IconChevronRight, IconClock, IconFolder, IconPlus, IconShield, IconSparkles } from '../icons'

const EXAMPLES = [
  { text: 'Купил холодильник, через неделю перестал работать. Есть чек.', icon: IconFolder },
  { text: 'Мне помяли автомобиль на парковке. Есть фото, но виновник не выходит на связь.', icon: IconShield },
  { text: 'Заказал ремонт, а мастер выполнил работу плохо. Что делать?', icon: IconSparkles },
]

export default function Home() {
  const { user, reload } = useApp()
  const nav = useNavigate()
  const [cases, setCases] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const load = () => api('/cases').then(setCases).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  const start = async (text?: string) => {
    if (busy) return
    setBusy(true); setErr('')
    try {
      const c = await api('/conversations', { body: {} })
      if (text) await api(`/conversations/${c.conversation.id}/messages`, { body: { content: text } })
      await reload(); nav(`/chat/${c.conversation.id}`)
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  const loadDemo = async () => {
    try { const r = await api('/demo/load', { method: 'POST' }); setMsg(r.message); await reload(); await load() } catch (e: any) { setErr(e.message) }
  }
  const firstName = (user?.name || '').split(' ')[0]

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-9 sm:px-8 sm:py-12">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted">Личный кабинет</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[34px]">Здравствуйте, {firstName}</h1>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">
          Опишите юридическую проблему обычными словами — помощник зафиксирует детали, задаст только недостающие вопросы и подготовит претензию.
        </p>
      </div>

      {err && <div className="mb-4"><Banner kind="error">{err}</Banner></div>}
      {msg && <div className="mb-4"><Banner kind="ok">{msg}</Banner></div>}

      <div className="card !p-5 sm:!p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-semibold">С чего начать</div>
            <div className="mt-1 text-[13px] text-muted">Расскажите ситуацию или выберите пример — детали можно уточнить по ходу.</div>
          </div>
          <button className="btn-primary shrink-0" onClick={() => start()} disabled={busy}>
            {busy ? <span className="spinner h-4 w-4" /> : <IconPlus size={17} />} Новое обращение
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {EXAMPLES.map(ex => (
            <button key={ex.text} onClick={() => start(ex.text)} disabled={busy}
              className="group flex flex-col gap-2 rounded-xl border border-line bg-canvas p-3.5 text-left text-[13px] leading-relaxed transition hover:border-brand hover:bg-panel2 disabled:opacity-60">
              <ex.icon size={17} className="text-muted transition group-hover:text-brand-ink" />
              <span>{ex.text}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="card">
          <div className="flex items-center gap-2 text-[13px] font-medium"><IconSparkles size={16} className="text-brand-ink" /> Демонстрационные сценарии</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">Холодильник, повреждение авто и некачественный ремонт — с тестовыми документами и диалогами.</p>
          <button className="btn-ghost mt-3 !py-2 text-[12px]" onClick={loadDemo}>Загрузить демо-данные</button>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 text-[13px] font-medium"><IconShield size={16} className="text-brand-ink" /> Важно знать</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">Это демонстрационный прототип: подписание и отправка — симуляции и не имеют юридической силы. ИИ не заменяет юриста.</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight">Последние дела</h2>
          <Link to="/cases" className="flex items-center gap-1 text-[12px] text-brand-ink hover:underline">Все дела <IconChevronRight size={13} /></Link>
        </div>
        <div className="grid gap-2">
          {cases.slice(0, 4).map(c => (
            <Link key={c.id} to={c.conversation_id ? `/chat/${c.conversation_id}` : `/cases/${c.id}`}
              className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3 transition hover:border-brand">
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-medium">{c.title}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                  <span className="truncate">{c.category_title}</span>
                  {c.score != null && <><span>·</span><span className="flex items-center gap-1"><IconClock size={11} /> оценка {c.score}</span></>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={statusTone(c.status)}>{c.status_label}</Badge>
                <IconChevronRight size={15} className="text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </div>
            </Link>))}
          {cases.length === 0 && <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted">Дел пока нет — начните с нового обращения.</div>}
        </div>
      </div>
    </div>
  )
}
