import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { Badge, Banner, CasePanel, statusTone } from '../components'
import { IconArrowLeft, IconChat, IconChevronRight, IconFile } from '../icons'

const pctOf = (c: any) => (c.required_total ? Math.round(100 * c.filled / c.required_total) : 0)

export function Cases() {
  const [cases, setCases] = useState<any[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { api('/cases').then(setCases).catch(e => setErr(e.message)) }, [])
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-9 sm:px-8 sm:py-12">
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted">Рабочее пространство</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Мои юридические дела</h1>
        <p className="mt-2 text-[14px] text-muted">Каждое обращение — отдельное дело со своей карточкой, документами и историей.</p>
      </div>
      {err && <div className="mb-4"><Banner kind="error">{err}</Banner></div>}
      {cases?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <div className="text-[14px] font-medium">Дел пока нет</div>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">Начните новое обращение в чате — дело появится здесь автоматически.</p>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {cases?.map(c => (
          <Link key={c.id} to={`/cases/${c.id}`} className="group card transition hover:border-brand">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-muted">{c.category_title}</div>
                <div className="mt-1 font-medium leading-snug">{c.title}</div>
              </div>
              <Badge tone={statusTone(c.status)}>{c.status_label}</Badge>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-panel3">
              <div className="h-full rounded-full" style={{ width: pctOf(c) + '%', backgroundImage: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
              <span>Сведения: {c.filled}/{c.required_total}</span>
              <span>Документов: {c.documents}</span>
              {c.score != null && <span>Оценка: {c.score}</span>}
              <IconChevronRight size={14} className="ml-auto text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </div>
          </Link>))}
      </div>
    </div>
  )
}

export function CaseDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [c, setC] = useState<any>(null)
  const [err, setErr] = useState('')
  const [edit, setEdit] = useState<{ key: string; value: string } | null>(null)
  const load = async () => { try { setC(await api(`/cases/${id}`)); setErr('') } catch (e: any) { setErr(e.message) } }
  useEffect(() => { load() }, [id])
  const save = async () => {
    if (!edit) return
    try { await api(`/cases/${id}/facts`, { method: 'PUT', body: edit }); setEdit(null); await load() } catch (e: any) { setErr(e.message) }
  }
  if (!c) return <div className="grid h-full place-items-center">{err ? <div className="max-w-md"><Banner kind="error">{err}</Banner></div> : <span className="spinner h-5 w-5 text-muted" />}</div>

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <Link to="/cases" className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted transition hover:text-ink"><IconArrowLeft size={14} /> Все дела</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted">{c.category_title} · создано {c.created_at.slice(0, 10)}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h1>
        </div>
        {c.conversation_id && <button className="btn-ghost" onClick={() => nav(`/chat/${c.conversation_id}`)}><IconChat size={16} /> Продолжить диалог</button>}
      </div>
      {err && <div className="mb-4"><Banner kind="error">{err}</Banner></div>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="card">
            <h2 className="h2 mb-1">Сведения по делу</h2>
            <div className="divide-y divide-line">
              {c.facts.map((f: any) => (
                <div key={f.key} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                  <div className="w-44 shrink-0 text-muted sm:w-52">{f.label}{f.required && <span style={{ color: 'var(--err)' }}> *</span>}</div>
                  {edit?.key === f.key ? (
                    <div className="flex flex-1 gap-2">
                      <input autoFocus className="input !py-1.5" value={edit.value} onChange={e => setEdit({ key: f.key, value: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEdit(null) }}
                        placeholder={f.kind === 'date' ? 'ДД.ММ.ГГГГ' : f.kind === 'money' ? 'сумма в рублях' : ''} />
                      <button className="btn-primary !px-3 !py-1.5" onClick={save}>OK</button>
                      <button className="btn-ghost !px-3 !py-1.5" onClick={() => setEdit(null)}>×</button>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        {f.display ?? <span className="text-muted">не указано</span>}
                        {f.source && <span className="ml-2 text-[10px] uppercase tracking-wide text-muted">{{ user: 'со слов', ai: 'ИИ', file: 'из документа', manual: 'вручную', demo: 'демо' }[f.source as string]}</span>}
                      </div>
                      <button className="shrink-0 text-[12px] text-brand-ink hover:underline"
                        onClick={() => setEdit({ key: f.key, value: f.value && f.value !== '__unknown__' ? (f.kind === 'date' ? f.value.split('-').reverse().join('.') : f.value) : '' })}>изменить</button>
                    </>
                  )}
                </div>))}
            </div>
          </div>

          <div className="card">
            <h2 className="h2 mb-2">Правовая основа (демо-база)</h2>
            <Banner kind="warn">{c.legal_disclaimer}</Banner>
            <div className="mt-3 space-y-3 text-[13px]">
              {c.legal_basis.map((n: any) => (
                <div key={n.id}>
                  <b>{n.citation}</b> — {n.title}
                  <div className="mt-0.5 text-[11px] text-muted">Дата актуальности: {n.actual_date} · {n.verified ? 'сверено' : 'не сверено с официальным текстом'}</div>
                </div>))}
              {!c.legal_basis.length && <div className="text-muted">Для этого дела в базе нет норм — требуется юрист.</div>}
            </div>
          </div>

          <div className="card">
            <h2 className="h2 mb-2">Документы</h2>
            {c.documents.map((d: any) => (
              <Link key={d.id} to={`/documents/${d.id}`} className="flex items-center gap-2 py-1.5 text-[13px] text-brand-ink hover:underline"><IconFile size={15} /> {d.title}</Link>))}
            {!c.documents.length && <div className="text-[13px] text-muted">Документов пока нет.</div>}
          </div>
        </div>
        <CasePanel c={c} reload={load} full />
      </div>
    </div>
  )
}
