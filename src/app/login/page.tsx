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
    if (!nome.trim() || !(porEmail ? pin.length >= 6 : PIN_VALIDO.test(pin))) return setErro('Informe o nome e o PIN de 6 dígitos')
    if (!navigator.onLine) return setErro('O primeiro acesso precisa de internet')
    setEnviando(true)
    const sb = createClient()
    const { data, error } = await sb.auth.signInWithPassword({ email: porEmail ? nome.trim() : emailDoNome(nome), password: pin })
    if (error || !data.user) { setEnviando(false); return setErro('Nome ou PIN incorreto') }
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
    <form onSubmit={entrar} className="mx-auto max-w-sm space-y-4 p-6 pt-16">
      <h1 className="text-2xl font-bold text-green-800">V. A. Ribas</h1>
      <label className="block">
        <span className="rotulo">Nome (ou e-mail do admin)</span>
        <input className="campo" autoComplete="username" value={nome} onChange={(e) => setNome(e.target.value)} />
      </label>
      <label className="block">
        <span className="rotulo">PIN</span>
        <input className="campo tracking-widest" type="password" inputMode={nome.includes('@') ? 'text' : 'numeric'}
          maxLength={nome.includes('@') ? undefined : 6} autoComplete="current-password"
          value={pin} onChange={(e) => setPin(nome.includes('@') ? e.target.value : e.target.value.replace(/\D/g, ''))} />
      </label>
      {erro && <p className="rounded-lg bg-red-100 p-3 text-red-800">{erro}</p>}
      <button className="btn w-full" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
    </form>
  )
}
