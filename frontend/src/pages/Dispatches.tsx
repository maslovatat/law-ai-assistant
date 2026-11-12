import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, fmtDT } from '../api'
import { Badge, Banner } from '../components'
import { IconArrowLeft, IconClock, IconMail } from '../icons'

const tone = (s: string) => s === 'delivered' ? 'green' : s === 'failed' ? 'red' : s === 'prepared' ? 'gray' : 'blue'

export function Dispatches() {
  const [list, setList] = useState<any[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { api('/dispatches').then(setList).catch(e => setErr(e.message)) }, [])
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-9 sm:px-8 sm:py-12">
      <div className="mb-5">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted">Доставка</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Отправления</h1>
      </div>
      <Banner kind="warn">Все отправления — симуляция Почты России. Реальные письма не отправляются.</Banner>
      {err && <div className="mt-3"><Banner kind="error">{err}</Banner></div>}
      {list?.length === 0 && <div className="mt-4 rounded-2xl border border-dashed border-line px-6 py-14 text-center text-[13px] text-muted">Отправлений пока нет.</div>}
      <div className="mt-4 space-y-2">
        {list?.map(d => (
          <Link key={d.id} to={`/dispatches/${d.id}`} className="card flex items-center justify-between gap-3 transition hover:border-brand">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-panel2 text-muted"><IconMail size={17} /></span>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-medium">{d.document_title} · v{d.version}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted">Кому: {d.recipient_name} · № {d.tracking_number || '—'} · {fmtDT(d.created_at)}</div>
              </div>
            </div>
            <Badge tone={tone(d.status)}>{d.status_label}</Badge>
          </Link>))}
      </div>
    </div>
  )
}

const STEPS = [['prepared', 'Подготовлено'], ['accepted', 'Передано на отправку'], ['sent', 'Отправлено'], ['delivered', 'Доставлено']]

export function DispatchDetail() {
  const { id } = useParams()
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let stop = false, t: any
    const tick = async () => {
      try {
        const x = await api(`/dispatches/${id}`)
        if (stop) return
        setD(x)
        if (x.status !== 'delivered' && x.status !== 'failed') t = setTimeout(tick, 2000)
      } catch (e: any) { setErr(e.message) }
    }
    tick(); return () => { stop = true; clearTimeout(t) }
  }, [id])
  if (!d) return <div className="grid h-full place-items-center">{err ? <div className="max-w-md"><Banner kind="error">{err}</Banner></div> : <span className="spinner h-5 w-5 text-muted" />}</div>

  const reached = new Map(d.events.map((e: any) => [e.status, e]))
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <Link to="/dispatches" className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted transition hover:text-ink"><IconArrowLeft size={14} /> Все отправления</Link>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Отправление {d.tracking_number || '(не отправлено)'}</h1>
      <div className="mt-4 space-y-3">
        <Banner kind="warn">{d.notice}</Banner>
        {err && <Banner kind="error">{err}</Banner>}
        {d.error && <Banner kind="error">{d.error}</Banner>}
        <div className="card">
          <div className="mb-5 flex items-center">
            {STEPS.map(([k, l], i) => {
              const e: any = reached.get(k)
              return (
                <div key={k} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center text-center">
                    <div className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-medium text-white transition"
                      style={{ background: e ? 'linear-gradient(135deg, var(--brand), var(--brand-2))' : 'var(--panel-3)', color: e ? '#fff' : 'var(--muted)' }}>
                      {e ? '✓' : i + 1}
                    </div>
                    <div className="mt-1.5 w-24 text-[11px] leading-tight">{l}</div>
                    {e && <div className="mt-0.5 text-[10px] text-muted">{fmtDT(e.created_at)}</div>}
                  </div>
                  {i < STEPS.length - 1 && <div className="mx-1 mb-7 h-0.5 flex-1 rounded" style={{ background: reached.get(STEPS[i + 1][0]) ? 'var(--brand)' : 'var(--panel-3)' }} />}
                </div>)
            })}
          </div>
          <div className="grid gap-1.5 text-[13px]">
            <div><b>Документ:</b> <Link className="text-brand-ink hover:underline" to={`/documents/${d.document_id}`}>{d.document_title}</Link> (версия {d.version})</div>
            <div><b>Способ доставки:</b> {d.delivery_method}</div>
            <div><b>Получатель:</b> {d.recipient_name}</div>
            <div><b>Адрес:</b> {d.recipient_address}</div>
            <div><b>Подпись:</b> демонстрационная ({d.signature.request_id}), не имеет юридической силы</div>
            <div><b>Дело:</b> <Link className="text-brand-ink hover:underline" to={`/cases/${d.case_id}`}>открыть</Link></div>
          </div>
        </div>
        {d.status === 'prepared' && <Link className="btn-primary" to={`/documents/${d.document_id}/send?v=${d.version}`}>Продолжить оформление</Link>}
        {d.confirmation && <Banner kind="ok"><b>Подтверждение доставки (демо):</b> вручено {fmtDT(d.confirmation.delivered_at)}. {d.confirmation.note}</Banner>}
        {d.deadlines.length > 0 && (
          <div className="card">
            <div className="mb-1.5 font-medium">Сроки</div>
            {d.deadlines.map((x: any, i: number) => <div key={i} className="flex items-center gap-2 text-[13px]"><IconClock size={14} className="text-muted" />{x.due_date.split('-').reverse().join('.')} — {x.title}</div>)}
          </div>)}
        <div className="card">
          <div className="mb-2 font-medium">История операций</div>
          {d.events.map((e: any, i: number) => (
            <div key={i} className="flex justify-between gap-3 border-t border-line py-2 text-[13px] first:border-0">
              <span>{e.label} — <span className="text-muted">{e.note}</span></span>
              <span className="shrink-0 text-[11px] text-muted">{fmtDT(e.created_at)}</span>
            </div>))}
        </div>
      </div>
    </div>
  )
}
