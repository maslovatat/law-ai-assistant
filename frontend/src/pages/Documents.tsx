import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, download, fmtDT } from '../api'
import { Badge, Banner, Confidence, DocView, statusTone } from '../components'
import { IconArrowLeft, IconDownload, IconFile, IconPencil, IconSearch, IconSend, IconSparkles } from '../icons'

export function Documents() {
  const [docs, setDocs] = useState<any[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { api('/documents').then(setDocs).catch(e => setErr(e.message)) }, [])
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-9 sm:px-8 sm:py-12">
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted">Архив</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Мои документы</h1>
        <p className="mt-2 text-[14px] text-muted">Претензии со всеми версиями, проверками и статусами подписания.</p>
      </div>
      {err && <div className="mb-4"><Banner kind="error">{err}</Banner></div>}
      {docs?.length === 0 && <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-[13px] text-muted">Документов пока нет. Составьте претензию в карточке дела.</div>}
      <div className="space-y-2">
        {docs?.map(d => (
          <Link key={d.id} to={`/documents/${d.id}`} className="group flex items-center justify-between gap-3 card transition hover:border-brand">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-panel2 text-muted"><IconFile size={17} /></span>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-medium">{d.title}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted">Дело: {d.case_title} · версия {d.latest_version} · {fmtDT(d.created_at)}</div>
              </div>
            </div>
            <Badge tone={statusTone(d.status)}>{d.status_label}</Badge>
          </Link>))}
      </div>
    </div>
  )
}

