import { createContext, useContext, useEffect, useState } from 'react'
import { IconMoon, IconSun } from './icons'

type Theme = 'light' | 'dark'
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: 'dark', setTheme: () => {} })

export function ThemeProvider({ children }: { children: any }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch {}
    return 'dark'
  })
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])
  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const next = theme === 'dark' ? 'светлую' : 'тёмную'
  return (
    <button type="button" className={`btn-subtle !px-2.5 !py-2 ${className}`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={`Переключить на ${next} тему`} aria-label={`Переключить на ${next} тему`}>
      {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  )
}
