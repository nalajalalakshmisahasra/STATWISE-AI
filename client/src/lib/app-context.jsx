import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from './api.js'
import { STRINGS, LANGUAGES } from '../locales/strings.js'

const Ctx = createContext(null)

export function AppProvider ({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = logged out
  const [lang, setLangState] = useState(() => localStorage.getItem('statwise.lang') || 'en')

  useEffect(() => {
    api.get('/api/auth/me')
      .then(d => setUser(d.user))
      .catch(() => setUser(null))
  }, [])

  const setLang = useCallback((code) => {
    if (!LANGUAGES.some(l => l.code === code)) return
    setLangState(code)
    localStorage.setItem('statwise.lang', code)
    document.documentElement.lang = code
    if (user) api.post('/api/auth/language', { language: code }).catch(() => {})
  }, [user])

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const t = useCallback((key, vars) => {
    let s = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v)
    }
    return s
  }, [lang])

  const login = useCallback((u) => setUser(u), [])
  const logout = useCallback(async () => {
    await api.post('/api/auth/logout', {}).catch(() => {})
    setUser(null)
  }, [])

  return (
    <Ctx.Provider value={{ user, setUser, login, logout, lang, setLang, t }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp () {
  return useContext(Ctx)
}
