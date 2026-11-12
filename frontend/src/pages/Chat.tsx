import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useApp } from '../ctx'
import { Banner, Badge, CasePanel, statusTone } from '../components'
import { IconArrowUp, IconPaperclip, IconPencil, IconScale, IconTrash, IconX } from '../icons'

export default function Chat() {
  const { id } = useParams()
  const { reload } = useApp()
  const nav = useNavigate()
  const [data, setData] = useState<any>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [title, setTitle] = useState<string | null>(null)
  const [panel, setPanel] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const ta = useRef<HTMLTextAreaElement>(null)

  const load = async () => { try { setData(await api(`/conversations/${id}`)); setErr('') } catch (e: any) { setErr(e.message) } }
  useEffect(() => { setData(null); setTitle(null); setPanel(false); load() }, [id])
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [data?.messages?.length, busy])
  useEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [text])

  const send = async () => {
    const t = text.trim()
    if (!t || busy) return
    setBusy(true); setErr(''); setText('')
    setData((d: any) => ({ ...d, messages: [...d.messages, { id: -1, role: 'user', content: t, meta: {} }] }))
    try { setData(await api(`/conversations/${id}/messages`, { body: { content: t } })); reload() }
    catch (e: any) { setErr(e.message); setText(t); await load() } finally { setBusy(false) }
  }
  const upload = async (e: any) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    const form = new FormData(); form.append('file', f)
    setBusy(true); setErr('')
    try { setData(await api(`/conversations/${id}/files`, { form })) } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  const rename = async () => {
    if (title && title.trim() && title !== data.conversation.title) { await api(`/conversations/${id}`, { method: 'PATCH', body: { title } }); await reload(); await load() }
    setTitle(null)
  }
  const del = async () => {
    if (confirm('Удалить диалог? Юридическое дело и документы сохранятся в разделе «Мои дела».')) {
      await api(`/conversations/${id}`, { method: 'DELETE' }); await reload(); nav('/')
    }
  }

  if (!data) {
    return <div className="grid h-full place-items-center">{err ? <div className="max-w-md"><Banner kind="error">{err}</Banner></div> : <span className="spinner h-5 w-5 text-muted" />}</div>
  }

  const caseInfo = data.case
  const panelBody = caseInfo && (
    <>
      <CasePanel c={caseInfo} reload={load} />
      <button className="mt-3 w-full text-center text-[13px] text-brand-ink hover:underline" onClick={() => nav(`/cases/${caseInfo.id}`)}>Открыть страницу дела →</button>
    </>
  )

  return (
    <div className="flex h-full">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-10 flex items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
          <div className="min-w-0 flex-1">
            {title === null ? (
              <h1 className="cursor-text truncate text-[15px] font-semibold tracking-tight" title="Двойной клик — переименовать" onDoubleClick={() => setTitle(data.conversation.title)}>{data.conversation.title}</h1>
            ) : (
              <input autoFocus className="input max-w-sm !py-1.5" value={title} onChange={e => setTitle(e.target.value)} onBlur={rename}
                onKeyDown={e => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') setTitle(null) }} />
            )}
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
              {caseInfo ? <><Badge tone={statusTone(caseInfo.status)}>{caseInfo.status_label}</Badge><span className="truncate">{caseInfo.category_title}</span></> : <span>Новое обращение</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {caseInfo && (
              <button className="btn-ghost !px-2.5 !py-1.5 text-[12px] xl:hidden" onClick={() => setPanel(true)}>Дело</button>
            )}
            <button className="btn-subtle !p-2" title="Переименовать" aria-label="Переименовать" onClick={() => setTitle(data.conversation.title)}><IconPencil size={16} /></button>
            <button className="btn-subtle !p-2" title="Удалить диалог" aria-label="Удалить диалог" onClick={del} style={{ color: 'var(--err)' }}><IconTrash size={16} /></button>
          </div>
        </header>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6">
            {data.messages.map((m: any, i: number) => (
              m.role === 'user' ? (
                <div key={m.id + '-' + i} className="animate-rise flex justify-end">
                  <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-line bg-panel2 px-4 py-2.5 text-[14px] leading-relaxed">{m.content}</div>
                </div>
              ) : (
                <div key={m.id + '-' + i} className="animate-rise flex gap-3">
                  <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white" style={{ backgroundImage: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}>
                    <IconScale size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="whitespace-pre-wrap text-[14px] leading-[1.75]">{m.content}</div>
                    {m.meta?.notice && <div className="mt-2"><Banner kind="warn">{m.meta.notice}</Banner></div>}
                    {m.meta?.provider && m.meta.provider !== 'demo' && <div className="mt-1.5 text-[10px] uppercase tracking-wide text-muted">{m.meta.provider}</div>}
                  </div>
                </div>
              )
            ))}
            {busy && (
              <div className="flex gap-3">
                <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white" style={{ backgroundImage: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}><IconScale size={14} /></div>
                <div className="flex items-center gap-1.5 pt-2"><span className="dot" /><span className="dot" /><span className="dot" /></div>
              </div>
            )}
            <div ref={bottom} />
          </div>
        </div>

        <div className="border-t border-line bg-canvas px-3 py-3 sm:px-4">
          <div className="mx-auto w-full max-w-3xl">
            {err && <div className="mb-2"><Banner kind="error">{err}</Banner></div>}
            <div className="flex items-end gap-1.5 rounded-[22px] border border-line bg-panel p-2 shadow-soft transition focus-within:border-brand">
              <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={upload} />
              <button className="btn-subtle !rounded-full !p-2.5" title="Прикрепить файл (PDF, DOCX, JPG, PNG)" aria-label="Прикрепить файл" onClick={() => fileRef.current?.click()} disabled={busy}>
                <IconPaperclip size={18} />
              </button>
              <textarea ref={ta} rows={1} className="scroll-thin max-h-40 min-h-[38px] flex-1 resize-none bg-transparent px-1 py-2 text-[14px] leading-relaxed outline-none placeholder:text-muted"
                placeholder="Опишите ситуацию своими словами…" value={text} disabled={busy}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
              <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition disabled:opacity-30"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}
                onClick={send} disabled={busy || !text.trim()} aria-label="Отправить">
                <IconArrowUp size={18} />
              </button>
            </div>
            <div className="mt-1.5 text-center text-[11px] text-muted">Enter — отправить, Shift+Enter — новая строка · Используйте вымышленные данные</div>
          </div>
        </div>
      </section>

      <aside className="scroll-thin hidden w-[380px] shrink-0 overflow-y-auto border-l border-line bg-soft p-4 xl:block">
        {panelBody || <div className="card text-[13px] text-muted">Карточка дела появится, когда помощник определит категорию обращения.</div>}
      </aside>

      {panel && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPanel(false)} />
          <div className="scroll-thin absolute inset-y-0 right-0 w-[min(420px,92vw)] overflow-y-auto border-l border-line bg-soft p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Карточка дела</span>
              <button className="btn-subtle !p-2" onClick={() => setPanel(false)} aria-label="Закрыть"><IconX size={18} /></button>
            </div>
            {panelBody}
          </div>
        </div>
      )}
    </div>
  )
}
