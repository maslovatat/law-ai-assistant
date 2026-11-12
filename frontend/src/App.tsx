import { useCallback, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import { api, tokenStore } from './api'
import { AppCtx, useApp } from './ctx'
import { ThemeToggle } from './theme'
import {
  IconChat, IconFile, IconFolder, IconLogOut, IconMail, IconMenu, IconPlus, IconScale, IconSettings, IconX,
} from './icons'
import Login from './pages/Login'
import Home from './pages/Home'
import Chat from './pages/Chat'
import { Cases, CaseDetail } from './pages/Cases'
import { Documents, DocumentPage } from './pages/Documents'
import { Sign, Send } from './pages/Dispatch'
import { Dispatches, DispatchDetail } from './pages/Dispatches'
import Settings from './pages/Settings'

const initials = (name?: string) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, convs, logout } = useApp()
  const nav = useNavigate()
  const loc = useLocation()
  const [creating, setCreating] = useState(false)
  const newChat = async () => {
    if (creating) return
    setCreating(true)
    try {
      const c = await api('/conversations', { body: {} })
      onClose(); nav(`/chat/${c.conversation.id}`)
    } catch {} finally { setCreating(false) }
  }
  const links = [
    { to: '/cases', label: 'Мои дела', icon: IconFolder },
    { to: '/documents', label: 'Документы', icon: IconFile },
    { to: '/dispatches', label: 'Отправления', icon: IconMail },
    { to: '/settings', label: 'Настройки', icon: IconSettings },
  ]
  return (
    <>
      <div onClick={onClose} aria-hidden
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[276px] shrink-0 flex-col border-r border-line bg-sidebar px-3 py-3 transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-3 flex items-center justify-between px-1">
          <NavLink to="/" onClick={onClose} className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ backgroundImage: 'linear-gradient(135deg, var(--brand), var(--brand-2))', boxShadow: '0 10px 22px -12px var(--brand)' }}><IconScale size={19} /></span>
            <span className="text-[15px] font-semibold tracking-tight">Legal Assistant</span>
          </NavLink>
          <button className="btn-subtle !p-2 lg:hidden" onClick={onClose} aria-label="Закрыть меню"><IconX size={18} /></button>
        </div>

        <button className="btn-primary mb-3 w-full" onClick={newChat} disabled={creating}>
          {creating ? <span className="spinner h-4 w-4" /> : <IconPlus size={18} />} Новое обращение
        </button>

        <nav className="space-y-0.5">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
              <l.icon size={17} /><span>{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mb-1.5 mt-5 flex items-center justify-between px-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Диалоги</span>
          <span className="text-[11px] text-muted">{convs.length}</span>
        </div>
        <div className="scroll-thin min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
          {convs.map((c: any) => (
            <NavLink key={c.id} to={`/chat/${c.id}`} onClick={onClose} title={c.title}
              className={() => `flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] transition ${loc.pathname === `/chat/${c.id}` ? 'bg-panel2 text-ink' : 'text-ink2 hover:bg-panel2 hover:text-ink'}`}>
              <IconChat size={15} className="shrink-0 opacity-50" />
              <span className="truncate">{c.title}</span>
            </NavLink>
          ))}
          {convs.length === 0 && <div className="px-3 py-2 text-xs text-muted">Пока нет диалогов</div>}
        </div>

        <div className="mt-2 border-t border-line pt-2">
          <div className="flex items-center gap-2 rounded-xl px-1.5 py-1.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-panel2 text-[11px] font-semibold text-ink2">{initials(user?.name)}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{user?.name}</div>
              <div className="truncate text-[11px] text-muted">{user?.email}</div>
            </div>
            <ThemeToggle />
            <button className="btn-subtle !p-2" onClick={logout} title="Выйти" aria-label="Выйти"><IconLogOut size={17} /></button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [convs, setConvs] = useState<any[]>([])
  const [ready, setReady] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const reload = useCallback(async () => { try { setConvs(await api('/conversations')) } catch {} }, [])
  useEffect(() => {
    if (!tokenStore.get()) { setReady(true); return }
    api('/auth/me').then(u => { setUser(u); return reload() }).catch(() => tokenStore.clear()).finally(() => setReady(true))
  }, [])
  const logout = async () => { try { await api('/auth/logout', { method: 'POST' }) } catch {} tokenStore.clear(); setUser(null); setConvs([]); nav('/login') }
  const onLogin = async (u: any) => { setUser(u); await reload(); nav('/') }

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas">
        <div className="flex items-center gap-3 text-sm text-muted"><span className="spinner h-4 w-4" /> Загрузка…</div>
      </div>
    )
  }
  if (!user) return loc.pathname === '/login' ? <Login onLogin={onLogin} /> : <Navigate to="/login" replace />

  return (
    <AppCtx.Provider value={{ user, convs, reload, logout }}>
      <div className="flex h-dvh overflow-hidden bg-canvas">
        <Sidebar open={drawer} onClose={() => setDrawer(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass flex items-center gap-2 border-b border-line px-3 py-2 lg:hidden">
            <button className="btn-subtle !p-2" onClick={() => setDrawer(true)} aria-label="Открыть меню"><IconMenu size={20} /></button>
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="grid h-6 w-6 place-items-center rounded-lg text-white" style={{ backgroundImage: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}><IconScale size={13} /></span>
              Legal Assistant
            </span>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/chat/:id" element={<Chat />} />
              <Route path="/cases" element={<Cases />} />
              <Route path="/cases/:id" element={<CaseDetail />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/documents/:id" element={<DocumentPage />} />
              <Route path="/documents/:id/sign" element={<Sign />} />
              <Route path="/documents/:id/send" element={<Send />} />
              <Route path="/dispatches" element={<Dispatches />} />
              <Route path="/dispatches/:id" element={<DispatchDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </AppCtx.Provider>
  )
}
