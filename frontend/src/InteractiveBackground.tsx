import { useEffect, useRef } from 'react'

type Pt = { x: number; y: number; vx: number; vy: number; r: number }
const FALLBACK: [number, number, number] = [143, 125, 255]
const LINK = 128
const REACH = 150

function parseColor(v: string): [number, number, number] {
  const s = (v || '').trim()
  const hex = s.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const rgb = s.match(/rgba?\(([^)]+)\)/i)
  if (rgb) {
    const p = rgb[1].split(',').map(x => parseFloat(x))
    if (p.length >= 3 && p.every(x => Number.isFinite(x))) return [p[0], p[1], p[2]]
  }
  return FALLBACK
}

/** Живой фон: точки связываются линиями и раздвигаются от курсора. */
export default function InteractiveBackground() {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let w = 0, h = 0, raf = 0
    let pts: Pt[] = []
    let color: [number, number, number] = FALLBACK
    const mouse = { x: -1e4, y: -1e4, on: false }

    const readTheme = () => {
      const cs = getComputedStyle(document.documentElement)
      color = parseColor(cs.getPropertyValue('--brand-ink') || '')
    }

    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      if (!w || !h) return
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.min(92, Math.max(26, Math.round((w * h) / 23000)))
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.26, vy: (Math.random() - 0.5) * 0.26,
        r: 1 + Math.random() * 1.5,
      }))
    }

    const frame = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of pts) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < -24) p.x = w + 24
        if (p.x > w + 24) p.x = -24
        if (p.y < -24) p.y = h + 24
        if (p.y > h + 24) p.y = -24
      }
      const pos = pts.map(p => {
        let x = p.x, y = p.y
        if (mouse.on) {
          const dx = x - mouse.x, dy = y - mouse.y
          const d = Math.hypot(dx, dy)
          if (d < REACH && d > 0.001) {
            const k = (1 - d / REACH) ** 2 * 52
            x += (dx / d) * k
            y += (dy / d) * k
          }
        }
        return { x, y, r: p.r }
      })
      ctx.lineWidth = 1
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          const a = pos[i], b = pos[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < LINK) {
            ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${(1 - d / LINK) * 0.16})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      for (const p of pos) {
        const near = mouse.on && Math.hypot(p.x - mouse.x, p.y - mouse.y) < REACH
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${near ? 0.6 : 0.26})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      if (!reduce) raf = requestAnimationFrame(frame)
    }

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
      mouse.on = mouse.x >= 0 && mouse.y >= 0 && mouse.x <= r.width && mouse.y <= r.height
    }
    const onLeave = () => { mouse.on = false }
    const onResize = () => { resize(); if (reduce) frame() }

    readTheme()
    resize()
    frame()

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', onResize)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null
    ro?.observe(canvas)
    const mo = new MutationObserver(readTheme)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
      mo.disconnect()
    }
  }, [])

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
}
