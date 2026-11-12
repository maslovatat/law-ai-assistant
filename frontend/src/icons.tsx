type IconProps = { size?: number; className?: string }

function Svg({ size = 18, className, children }: IconProps & { children: any }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>
  )
}

export const IconScale = (p: IconProps) => <Svg {...p}><path d="M12 3v18M7.5 21h9M4 7h16M6.5 7 3 14h7L6.5 7Zm11 0L14 14h7l-3.5-7Z" /></Svg>
export const IconPlus = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
export const IconChat = (p: IconProps) => <Svg {...p}><path d="M21 12a8 8 0 0 1-8 8H8l-4 3v-6.5A8 8 0 0 1 12 4h1a8 8 0 0 1 8 8Z" /></Svg>
export const IconFolder = (p: IconProps) => <Svg {...p}><path d="M3 7.5A2 2 0 0 1 5 5.5h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></Svg>
export const IconFile = (p: IconProps) => <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></Svg>
export const IconMail = (p: IconProps) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></Svg>
export const IconSettings = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.7 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.7h.09A1.7 1.7 0 0 0 10.12 3.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.15 4.7h.09a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.6 9v.09a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" /></Svg>
export const IconSun = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>
export const IconMoon = (p: IconProps) => <Svg {...p}><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></Svg>
export const IconMenu = (p: IconProps) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>
export const IconX = (p: IconProps) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
export const IconArrowUp = (p: IconProps) => <Svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>
export const IconArrowLeft = (p: IconProps) => <Svg {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></Svg>
export const IconPaperclip = (p: IconProps) => <Svg {...p}><path d="M20.4 11.6 12 20a5 5 0 0 1-7-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" /></Svg>
export const IconLogOut = (p: IconProps) => <Svg {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" /></Svg>
export const IconLock = (p: IconProps) => <Svg {...p}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></Svg>
export const IconUser = (p: IconProps) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>
export const IconEye = (p: IconProps) => <Svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></Svg>
export const IconEyeOff = (p: IconProps) => <Svg {...p}><path d="M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.4 3.4M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.2-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Svg>
export const IconCheck = (p: IconProps) => <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>
export const IconSparkles = (p: IconProps) => <Svg {...p}><path d="M12 3l1.8 4.9L19 9.7l-4.2 3 1.3 5.2L12 15l-4.1 2.9 1.3-5.2-4.2-3 5.2-1.8L12 3Z" /></Svg>
export const IconDownload = (p: IconProps) => <Svg {...p}><path d="M12 3v12M7 11l5 5 5-5M4 21h16" /></Svg>
export const IconChevronRight = (p: IconProps) => <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>
export const IconAlert = (p: IconProps) => <Svg {...p}><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></Svg>
export const IconShield = (p: IconProps) => <Svg {...p}><path d="M12 3l8 3v6c0 4.4-3.2 7.9-8 9-4.8-1.1-8-4.6-8-9V6Z" /><path d="m9 12 2 2 4-4" /></Svg>
export const IconTrash = (p: IconProps) => <Svg {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></Svg>
export const IconPencil = (p: IconProps) => <Svg {...p}><path d="M4 20h4L20 8l-4-4L4 16Z" /><path d="m14 6 4 4" /></Svg>
export const IconSearch = (p: IconProps) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
export const IconClock = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
export const IconSend = (p: IconProps) => <Svg {...p}><path d="m4 12 16-8-6 16-3-6-7-2Z" /></Svg>
export const IconKey = (p: IconProps) => <Svg {...p}><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l2 2M14 9l2 2" /></Svg>
export const IconCode = (p: IconProps) => <Svg {...p}><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13 4l-2 16" /></Svg>
export const IconCopy = (p: IconProps) => <Svg {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></Svg>
export const IconExternal = (p: IconProps) => <Svg {...p}><path d="M14 4h6v6M20 4l-8 8M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></Svg>
