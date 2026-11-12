import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, download, fmtDT } from './api'
import { IconAlert, IconCheck, IconChevronRight, IconDownload, IconFile, IconTrash } from './icons'

type Kind = 'info' | 'warn' | 'error' | 'ok'

export const Banner = ({ kind = 'info', children }: { kind?: Kind; children: any }) => {
  const map: Record<Kind, [string, string, string]> = {
    info: ['var(--brand-soft)', 'var(--brand-ink)', 'var(--brand)'],
    warn: ['var(--warn-soft)', 'var(--warn)', 'var(--warn)'],
    error: ['var(--err-soft)', 'var(--err)', 'var(--err)'],
    ok: ['var(--ok-soft)', 'var(--ok)', 'var(--ok)'],
  }
  const [bg, color, border] = map[kind]
  return (
    <div className="flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed" style={{ background: bg, color, borderColor: border }}>
      {kind === 'ok' ? <IconCheck size={15} className="mt-0.5 shrink-0" /> : kind === 'info' ? null : <IconAlert size={15} className="mt-0.5 shrink-0" />}
      <div className="min-w-0">{children}</div>
    </div>
  )
}

const TONES: Record<string, [string, string]> = {
  gray: ['var(--panel-2)', 'var(--muted)'],
  blue: ['var(--brand-soft)', 'var(--brand-ink)'],
  green: ['var(--ok-soft)', 'var(--ok)'],
  amber: ['var(--warn-soft)', 'var(--warn)'],
  red: ['var(--err-soft)', 'var(--err)'],
}

export const Badge = ({ children, tone = 'gray' }: { children: any; tone?: string }) => {
  const [bg, color] = TONES[tone] || TONES.gray
  return <span className="chip" style={{ background: bg, color }}>{children}</span>
}

export const statusTone = (s: string) => ({ delivered: 'green', sent: 'green', signed: 'green', ready: 'blue', document: 'blue', lawyer: 'red', needs_work: 'amber', pending_sign: 'amber' } as any)[s] || 'gray'

export function DocView({ content }: { content: string }) {
  const lines = content.split('\n').filter(l => l.trim())
  const ph = (t: string) => t.split(/(\[НЕ УКАЗАНО: [^\]]+\])/g).map((p, i) => p.startsWith('[НЕ УКАЗАНО') ? <mark key={i} className="rounded bg-[#fde68a] px-1 text-[#7c2d12]">{p}</mark> : p)
  return (
    <div className="doc-paper mx-auto w-full max-w-[720px]">
      {lines.map((l, i) =>
        l.startsWith('> ') ? <div key={i} className="text-right">{ph(l.slice(2))}</div> :
          l.startsWith('# ') ? <h1 key={i} className="mt-6 text-center text-2xl font-bold">{ph(l.slice(2))}</h1> :
            l.startsWith('## ') ? <h3 key={i} className={`mt-4 font-bold ${/^(о|об) /.test(l.slice(3)) ? 'text-center' : ''}`}>{ph(l.slice(3))}</h3> :
              <p key={i} className="mt-1.5">{ph(l)}</p>)}
    </div>
  )
}

const LEVEL: Record<string, [string, string]> = { auto: ['green', 'Можно продолжать'], review: ['amber', 'Нужна проверка'], lawyer: ['red', 'Передать юристу'] }

export function Confidence({ ev, detailed = false }: { ev: any; detailed?: boolean }) {
  if (!ev) return null
  const [tone, label] = LEVEL[ev.level] || LEVEL.review
  const bar = ev.score >= 85 ? 'var(--ok)' : ev.score >= 65 ? 'var(--warn)' : 'var(--err)'
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">Демо-оценка подготовки</span>
        <Badge tone={tone}>{ev.score}/100 · {label}</Badge>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel3">
        <div className="h-full rounded-full transition-all" style={{ width: ev.score + '%', background: bar }} />
      </div>
      {ev.critical.length > 0 && <div className="mt-2.5 space-y-1.5">{ev.critical.map((c: string) => <Banner key={c} kind="error">{c}</Banner>)}</div>}
      {detailed && <div className="mt-3 space-y-2.5 text-xs">
        {Object.entries(ev.details).map(([k, d]: any) => (
          <div key={k}>
            <div className="flex justify-between gap-2"><span>{ev.labels[k]} <span className="text-muted">(вес {ev.weights[k]})</span></span><b>{d.score}</b></div>
            <div className="mt-0.5 leading-relaxed text-muted">{d.note}</div>
          </div>))}
        <div className="pt-1 text-[11px] leading-relaxed text-muted">{ev.disclaimer} Пороги: ≥85 — продолжать, 65–84 — проверка, &lt;65 — юрист.</div>
      </div>}
    </div>
  )
}

