import { createContext, useContext } from 'react'
export const AppCtx = createContext<{ user: any; convs: any[]; reload: () => Promise<void>; logout: () => void }>({ user: null, convs: [], reload: async () => {}, logout: () => {} })
export const useApp = () => useContext(AppCtx)
