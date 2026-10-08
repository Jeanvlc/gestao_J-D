'use client'
// App do campo. Uma página só (abas em estado) para o service worker precisar guardar uma única tela.
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, gravarPerfil, lerPerfil, type EstadoSync, type Perfil } from '@/lib/db'
import { sincronizar } from '@/lib/sync'
import { fmtHora } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { Abastecer, Historico, Tanque, sb } from './telas'
import { IconeBomba, IconeLista, IconeTanque } from './icones'

const ABAS = {
  abastecer: { rotulo: 'Abastecer', Icone: IconeBomba },
  tanque: { rotulo: 'Tanque', Icone: IconeTanque },
  historico: { rotulo: 'Hoje', Icone: IconeLista },
} as const

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
    if (pend > 0) return alert(`Há ${pend} lançamento(s) aguardando envio. Envie antes de sair.`)
    await createClient().auth.signOut().catch(() => {})
    gravarPerfil(null)
    location.href = '/login'
  }

  if (!perfil) return null
  return (
    <div className="mx-auto min-h-screen max-w-lg pb-28">
      <header className="sticky top-0 z-20">
        <div className="flex items-center justify-between bg-mata px-4 py-2.5 text-white">
          <div>
            <div className="font-display text-lg font-bold leading-none">V. A. Ribas</div>
            <div className="text-[13px] text-white/70">{perfil.nome}</div>
          </div>
          <div className="flex gap-1 text-[15px] font-semibold">
            {perfil.papel === 'admin' && <a href="/admin" className="rounded-lg px-3 py-2 active:bg-mata-escuro">Painel</a>}
            <button onClick={sair} className="rounded-lg px-3 py-2 active:bg-mata-escuro">Sair</button>
          </div>
        </div>
        <Faixa />
      </header>
      <main className="px-4 pt-5">
        {aba === 'abastecer' && <Abastecer perfil={perfil} />}
        {aba === 'tanque' && <Tanque perfil={perfil} />}
        {aba === 'historico' && <Historico perfil={perfil} />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-lg border-t border-tinta/10 bg-white pb-[env(safe-area-inset-bottom)]">
        {Object.entries(ABAS).map(([k, { rotulo, Icone }]) => (
          <button key={k} onClick={() => setAba(k as keyof typeof ABAS)} aria-current={aba === k ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 pb-2.5 pt-3 text-[15px] font-semibold ${aba === k ? 'text-mata' : 'text-tinta/45'}`}>
            <span className={`rounded-full px-5 py-1 ${aba === k ? 'bg-mata-claro' : ''}`}><Icone /></span>
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
  const detalhe = s?.enviando ? 'Enviando…' : s?.erro ? s.erro : s?.ultimo ? `Último envio às ${fmtHora(s.ultimo)}` : ''
  return (
    <div className={`flex items-center gap-3 px-4 py-2 ${pendentes ? 'bg-diesel-claro' : 'bg-mata-claro'}`}>
      <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${pendentes ? 'bg-diesel' : 'bg-mata'}`} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="font-semibold">
          {pendentes ? `${pendentes} ${pendentes > 1 ? 'lançamentos aguardando' : 'lançamento aguardando'} envio` : 'Tudo enviado'}
        </div>
        {detalhe && <div className="truncate text-[13px] text-tinta/65">{detalhe}</div>}
      </div>
      <button className="rounded-lg border-2 border-tinta/15 bg-white px-3 py-1.5 text-[15px] font-semibold disabled:opacity-50"
        disabled={s?.enviando} onClick={() => sincronizar(sb())}>Enviar</button>
    </div>
  )
}
