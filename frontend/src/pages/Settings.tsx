import { useEffect, useState } from 'react'
import { api, fmtDT } from '../api'
import { Banner } from '../components'
import {
  IconAlert, IconCheck, IconCode, IconCopy, IconExternal, IconKey, IconLock, IconPlus, IconSettings, IconShield,
  IconSparkles, IconTrash,
} from '../icons'

const TABS = [
  { id: 'ai', label: 'Провайдер ИИ', hint: 'Модель и подключение', icon: IconSparkles },
  { id: 'api', label: 'API-доступ', hint: 'Ключи и примеры', icon: IconKey },
  { id: 'privacy', label: 'Приватность', hint: 'Какие данные уходят', icon: IconShield },
] as const
type TabId = typeof TABS[number]['id']

export default function Settings() {
  const [s, setS] = useState<any>(null)
  const [provider, setProvider] = useState('demo')
  const [model, setModel] = useState('')
  const [msg, setMsg] = useState<any>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<TabId>('ai')

  const [keys, setKeys] = useState<any[]>([])
  const [keyName, setKeyName] = useState('')
  const [fresh, setFresh] = useState<any>(null)
  const [copied, setCopied] = useState('')
  const [keyBusy, setKeyBusy] = useState(false)
  const [keyErr, setKeyErr] = useState('')

  useEffect(() => {
    api('/settings').then(x => { setS(x); setProvider(x.provider); setModel(x.model) }).catch(e => setErr(e.message))
  }, [])

  useEffect(() => {
    if (tab !== 'api') return
    setKeyErr('')
    api('/api-keys').then(setKeys).catch((e: any) => setKeyErr(e.message))
  }, [tab])

  const save = async () => {
    setBusy(true); setErr('')
    try { const x = await api('/settings', { method: 'PUT', body: { provider, model } }); setS(x); setMsg({ ok: true, message: 'Настройки сохранены' }) }
    catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  const test = async () => {
    setMsg(null); setBusy(true)
    try { setMsg(await api('/settings/test', { method: 'POST' })) } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1600) } catch { setCopied('') }
  }
  const createKey = async () => {
    setKeyErr(''); setKeyBusy(true)
    try {
      const k = await api('/api-keys', { method: 'POST', body: { name: keyName.trim() || 'Внешнее приложение' } })
      setFresh(k); setKeyName(''); setKeys(await api('/api-keys'))
    } catch (e: any) { setKeyErr(e.message) } finally { setKeyBusy(false) }
  }
  const revoke = async (id: number) => {
    setKeyErr('')
    try {
      await api(`/api-keys/${id}`, { method: 'DELETE' })
      if (fresh?.id === id) setFresh(null)
      setKeys(await api('/api-keys'))
    } catch (e: any) { setKeyErr(e.message) }
  }

  if (!s) {
    return (
      <div className="grid h-full place-items-center">
        {err ? <div className="max-w-md"><Banner kind="error">{err}</Banner></div> : <span className="spinner h-5 w-5 text-muted" />}
      </div>
    )
  }

  const origin = window.location.origin
  const sample = [
    `curl -X POST ${origin}/api/v1/cases \\`,
    `  -H "X-API-Key: ${fresh?.key || 'ak_...'}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"title":"Спор с маркетплейсом"}'`,
  ].join('\n')

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-9 sm:px-8 sm:py-12">
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted">Конфигурация</div>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <IconSettings size={24} className="text-muted" /> Настройки
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[236px_minmax(0,1fr)]">
        <nav className="scroll-thin flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Разделы настроек">
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${active ? 'border-brand' : 'border-transparent hover:bg-panel2'}`}
                style={active ? { background: 'var(--brand-soft)', boxShadow: '0 0 0 3px var(--ring)' } : undefined}>
                <t.icon size={17} className={active ? 'text-brand-ink' : 'text-muted'} />
                <span className="min-w-0">
                  <span className={`block whitespace-nowrap text-[13px] ${active ? 'font-medium text-ink' : 'text-ink2'}`}>{t.label}</span>
                  <span className="hidden text-[11px] text-muted lg:block">{t.hint}</span>
                </span>
              </button>)
          })}
        </nav>

        <div className="min-w-0 space-y-3">
          {tab === 'ai' && (
            <>
              <Banner kind="info">{s.privacy}</Banner>
              {err && <Banner kind="error">{err}</Banner>}
              <div className="space-y-2">
                {s.providers.map((p: any) => (
                  <label key={p.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-panel p-4 transition ${provider === p.id ? 'border-brand' : 'border-line hover:border-line2'}`}
                    style={provider === p.id ? { boxShadow: '0 0 0 3px var(--ring)' } : undefined}>
                    <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${provider === p.id ? 'border-transparent' : 'border-line2'}`}
                      style={provider === p.id ? { backgroundImage: 'linear-gradient(135deg, var(--brand), var(--brand-2))' } : undefined}>
                      {provider === p.id && <IconCheck size={11} className="text-white" />}
                    </span>
                    <input type="radio" className="sr-only" checked={provider === p.id} onChange={() => { setProvider(p.id); setModel(p.default_model) }} />
                    <div className="flex-1">
                      <div className="text-[13.5px] font-medium capitalize">{p.id === 'demo' ? 'Демонстрационный режим' : p.id}</div>
                      <div className="mt-0.5 text-[12px] leading-relaxed text-muted">{p.hint}</div>
                    </div>
                    <span className="chip" style={{ background: p.available ? 'var(--ok-soft)' : 'var(--warn-soft)', color: p.available ? 'var(--ok)' : 'var(--warn)' }}>
                      {p.available ? 'готов' : 'нет ключа'}
                    </span>
                  </label>))}
              </div>
              {provider !== 'demo' && (
                <div className="card">
                  <label className="label">Модель</label>
                  <input className="input" value={model} onChange={e => setModel(e.target.value)} />
                  <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-muted"><IconShield size={13} className="mt-0.5 shrink-0" /> API-ключи задаются только в файле .env и здесь не отображаются.</div>
                </div>)}
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <span className="spinner h-4 w-4" /> : <IconCheck size={16} />} Сохранить</button>
                <button className="btn-ghost" onClick={test} disabled={busy}><IconSparkles size={16} /> Проверить подключение</button>
              </div>
              {msg && <Banner kind={msg.ok ? 'ok' : 'error'}>{msg.message}</Banner>}
            </>
          )}

          {tab === 'api' && (
            <>
              <div className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium"><IconKey size={16} className="text-brand-ink" /> Ключи доступа к API</div>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted">
                      Ключ подключает к сервису другие приложения: чат-ботов, CRM, скрипты. Запросы идут на <code className="rounded bg-panel2 px-1">/api/v1</code> с заголовком <code className="rounded bg-panel2 px-1">X-API-Key</code>.
                    </p>
                  </div>
                </div>
                {keyErr && <Banner kind="error">{keyErr}</Banner>}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input className="input" placeholder="Название, например «Мой бот»" maxLength={80}
                    value={keyName} onChange={e => setKeyName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') createKey() }} />
                  <button className="btn-primary shrink-0" onClick={createKey} disabled={keyBusy}>
                    {keyBusy ? <span className="spinner h-4 w-4" /> : <IconPlus size={16} />} Создать ключ
                  </button>
                </div>
                {fresh && (
                  <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--brand)', background: 'var(--brand-soft)' }}>
                    <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--brand-ink)' }}>
                      <IconAlert size={14} /> Ключ показывается один раз — скопируйте его сейчас
                    </div>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <code className="scroll-thin min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-line bg-panel px-3 py-2 font-mono text-[12px]">{fresh.key}</code>
                      <button className="btn-ghost shrink-0 !py-2" onClick={() => copy(fresh.key, 'key')}>
                        {copied === 'key' ? <IconCheck size={15} /> : <IconCopy size={15} />} {copied === 'key' ? 'Скопировано' : 'Копировать'}
                      </button>
                    </div>
                  </div>)}
              </div>

              <div className="space-y-2">
                {keys.length === 0 && <div className="card-flat text-[13px] text-muted">Пока нет ключей. Создайте первый — он появится здесь с префиксом и датой использования.</div>}
                {keys.map(k => (
                  <div key={k.id} className="card-flat flex flex-wrap items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: 'var(--panel-2)' }}><IconKey size={16} className="text-muted" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{k.name}</div>
                      <div className="mt-0.5 text-[11px] text-muted">
                        <span className="font-mono">{k.prefix}…</span> · создан {fmtDT(k.created_at)}
                        {k.last_used_at ? ` · использован ${fmtDT(k.last_used_at)}` : ' · ещё не использован'}
                      </div>
                    </div>
                    {k.revoked_at
                      ? <span className="text-[11px] text-muted">отозван</span>
                      : <button className="btn-subtle !py-2 text-[12px]" onClick={() => revoke(k.id)}><IconTrash size={15} /> Отозвать</button>}
                  </div>
                ))}
              </div>

              <div className="card space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium"><IconCode size={16} className="text-brand-ink" /> Быстрый старт</div>
                  <a href="/docs" target="_blank" rel="noreferrer" className="btn-ghost !py-1.5 text-[12px]"><IconExternal size={14} /> Swagger</a>
                </div>
                <pre className="scroll-thin overflow-x-auto rounded-xl border border-line bg-panel2 p-3 font-mono text-[11.5px] leading-relaxed">{sample}</pre>
                <div className="grid gap-1.5 text-[11.5px] text-muted">
                  <div><code className="rounded bg-panel2 px-1">POST /api/v1/cases/{"{id}"}/messages</code> — сообщение помощнику, ответ и обновлённое дело</div>
                  <div><code className="rounded bg-panel2 px-1">POST /api/v1/cases/{"{id}"}/files</code> — загрузка чека или договора (multipart)</div>
                  <div><code className="rounded bg-panel2 px-1">POST /api/v1/cases/{"{id}"}/documents</code> — готовая претензия с текстом</div>
                  <div><code className="rounded bg-panel2 px-1">GET /api/v1/documents/{"{id}"}</code> — документ и все версии</div>
                </div>
                <div className="flex items-start gap-1.5 text-[11px] text-muted"><IconLock size={13} className="mt-0.5 shrink-0" /> Ключ действует только на ваши дела, лимит — 120 запросов в минуту. Полная схема: <a className="underline decoration-dotted" href="/openapi.json" target="_blank" rel="noreferrer">openapi.json</a>.</div>
              </div>
            </>
          )}

          {tab === 'privacy' && (
            <>
              <Banner kind="info">{s.privacy}</Banner>
              <div className="card space-y-3">
                <div className="text-sm font-medium">Что происходит с данными</div>
                <ul className="space-y-2 text-[12.5px] leading-relaxed text-muted">
                  <li>• Дела, сообщения, факты и документы хранятся в локальной базе SQLite на этом компьютере.</li>
                  <li>• Текст диалога и распознанный текст документов уходят только выбранному провайдеру ИИ и только для подготовки ответа.</li>
                  <li>• API-ключи хранятся в виде хеша: сам ключ виден один раз при создании.</li>
                  <li>• Подписание и отправка — демонстрационные, юридической силы не имеют.</li>
                </ul>
              </div>
              <div className="card space-y-1.5 text-[12.5px] text-muted">
                <div className="text-sm font-medium text-ink">Совет</div>
                <p>Для внешней интеграции создайте отдельный ключ на каждое приложение — так его можно отозвать, не задев остальные.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
