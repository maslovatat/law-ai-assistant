import { useState } from 'react'
import { api, tokenStore } from '../api'
import { ThemeToggle } from '../theme'
import InteractiveBackground from '../InteractiveBackground'
import {
  IconAlert, IconCheck, IconEye, IconEyeOff, IconLock, IconMail, IconScale, IconShield, IconSparkles, IconUser,
} from '../icons'

const FEATURES = [
  { title: 'Запоминает детали', text: 'ФИО, адрес, даты и суммы попадают в карточку дела сразу — без повторных вопросов.' },
  { title: 'Собирает документы', text: 'Чек, договор и фото распознаются локально, а противоречия подсвечиваются.' },
  { title: 'Готовит претензию', text: 'Досудебная претензия по шаблону, с версиями, проверкой и выгрузкой в DOCX/PDF.' },
]

const strengthOf = (pw: string) => {
  let s = 0
  if (pw.length >= 6) s++
  if (pw.length >= 10) s++
  if (/[A-Za-zА-Яа-я]/.test(pw) && /\d/.test(pw)) s++
  if (/[^\w\s]/.test(pw)) s++
  return s
}
const STRENGTH_LABEL = ['', 'слабый', 'простой', 'хороший', 'надёжный']

export default function Login({ onLogin }: { onLogin: (u: any) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [f, setF] = useState({ email: '', password: '', name: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  const switchMode = (m: 'login' | 'register') => {
    if (m === mode) return
    setMode(m); setErr(''); setShow(false)
    setF({ email: mode === 'register' ? '' : f.email, password: '', name: '', confirm: '' })
  }
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())

  const submit = async (e: any) => {
    e.preventDefault()
    setErr('')
    if (!f.email.trim() || !f.password) { setErr('Заполните e-mail и пароль'); return }
    if (!emailOk) { setErr('Проверьте адрес e-mail — похоже, в нём опечатка'); return }
    if (mode === 'register') {
      if (!f.name.trim()) { setErr('Укажите имя — так к вам будет обращаться помощник'); return }
      if (f.password.length < 6) { setErr('Пароль должен быть не короче 6 символов'); return }
      if (f.password !== f.confirm) { setErr('Пароли не совпадают'); return }
    }
    setBusy(true)
    try {
      const r = await api(`/auth/${mode}`, {
        body: mode === 'login' ? { email: f.email, password: f.password } : { email: f.email, password: f.password, name: f.name },
      })
      tokenStore.set(r.token); onLogin(r.user)
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  const demo = async () => {
    setErr(''); setDemoBusy(true)
    try {
      const r = await api('/auth/login', { body: { email: 'demo@example.com', password: 'demo12345' } })
      tokenStore.set(r.token); onLogin(r.user)
    } catch (e: any) { setErr(`Демо-аккаунт недоступен: ${e.message}`) } finally { setDemoBusy(false) }
  }

  const strength = strengthOf(f.password)

  return (
    <div className="relative min-h-dvh overflow-hidden bg-canvas">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <InteractiveBackground />
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full blur-[110px]"
          style={{ background: 'radial-gradient(circle, var(--brand-soft), transparent 68%)' }} />
        <div className="absolute -bottom-56 right-[-10%] h-[560px] w-[560px] rounded-full blur-[130px] opacity-70"
          style={{ background: 'radial-gradient(circle, var(--brand-soft), transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.22]"
          style={{ backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(ellipse at center, black, transparent 75%)' }} />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ backgroundImage: 'linear-gradient(135deg, var(--brand), var(--brand-2))', boxShadow: '0 10px 24px -12px var(--brand)' }}><IconScale size={19} /></span>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">Legal Assistant</div>
              <div className="text-[11px] text-muted">помощник по бытовым спорам</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted sm:block">Демонстрационный прототип</span>
            <ThemeToggle />
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-8 lg:grid-cols-[1fr_minmax(0,430px)] lg:gap-16">
          <section className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs text-muted">
              <IconSparkles size={14} /> Работает и без ключа ИИ
            </div>
            <h1 className="mt-6 text-[44px] font-semibold leading-[1.06] tracking-tight">
              Юридическая помощь<br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(115deg, var(--brand), var(--brand-2))' }}>
                без юридического языка
              </span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
              Опишите ситуацию обычными словами — помощник зафиксирует детали, проверит документы и подготовит досудебную претензию.
            </p>
            <ul className="mt-9 space-y-5">
              {FEATURES.map(feature => (
                <li key={feature.title} className="flex gap-3.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}><IconCheck size={16} /></span>
                  <div>
                    <div className="text-sm font-medium">{feature.title}</div>
                    <div className="mt-0.5 max-w-sm text-[13px] leading-relaxed text-muted">{feature.text}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex max-w-md items-start gap-2.5 rounded-xl border border-line bg-panel p-3.5 text-[12px] leading-relaxed text-muted">
              <IconShield size={16} className="mt-0.5 shrink-0" />
              Демонстрационный прототип: подписание и отправка — симуляции. ИИ не заменяет юриста. Используйте вымышленные данные.
            </div>
          </section>

          <section>
            <div className="card !rounded-3xl !p-6 sm:!p-8">
              <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-panel2 p-1">
                {([['login', 'Вход'], ['register', 'Регистрация']] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => switchMode(k)}
                    className={`rounded-lg py-2 text-sm font-medium transition ${mode === k ? 'bg-panel text-ink shadow-soft' : 'text-muted hover:text-ink'}`}>
                    {label}
                  </button>
                ))}
              </div>

              <h2 className="text-2xl font-semibold tracking-tight">{mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}</h2>
              <p className="mb-6 mt-1 text-[13px] text-muted">
                {mode === 'login' ? 'Войдите, чтобы вернуться к своим делам и документам.' : 'Аккаунт защищает ваши дела: каждый видит только свои обращения.'}
              </p>

              <form onSubmit={submit} className="space-y-4" noValidate>
                {mode === 'register' && (
                  <label className="block">
                    <span className="label">Имя</span>
                    <div className="relative">
                      <IconUser size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                      <input className="input pl-10" placeholder="Как к вам обращаться" autoComplete="name" value={f.name} onChange={set('name')} />
                    </div>
                  </label>
                )}
                <label className="block">
                  <span className="label">E-mail</span>
                  <div className="relative">
                    <IconMail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input className="input pl-10" type="email" inputMode="email" placeholder="you@example.com" autoComplete="email"
                      value={f.email} onChange={set('email')} />
                  </div>
                </label>
                <label className="block">
                  <span className="label">Пароль</span>
                  <div className="relative">
                    <IconLock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input className="input px-10" type={show ? 'text' : 'password'} placeholder={mode === 'register' ? 'Не менее 6 символов' : 'Ваш пароль'}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')} />
                    <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted transition hover:bg-panel2 hover:text-ink">
                      {show ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                    </button>
                  </div>
                  {mode === 'register' && f.password.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex flex-1 gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <span key={i} className="h-1 flex-1 rounded-full transition"
                            style={{ background: i <= strength ? 'var(--brand)' : 'var(--panel-3)' }} />
                        ))}
                      </div>
                      <span className="w-20 text-right text-[11px] text-muted">{STRENGTH_LABEL[strength]}</span>
                    </div>
                  )}
                </label>
                {mode === 'register' && (
                  <label className="block">
                    <span className="label">Повторите пароль</span>
                    <div className="relative">
                      <IconLock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                      <input className="input pl-10" type={show ? 'text' : 'password'} placeholder="Ещё раз" autoComplete="new-password"
                        value={f.confirm} onChange={set('confirm')} />
                    </div>
                  </label>
                )}

                {err && (
                  <div className="flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[13px]"
                    style={{ background: 'var(--err-soft)', borderColor: 'var(--err)', color: 'var(--err)' }}>
                    <IconAlert size={16} className="mt-0.5 shrink-0" /><span>{err}</span>
                  </div>
                )}

                <button className="btn-primary w-full !py-3" disabled={busy || demoBusy}>
                  {busy ? <span className="spinner h-4 w-4" /> : <IconLock size={16} />}
                  {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted">
                <span className="h-px flex-1 bg-line" /> или <span className="h-px flex-1 bg-line" />
              </div>

              <button type="button" className="btn-ghost w-full" onClick={demo} disabled={demoBusy || busy}>
                {demoBusy ? <span className="spinner h-4 w-4" /> : <IconSparkles size={16} />}
                Войти в демо-аккаунт
              </button>
              <p className="mt-2.5 text-center text-[11px] text-muted">demo@example.com · demo12345 · тестовые данные</p>
            </div>

            <p className="mt-5 px-2 text-center text-[11px] leading-relaxed text-muted">
              Продолжая, вы соглашаетесь с тем, что это демонстрационный сервис.<br />Подпись и отправка не имеют юридической силы.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
