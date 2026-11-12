export const tokenStore = {
  get: () => localStorage.getItem('token'),
  set: (t: string) => localStorage.setItem('token', t),
  clear: () => localStorage.removeItem('token'),
}

function errText(detail: any): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return 'Проверьте правильность заполнения полей.'
  return 'Неизвестная ошибка'
}

export async function api<T = any>(path: string, opts: { method?: string; body?: any; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const t = tokenStore.get()
  if (t) headers['Authorization'] = 'Bearer ' + t
  let body: any
  if (opts.form) body = opts.form
  else if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.body) }
  let r: Response
  try {
    r = await fetch('/api' + path, { method: opts.method || (body ? 'POST' : 'GET'), headers, body })
  } catch {
    throw new Error('Нет связи с сервером. Проверьте, что приложение запущено.')
  }
  if (r.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
    tokenStore.clear(); window.location.href = '/login'; throw new Error('Требуется вход')
  }
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(errText(data.detail))
  return data
}

export async function download(path: string, filename: string) {
  const r = await fetch('/api' + path, { headers: { Authorization: 'Bearer ' + tokenStore.get() } })
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(errText(d.detail) || 'Не удалось скачать файл') }
  const url = URL.createObjectURL(await r.blob())
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
}

export const fmtDT = (s?: string) => {
  if (!s) return ''
  const d = new Date(s.replace(' ', 'T') + 'Z')
  return d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
}
