import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, download } from '../api'
import { Banner, DocView } from '../components'
import { IconArrowLeft, IconCheck, IconDownload, IconSend, IconShield } from '../icons'

export function Sign() {
  const { id } = useParams()
  const [sig, setSig] = useState<any>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    (async () => {
      try {
        const d = await api(`/documents/${id}`)
        const s = await api(`/documents/${id}/versions/${d.latest_version}/sign`, { method: 'POST' })
        setSig(await api(`/signatures/${s.id}`))
      } catch (e: any) { setErr(e.message) }
    })()
  }, [id])
  const confirmSign = async () => {
    setBusy(true); setErr('')
    try { setSig(await api(`/signatures/${sig.id}/confirm`, { method: 'POST' })) } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  if (!sig) {
    return <div className="grid h-full place-items-center">{err
      ? <div className="w-full max-w-md space-y-3"><Banner kind="error">{err}</Banner><Link className="btn-ghost" to={`/documents/${id}`}>← К документу</Link></div>
      : <div className="flex items-center gap-2 text-[13px] text-muted"><span className="spinner h-4 w-4" /> Подготовка к подписанию…</div>}</div>
  }
  const signed = sig.status === 'signed_demo'
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <Link to={`/documents/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted transition hover:text-ink"><IconArrowLeft size={14} /> К документу</Link>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Подписание документа</h1>
      <div className="mt-4 space-y-3">
        <Banner kind="warn"><b>Симуляция Госключа.</b> {sig.notice}</Banner>
        {err && <Banner kind="error">{err}</Banner>}
        <div className="card flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[14px] font-medium">{sig.document.title} · версия {sig.document.version}</div>
            <div className="mt-1 text-[11px] text-muted">Запрос: {sig.request_id} · статус: {sig.status_label}</div>
            <div className="mt-1 break-all text-[10px] text-muted">SHA-256 версии: {sig.content_sha256}</div>
          </div>
          {!signed ? (
            <button className="btn-primary" disabled={busy} onClick={confirmSign}>{busy ? <span className="spinner h-4 w-4" /> : <IconShield size={16} />}{busy ? 'Подписываю…' : 'Подтвердить подписание (демо)'}</button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={() => download(`/signatures/${sig.id}/download`, `demo_signed_${sig.id}.pdf`).catch(e => setErr(e.message))}><IconDownload size={16} /> PDF с демо-подписью</button>
              <Link className="btn-primary" to={`/documents/${id}/send?v=${sig.document.version}`}><IconSend size={16} /> К отправке</Link>
            </div>)}
        </div>
        {signed && <Banner kind={sig.verification.valid ? 'ok' : 'error'}><b>Демо-подпись поставлена.</b> {sig.verification.message} Юридической силы не имеет.</Banner>}
        <DocView content={sig.document.content} />
      </div>
    </div>
  )
}

export function Send() {
  const { id } = useParams()
  const [q] = useSearchParams()
  const nav = useNavigate()
  const [d, setD] = useState<any>(null)
  const [disp, setDisp] = useState<any>(null)
  const [f, setF] = useState({ name: '', address: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const ver = Number(q.get('v'))
  useEffect(() => {
    api(`/documents/${id}`).then(x => { setD(x); setF({ name: x.recipient_suggestion?.name || '', address: x.recipient_suggestion?.address || '' }) }).catch(e => setErr(e.message))
  }, [id])
  if (!d) return <div className="grid h-full place-items-center">{err ? <div className="max-w-md"><Banner kind="error">{err}</Banner></div> : <span className="spinner h-5 w-5 text-muted" />}</div>

  const v = d.versions.find((x: any) => x.version === ver) || d.versions[0]
  const signed = v.status === 'signed' || v.status === 'sent' || v.status === 'delivered'
  const prepare = async () => {
    if (f.name.trim().length < 2 || f.address.trim().length < 5) { setErr('Укажите получателя и полный адрес'); return }
    setBusy(true); setErr('')
    try { setDisp(await api('/dispatches', { body: { document_version_id: v.id, recipient_name: f.name, recipient_address: f.address } })) }
    catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  const submit = async () => {
    setBusy(true); setErr('')
    try { const r = await api(`/dispatches/${disp.id}/submit`, { method: 'POST' }); nav(`/dispatches/${r.id}`) }
    catch (e: any) { setErr(e.message); setBusy(false) }
  }
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <Link to={`/documents/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted transition hover:text-ink"><IconArrowLeft size={14} /> К документу</Link>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Отправка документа</h1>
      <div className="mt-4 space-y-3">
        <Banner kind="warn"><b>Симуляция Почты России.</b> Реальное письмо не отправляется, номер отправления демонстрационный.</Banner>
        {err && <Banner kind="error">{err}</Banner>}
        {!signed && <Banner kind="error">Версия {v.version} не подписана. <Link className="underline" to={`/documents/${id}/sign`}>Перейти к подписанию</Link></Banner>}
        {signed && (
          <div className="card space-y-3">
            <div className="text-[14px] font-medium">{d.title} · версия {v.version} <span className="text-[11px] font-normal text-muted">(демо-подпись)</span></div>
            {!disp ? <>
              <label className="block"><span className="label">Получатель</span>
                <input className="input" placeholder="ФИО или организация" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
              <label className="block"><span className="label">Почтовый адрес</span>
                <textarea className="input" rows={2} placeholder="Полный адрес получателя" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} /></label>
              <button className="btn-primary" disabled={busy} onClick={prepare}>{busy ? <span className="spinner h-4 w-4" /> : <IconSend size={16} />} Подготовить отправление</button>
            </> : <>
              <div className="rounded-xl bg-panel2 p-3 text-[13px] leading-relaxed">
                <div><b>Способ:</b> {disp.delivery_method}</div>
                <div><b>Получатель:</b> {disp.recipient_name}</div>
                <div><b>Адрес:</b> {disp.recipient_address}</div>
                <div><b>Статус:</b> {disp.status_label}</div>
              </div>
              {disp.status === 'prepared'
                ? <button className="btn-primary" disabled={busy} onClick={submit}>{busy ? <span className="spinner h-4 w-4" /> : <IconCheck size={16} />}{busy ? 'Отправляю…' : 'Подтвердить отправку (симуляция)'}</button>
                : <Link className="btn-dark" to={`/dispatches/${disp.id}`}>Открыть историю отправления</Link>}
            </>}
          </div>)}
      </div>
    </div>
  )
}