export function CasePanel({ c, reload, full = false }: { c: any; reload: () => Promise<void>; full?: boolean }) {
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [openFile, setOpenFile] = useState<number | null>(null)
  const act = async (fn: () => Promise<any>) => { setBusy(true); setErr(''); try { await fn(); await reload() } catch (e: any) { setErr(e.message) } finally { setBusy(false) } }
  const createClaim = async () => { setBusy(true); setErr(''); try { const d = await api(`/cases/${c.id}/documents`, { body: { type: 'claim' } }); nav(`/documents/${d.id}`) } catch (e: any) { setErr(e.message); setBusy(false) } }
  const pct = c.required_total ? Math.round(100 * c.filled / c.required_total) : 0
  const lawyer = c.confidence?.level === 'lawyer'
  return (
    <div className="space-y-3 text-sm">
      <div className="card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted">{c.category_title}</div>
            <div className="mt-1 font-semibold leading-snug">{c.title}</div>
          </div>
          <Badge tone={statusTone(c.status)}>{c.status_label}</Badge>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted"><span>Сбор сведений</span><span>{c.filled}/{c.required_total}</span></div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel3">
          <div className="h-full rounded-full transition-all" style={{ width: pct + '%', backgroundImage: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }} />
        </div>
        {c.missing_information.length > 0 && (
          <div className="mt-2.5 rounded-lg bg-panel2 px-2.5 py-2 text-[12px] leading-relaxed text-muted">
            <b className="font-medium text-ink2">Не хватает:</b> {c.missing_information.join(', ')}
          </div>
        )}
        {c.unknown_information.length > 0 && <div className="mt-1.5 text-[12px] leading-relaxed" style={{ color: 'var(--warn)' }}><b>Неизвестно:</b> {c.unknown_information.join(', ')}</div>}
      </div>

      <div className="card"><Confidence ev={c.confidence} detailed={full} /></div>

      <div className="card">
        <div className="mb-2 font-medium">Необходимые документы</div>
        {c.required_documents.length === 0 && <div className="text-xs text-muted">Появятся после определения категории</div>}
        {c.required_documents.map((d: any) => (
          <div key={d.kind} className="flex items-center gap-2 py-1 text-xs">
            <span className="grid h-4 w-4 place-items-center rounded-full" style={{ background: d.present ? 'var(--ok-soft)' : 'var(--panel-2)', color: d.present ? 'var(--ok)' : 'var(--muted)' }}>
              {d.present ? <IconCheck size={11} /> : null}
            </span>
            <span className={d.present ? '' : 'text-muted'}>{d.label}</span>
          </div>
        ))}
      </div>

      {c.files.length > 0 && (
        <div className="card">
          <div className="mb-1 font-medium">Загруженные файлы</div>
          {c.files.map((f: any) => (
            <div key={f.id} className="border-t border-line py-2 first:border-0">
              <div className="flex items-center justify-between gap-2">
                <button className="flex min-w-0 items-center gap-1.5 text-left text-xs font-medium hover:text-brand-ink" onClick={() => setOpenFile(openFile === f.id ? null : f.id)}>
                  <IconFile size={14} className="shrink-0 text-muted" /><span className="truncate">{f.name}</span>
                </button>
                <Badge tone={f.verified ? 'green' : 'amber'}>{f.verified ? 'проверен' : 'не проверен'}</Badge>
              </div>
              <div className="mt-0.5 pl-5 text-[11px] text-muted">{f.doc_type_label}</div>
              {openFile === f.id && (
                <div className="mt-2 space-y-2 rounded-xl bg-panel2 p-2.5 text-xs">
                  <div>{f.summary}</div>
                  {f.note && <Banner kind="warn">{f.note}</Banner>}
                  {f.text_preview && <pre className="scroll-thin max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-panel p-2 text-[11px] leading-relaxed">{f.text_preview}</pre>}
                  <div className="text-[11px]" style={{ color: 'var(--warn)' }}>{f.warning}</div>
                  {f.proposals.map((p: any) => (
                    <div key={p.key} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{p.label}: <b>{p.display}</b></span>
                      <button className="btn-ghost !px-2 !py-1 text-[11px]" disabled={busy} onClick={() => act(() => api(`/files/${f.id}/verify`, { body: { verified: true, apply: [p.key] } }))}>Применить</button>
                    </div>))}
                  <div className="flex flex-wrap gap-1.5">
                    <button className="btn-ghost !px-2 !py-1 text-[11px]" disabled={busy} onClick={() => act(() => api(`/files/${f.id}/verify`, { body: { verified: !f.verified } }))}>{f.verified ? 'Снять отметку' : 'Я проверил(а)'}</button>
                    <button className="btn-ghost !px-2 !py-1 text-[11px]" onClick={() => download(`/files/${f.id}/download`, f.name).catch(e => setErr(e.message))}><IconDownload size={12} /> Скачать</button>
                    <button className="btn-ghost !px-2 !py-1 text-[11px] text-err" disabled={busy} onClick={() => confirm('Удалить файл?') && act(() => api(`/files/${f.id}`, { method: 'DELETE' }))}><IconTrash size={12} /> Удалить</button>
                  </div>
                </div>)}
            </div>))}
        </div>
      )}

      {c.contradictions.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--warn)' }}>
          <div className="mb-1 font-medium" style={{ color: 'var(--warn)' }}>Противоречия с документами</div>
          {c.contradictions.map((x: any, i: number) => (
            <div key={i} className="py-1 text-xs leading-relaxed">
              <b>{x.label}:</b> вы указали «{x.user_value}», в файле «{x.file_name}» — «{x.document_value}». {!x.file_verified && <i className="text-muted">(файл ещё не проверен)</i>}
            </div>))}
        </div>
      )}

      <div className="card space-y-2">
        {lawyer && <Banner kind="error">Дело нужно передать юристу — автоматическая подготовка документа остановлена.</Banner>}
        {c.documents.map((d: any) => (
          <Link key={d.id} to={`/documents/${d.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-sm transition hover:border-brand">
            <span className="flex min-w-0 items-center gap-2"><IconFile size={15} className="shrink-0 text-muted" /><span className="truncate">{d.title}</span></span>
            <IconChevronRight size={15} className="shrink-0 text-muted" />
          </Link>))}
        {c.documents.length === 0 && <button className="btn-primary w-full" disabled={busy || !c.category || lawyer} onClick={createClaim}>{busy ? <span className="spinner h-4 w-4" /> : null}{busy ? 'Составляю…' : 'Составить досудебную претензию'}</button>}
        {c.documents.length === 0 && !c.ready && c.category && <div className="text-[11px] leading-relaxed text-muted">Можно составить и сейчас — незаполненные поля будут отмечены в тексте.</div>}
        {err && <Banner kind="error">{err}</Banner>}
      </div>

      {full && <>
        <div className="card">
          <div className="mb-1 font-medium">Участники</div>
          {c.participants.map((p: any, i: number) => <div key={i} className="text-xs">{p.role}: <b>{p.name}</b></div>)}
          {!c.participants.length && <div className="text-xs text-muted">—</div>}
        </div>
        <div className="card">
          <div className="mb-1 font-medium">Хронология</div>
          {c.timeline.map((e: any, i: number) => <div key={i} className="text-xs">{e.date.split('-').reverse().join('.')} — {e.event}</div>)}
          {!c.timeline.length && <div className="text-xs text-muted">—</div>}
        </div>
        <div className="card">
          <div className="mb-1 font-medium">Сроки</div>
          {c.deadlines.map((e: any, i: number) => <div key={i} className="text-xs">{e.due_date.split('-').reverse().join('.')} — {e.title}</div>)}
          {!c.deadlines.length && <div className="text-xs text-muted">Появятся после «вручения» претензии (демо)</div>}
        </div>
      </>}
    </div>
  )
}
export { fmtDT }