export function DocumentPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [d, setD] = useState<any>(null)
  const [tab, setTab] = useState<'view' | 'edit' | 'history'>('view')
  const [ver, setVer] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const [rv, setRv] = useState<any>(null)
  const [rvBusy, setRvBusy] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiInstr, setAiInstr] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const load = async () => { try { const x = await api(`/documents/${id}`); setD(x); return x } catch (e: any) { setErr(e.message) } }
  useEffect(() => { load().then(x => x && setText(x.content)) }, [id])
  if (!d) return <div className="grid h-full place-items-center">{err ? <div className="max-w-md"><Banner kind="error">{err}</Banner></div> : <span className="spinner h-5 w-5 text-muted" />}</div>

  const cur = d.versions.find((v: any) => v.version === (ver ?? d.latest_version))
  const latest = d.versions[0]
  const isLatest = cur.version === latest.version
  const saveVersion = async () => {
    setBusy(true); setErr(''); setOk('')
    try {
      const x = await api(`/documents/${id}/versions`, { body: { content: text, note } })
      setD(x); setVer(null); setNote(''); setTab('view'); setOk(`Сохранена версия ${x.latest_version}. Если документ был подписан, потребуется новое подписание.`)
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  const dl = (fmt: string) => download(`/documents/${id}/versions/${cur.version}/download?fmt=${fmt}`, `${d.title} v${cur.version}.${fmt}`).catch(e => setErr(e.message))
  const runReview = async () => {
    setRvBusy(true); setRv(null); setErr('')
    try { setRv(await api(`/documents/${id}/versions/${cur.version}/ai-review`, { method: 'POST' })) }
    catch (e: any) { setErr(e.message) } finally { setRvBusy(false) }
  }
  const startEdit = () => { setText(cur.content); setTab('edit') }
  const runAiEdit = async () => {
    setAiBusy(true); setErr(''); setOk('')
    try {
      const x = await api(`/documents/${id}/versions/${cur.version}/ai-edit`, { method: 'POST', body: { instruction: aiInstr } })
      setD(x); setVer(null); setNote(''); setText(x.content); setAiOpen(false); setTab('view')
      setOk(`ИИ переработал текст: сохранена версия ${x.latest_version}. Проверьте формулировки и при необходимости подпишите заново.`)
    } catch (e: any) { setErr(e.message) } finally { setAiBusy(false) }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
      <Link to={`/cases/${d.case_id}`} className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted transition hover:text-ink"><IconArrowLeft size={14} /> К делу: {d.case_title}</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{d.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted">
            <span>Версия {cur.version} из {d.latest_version}</span><span>·</span><span>{fmtDT(cur.created_at)}</span>
            <Badge tone={statusTone(cur.status)}>{cur.status_label}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost !py-2 text-[12px]" onClick={() => dl('docx')}><IconDownload size={15} /> DOCX</button>
          <button className="btn-ghost !py-2 text-[12px]" onClick={() => dl('pdf')}><IconDownload size={15} /> PDF</button>
          <button className="btn-ghost !py-2 text-[12px]" disabled={rvBusy} onClick={runReview}>{rvBusy ? <span className="spinner h-3.5 w-3.5" /> : <IconSearch size={15} />} Проверка ИИ</button>
          <button className="btn-ghost !py-2 text-[12px]" onClick={() => setAiOpen(!aiOpen)}><IconSparkles size={15} /> ИИ-редактор</button>
          {cur.status === 'signed' || cur.status === 'sent' || cur.status === 'delivered'
            ? (cur.dispatch_id ? <Link className="btn-dark !py-2 text-[12px]" to={`/dispatches/${cur.dispatch_id}`}><IconSend size={15} /> К отправлению</Link>
              : <Link className="btn-primary !py-2 text-[12px]" to={`/documents/${id}/send?v=${cur.version}`}>Перейти к отправке</Link>)
            : <button className="btn-primary !py-2 text-[12px]" disabled={!cur.review.ok || !isLatest} onClick={() => nav(`/documents/${id}/sign`)}>Перейти к подписанию</button>}
        </div>
      </div>

      <div className="space-y-3">
        {err && <Banner kind="error">{err}</Banner>}
        {ok && <Banner kind="ok">{ok}</Banner>}
        <Banner kind={cur.review.ok ? 'ok' : 'warn'}>
          <b>Статус проверки:</b> {cur.review.status}
          {cur.review.issues.length > 0 && <ul className="mt-1 list-disc pl-5">{cur.review.issues.map((i: string, k: number) => <li key={k}>{i}</li>)}</ul>}
          {!isLatest && <div className="mt-1">Вы смотрите старую версию. Подписать можно только последнюю.</div>}
          {cur.is_signed && <div className="mt-1">Эта версия зафиксирована демо-подписью и неизменяема. Правка создаст новую версию, которую нужно подписать заново.</div>}
        </Banner>
        {rv && (
          <div className="card space-y-2.5 text-[13px]">
            <div className="font-medium">Результат проверки</div>
            <div className="text-muted">{rv.message}</div>
            {rv.ai && (
              <div>
                <b>{rv.ai.verdict === 'ok' ? 'Замечаний нет' : 'Есть замечания'}</b> — {rv.ai.summary}
                <ul className="mt-1.5 space-y-1">{rv.ai.issues.map((i: any, k: number) => (
                  <li key={k} className="flex items-start gap-2"><Badge tone={i.severity === 'high' ? 'red' : i.severity === 'medium' ? 'amber' : 'gray'}>{i.severity}</Badge><span>{i.text}</span></li>))}
                </ul>
              </div>)}
            <div><b>Сверка с карточкой дела:</b> {rv.rule_issues.length === 0 ? <span style={{ color: 'var(--ok)' }}>расхождений нет</span>
              : <ul className="mt-1 list-disc pl-5">{rv.rule_issues.map((i: string, k: number) => <li key={k}>{i}</li>)}</ul>}</div>
          </div>)}
      </div>

      {aiOpen && (
        <div className="card mt-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] font-medium"><IconSparkles size={16} className="text-brand-ink" /> ИИ-редактор претензии</div>
            <span className="text-[11px] text-muted">создаст новую версию</span>
          </div>
          <p className="text-[12px] leading-relaxed text-muted">Перепишет документ подробнее и официальнее, сохранив суммы, даты и реквизиты. Что изменить?</p>
          <textarea className="input" rows={3} placeholder="Например: добавь, что это видеокарта, и подробнее опиши обстоятельства" value={aiInstr} onChange={e => setAiInstr(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={aiBusy || !isLatest} onClick={runAiEdit}>{aiBusy ? <span className="spinner h-4 w-4" /> : <IconSparkles size={15} />}{aiBusy ? 'Переписываю…' : 'Переработать текст'}</button>
            <button className="btn-ghost" onClick={() => setAiOpen(false)}>Отмена</button>
          </div>
          {!isLatest && <div className="text-[11px]" style={{ color: 'var(--warn)' }}>Переработать можно только последнюю версию — откройте её в истории.</div>}
        </div>)}

      <div className="mt-5 flex gap-1 border-b border-line">
        {([['view', 'Просмотр'], ['edit', 'Редактирование'], ['history', `История версий (${d.versions.length})`]] as any).map(([k, l]: any) => (
          <button key={k} onClick={() => k === 'edit' ? startEdit() : setTab(k)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-[13px] transition ${tab === k ? 'border-brand font-medium text-ink' : 'border-transparent text-muted hover:text-ink'}`}>{l}</button>))}
      </div>

      {tab === 'view' && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <DocView content={cur.content} />
          <div className="card h-fit"><Confidence ev={d.confidence} detailed /></div>
        </div>)}
      {tab === 'edit' && (
        <div className="mt-5 space-y-3">
          <Banner kind="info">Правка создаёт <b>новую версию</b>. Разметка: «&gt; » — правый блок, «# » — заголовок, «## » — подзаголовок. Поля «[НЕ УКАЗАНО: …]» нужно заменить на реальные данные — иначе подписание недоступно.</Banner>
          <textarea className="input scroll-thin h-[480px] font-mono text-[13px] leading-relaxed" value={text} onChange={e => setText(e.target.value)} />
          <input className="input" placeholder="Комментарий к версии (необязательно)" value={note} onChange={e => setNote(e.target.value)} />
          <div className="flex gap-2"><button className="btn-primary" disabled={busy || text.trim().length < 20} onClick={saveVersion}>{busy ? <span className="spinner h-4 w-4" /> : <IconPencil size={15} />} Сохранить новую версию</button><button className="btn-ghost" onClick={() => setTab('view')}>Отмена</button></div>
        </div>)}
      {tab === 'history' && (
        <div className="mt-5 space-y-2">{d.versions.map((v: any) => (
          <div key={v.version} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[13.5px] font-medium">Версия {v.version} {v.version === d.latest_version && <Badge tone="blue">последняя</Badge>}</div>
              <div className="mt-0.5 text-[11px] text-muted">{fmtDT(v.created_at)} · {v.created_by === 'system' ? 'создано системой' : 'отредактировано'} · {v.note}</div>
            </div>
            <div className="flex items-center gap-2"><Badge tone={statusTone(v.status)}>{v.status_label}</Badge>
              <button className="btn-ghost !py-1.5 text-[12px]" onClick={() => { setVer(v.version); setTab('view') }}>Открыть</button></div>
          </div>))}
        </div>)}
    </div>
  )
}
