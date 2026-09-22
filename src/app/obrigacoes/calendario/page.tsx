// src/app/obrigacoes/calendario/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, List } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AppShell from '@/components/AppShell'

interface Obrigacao {
  id: string
  titulo: string
  vencimento: string
  status: string
  cliente: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  atrasada: 'Atrasada',
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
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null)

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
    setDiaSelecionado(null)
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
                  onClick={() => dia !== null && setDiaSelecionado(dia)}
                  className={`min-h-[110px] border-b border-r border-green-50 p-2 ${dia === null ? 'bg-slate-50' : 'cursor-pointer hover:bg-green-50/50'} ${
                    dia !== null && dia === diaSelecionado ? 'bg-green-50 ring-1 ring-inset ring-green-300' : ''
                  }`}
                >
                  {dia !== null && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-semibold ${ehHoje(dia) ? 'text-green-700' : 'text-slate-700'}`}>
                          {dia}
                        </p>
                        {(obrigacoesPorDia.get(dia)?.length ?? 0) > 0 && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded-full">
                            {obrigacoesPorDia.get(dia)?.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {(obrigacoesPorDia.get(dia) ?? []).slice(0, 3).map(o => (
                          <Link
                            key={o.id}
                            href={`/obrigacoes/${o.id}`}
                            onClick={e => e.stopPropagation()}
                            className={`block truncate text-xs px-1.5 py-0.5 rounded border ${corDoDia(o)}`}
                            title={`${o.titulo}${o.cliente ? ' · ' + o.cliente : ''}`}
                          >
                            {o.cliente ? `${o.cliente} · ${o.titulo}` : o.titulo}
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

        <div className="flex gap-4 flex-wrap mt-4 text-xs text-slate-500">
          {Object.entries(STATUS_LABEL).map(([status, label]) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded border ${STATUS_COR[status]}`} />
              {label}
            </span>
          ))}
        </div>

        {diaSelecionado !== null && (
          <div className="bg-white rounded-lg border border-green-100 shadow-sm p-5 mt-4">
            <p className="text-slate-900 font-bold mb-3">
              {format(new Date(mesAtual.getFullYear(), mesAtual.getMonth(), diaSelecionado), "dd 'de' MMMM", { locale: ptBR })}
            </p>
            {(obrigacoesPorDia.get(diaSelecionado) ?? []).length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhuma obrigação neste dia.</p>
            ) : (
              <div className="space-y-2">
                {(obrigacoesPorDia.get(diaSelecionado) ?? []).map(o => (
                  <Link
                    key={o.id}
                    href={`/obrigacoes/${o.id}`}
                    className="flex items-center justify-between bg-slate-50 hover:bg-green-50 rounded-lg px-4 py-2 transition"
                  >
                    <div>
                      <p className="text-slate-900 font-semibold text-sm">{o.titulo}</p>
                      {o.cliente && <p className="text-slate-500 text-xs">{o.cliente}</p>}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${corDoDia(o)}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
