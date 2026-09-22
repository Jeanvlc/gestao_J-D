// src/app/obrigacoes/calendario/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, List } from 'lucide-react'
import AppShell from '@/components/AppShell'

interface Obrigacao {
  id: string
  titulo: string
  vencimento: string
  status: string
}

const STATUS_COR: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  em_andamento: 'bg-blue-100 text-blue-800 border-blue-200',
  concluida: 'bg-green-100 text-green-800 border-green-200',
  atrasada: 'bg-red-100 text-red-800 border-red-200',
}

function corDoDia(o: Obrigacao) {
  const vencimento = new Date(o.vencimento)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  if (o.status !== 'concluida' && vencimento < hoje) return STATUS_COR.atrasada
  return STATUS_COR[o.status] ?? STATUS_COR.pendente
}

export default function CalendarioObrigacoes() {
  const [obrigacoes, setObrigacoes] = useState<Obrigacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mesAtual, setMesAtual] = useState(() => {
    const hoje = new Date()
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  })

  useEffect(() => {
    fetch('/api/obrigacoes')
      .then(res => res.json())
      .then(dados => setObrigacoes(Array.isArray(dados) ? dados : []))
      .catch(err => console.error('Erro ao carregar obrigações:', err))
      .finally(() => setCarregando(false))
  }, [])

  const obrigacoesPorDia = useMemo(() => {
    const mapa = new Map<number, Obrigacao[]>()
    obrigacoes.forEach(o => {
      const data = new Date(o.vencimento)
      if (data.getFullYear() === mesAtual.getFullYear() && data.getMonth() === mesAtual.getMonth()) {
        const dia = data.getDate()
        if (!mapa.has(dia)) mapa.set(dia, [])
        mapa.get(dia)!.push(o)
      }
    })
    return mapa
  }, [obrigacoes, mesAtual])

  const diasNoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate()
  const primeiroDiaSemana = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1).getDay()
  const celulas = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ]

  const mudarMes = (delta: number) => {
    setMesAtual(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const hoje = new Date()
  const ehHoje = (dia: number) =>
    dia === hoje.getDate() && mesAtual.getMonth() === hoje.getMonth() && mesAtual.getFullYear() === hoje.getFullYear()

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-semibold transition border border-green-200"
          >
            <List className="w-4 h-4" />
            Lista
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-900 capitalize">
            {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => mudarMes(-1)}
              className="bg-white hover:bg-slate-100 border border-green-200 rounded-lg p-2 transition"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <button
              onClick={() => mudarMes(1)}
              className="bg-white hover:bg-slate-100 border border-green-200 rounded-lg p-2 transition"
            >
              <ChevronRight className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        </div>

        {carregando ? (
          <p className="text-slate-600">Carregando...</p>
        ) : (
          <div className="bg-white rounded-lg border border-green-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b border-green-100">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="p-2 text-center text-slate-500 text-xs font-bold uppercase">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {celulas.map((dia, idx) => (
                <div
                  key={idx}
                  className={`min-h-[110px] border-b border-r border-green-50 p-2 ${dia === null ? 'bg-slate-50' : ''}`}
                >
                  {dia !== null && (
                    <>
                      <p className={`text-sm font-semibold mb-1 ${ehHoje(dia) ? 'text-green-700' : 'text-slate-700'}`}>
                        {dia}
                      </p>
                      <div className="space-y-1">
                        {(obrigacoesPorDia.get(dia) ?? []).slice(0, 3).map(o => (
                          <Link
                            key={o.id}
                            href={`/obrigacoes/${o.id}`}
                            className={`block truncate text-xs px-1.5 py-0.5 rounded border ${corDoDia(o)}`}
                            title={o.titulo}
                          >
                            {o.titulo}
                          </Link>
                        ))}
                        {(obrigacoesPorDia.get(dia)?.length ?? 0) > 3 && (
                          <p className="text-xs text-slate-400">
                            +{(obrigacoesPorDia.get(dia)?.length ?? 0) - 3} mais
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
