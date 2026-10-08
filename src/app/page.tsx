'use client'
// App do campo. Uma página só (abas em estado) para o service worker precisar guardar uma única tela.
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, gravarPerfil, lerPerfil, type EstadoSync, type Perfil } from '@/lib/db'
import { sincronizar } from '@/lib/sync'
import { fmtHora } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { Abastecer, Historico, Tanque, sb } from './telas'

const ABAS = { abastecer: 'Abastecer', tanque: 'Tanque', historico: 'Histórico' } as const

export default function Campo() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [aba, setAba] = useState<keyof typeof ABAS>('abastecer')

  useEffect(() => {
    const p = lerPerfil()
    if (!p) { location.href = '/login'; return }
    setPerfil(p)
    const sync = () => sincronizar(sb())
    const aoVoltar = () => document.visibilityState === 'visible' && sync()
    sync()
    window.addEventListener('online', sync)
    document.addEventListener('visibilitychange', aoVoltar) // iPhone: app volta do segundo plano
    return () => {
      window.removeEventListener('online', sync)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [])

  async function sair() {
    const pend = await db.registros.where('status').equals('pendente').count()
    if (pend > 0) return alert(`Há ${pend} registro(s) não enviados. Envie antes de sair.`)
    await createClient().auth.signOut().catch(() => {})
    gravarPerfil(null)
    location.href = '/login'
  }

  if (!perfil) return null
  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      <Faixa />
      <header className="flex items-center justify-between px-4 py-2 text-sm text-gray-600">
        <span>{perfil.nome}</span>
        <span className="flex gap-4">
          {perfil.papel === 'admin' && <a href="/admin" className="underline">Painel</a>}
          <button onClick={sair} className="underline">Sair</button>
        </span>
      </header>
      <main className="px-4">
        {aba === 'abastecer' && <Abastecer perfil={perfil} />}
        {aba === 'tanque' && <Tanque perfil={perfil} />}
        {aba === 'historico' && <Historico perfil={perfil} />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-lg border-t bg-white">
        {Object.entries(ABAS).map(([k, rotulo]) => (
          <button key={k} onClick={() => setAba(k as keyof typeof ABAS)}
            className={`flex-1 py-5 text-lg font-semibold ${aba === k ? 'bg-green-50 text-green-800' : 'text-gray-500'}`}>
            {rotulo}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Faixa() {
  const pendentes = useLiveQuery(() => db.registros.where('status').equals('pendente').count(), [], 0)
  const s: EstadoSync | undefined = useLiveQuery(() => db.meta.get('sync'), [])?.valor
  const info = s?.enviando ? 'Enviando…' : s?.erro ? `Não enviou: ${s.erro}` : s?.ultimo ? `Último envio ${fmtHora(s.ultimo)}` : ''
  return (
    <div className={`sticky top-0 z-10 flex items-center gap-3 px-4 py-3 ${pendentes ? 'bg-amber-100' : 'bg-green-100'}`}>
      <div className="flex-1">
        <div className="font-semibold">
          {pendentes ? `${pendentes} registro${pendentes > 1 ? 's' : ''} pendente${pendentes > 1 ? 's' : ''}` : 'Tudo enviado'}
        </div>
        <div className="text-xs text-gray-700">{info}</div>
      </div>
      <button className="btn-2" disabled={s?.enviando} onClick={() => sincronizar(sb())}>Enviar agora</button>
    </div>
  )
}
