'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { gravarPerfil } from '@/lib/db'
import { emailDoNome, PIN_VALIDO } from '@/lib/usuario'

export default function Login() {
  const [nome, setNome] = useState('')
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    // admin pode entrar com o e-mail real; os demais pelo nome
    const porEmail = nome.includes('@')
    if (!nome.trim() || !(porEmail ? pin.length >= 6 : PIN_VALIDO.test(pin))) return setErro('Digite seu nome e o PIN de 6 números.')
    if (!navigator.onLine) return setErro('O primeiro acesso precisa de internet')
    setEnviando(true)
    const sb = createClient()
    const { data, error } = await sb.auth.signInWithPassword({ email: porEmail ? nome.trim() : emailDoNome(nome), password: pin })
    if (error || !data.user) { setEnviando(false); return setErro('Nome ou PIN não conferem. Confira e tente de novo.') }
    const { data: perfil } = await sb.from('va_perfis').select('nome, papel, ativo').eq('user_id', data.user.id).maybeSingle()
    if (!perfil?.ativo) {
      await sb.auth.signOut()
      setEnviando(false)
      return setErro('Usuário sem acesso. Fale com o administrador.')
    }
    gravarPerfil({ id: data.user.id, nome: perfil.nome, papel: perfil.papel })
    location.href = perfil.papel === 'admin' ? '/admin' : '/'
  }

  return (
    <div className="flex min-h-screen flex-col bg-mata">
    <div className="mx-auto w-full max-w-sm px-6 pb-10 pt-16 text-white">
      <div className="font-display text-4xl font-bold leading-none">V. A. Ribas</div>
      <p className="mt-2 text-white/75">Preparo de solo e silvicultura</p>
    </div>
    <form onSubmit={entrar} className="mx-auto w-full max-w-sm flex-1 space-y-5 rounded-t-3xl bg-fundo p-6 pt-8 sm:flex-none sm:rounded-3xl">
      <label className="block">
        <span className="rotulo">Seu nome</span>
        <input className="campo" autoComplete="username" value={nome} onChange={(e) => setNome(e.target.value)} />
      </label>
      <label className="block">
        <span className="rotulo">PIN</span>
        <input className="campo num tracking-[0.3em]" type="password" inputMode={nome.includes('@') ? 'text' : 'numeric'}
          maxLength={nome.includes('@') ? undefined : 6} autoComplete="current-password"
          value={pin} onChange={(e) => setPin(nome.includes('@') ? e.target.value : e.target.value.replace(/\D/g, ''))} />
      </label>
      {erro && <p role="alert" className="rounded-xl bg-alerta-claro px-4 py-3 font-medium text-alerta">{erro}</p>}
      <button className="btn w-full" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
    </form>
    </div>
  )
}
