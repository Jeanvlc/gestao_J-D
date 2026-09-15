// src/app/cadastro/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CadastroPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [cadastroFeito, setCadastroFeito] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password: senha })

    if (error) {
      setErro(error.message)
      setCarregando(false)
      return
    }

    if (!data.session) {
      // confirmação de e-mail obrigatória: ainda não há sessão
      setCadastroFeito(true)
      setCarregando(false)
      return
    }

    await fetch('/api/auth/perfil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    })

    router.push('/dashboard')
    router.refresh()
  }

  if (cadastroFeito) {
    return (
      <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
        <h1>Confirme seu e-mail</h1>
        <p>Enviamos um link de confirmação para {email}. Depois de confirmar, faça login normalmente.</p>
        <p style={{ marginTop: 12 }}>
          <Link href="/login">Ir para o login</Link>
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#15803d' }}>MacContab</h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>Criar conta</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={6}
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
        </div>
        {erro && <p style={{ color: 'red' }}>{erro}</p>}
        <button
          type="submit"
          disabled={carregando}
          style={{ padding: 8, width: '100%', background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
        >
          {carregando ? 'Criando...' : 'Criar conta'}
        </button>
      </form>
      <p style={{ marginTop: 12 }}>
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>
    </div>
  )
}
