// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle,
  Clock,
  Plus,
  Sparkles,
  Wallet,
  Users,
  ListChecks,
} from 'lucide-react'
import Link from 'next/link'
import { format, isBefore, isToday, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AppShell from '@/components/AppShell'
import { REGIME_LABELS } from '@/lib/regimes'

interface DashboardExtra {
  competencia: string
  clientesPorRegime: Record<string, number>
  totalClientesAtivos: number
  financeiro: {
    honorariosAReceber: number
    honorariosRecebidos: number
    entradas: number
    saidas: number
  }
  tarefas: {
    totalPendentes: number
    totalAtrasadas: number
    societariasEmAndamento: { clienteNome: string | null; etapaAtual: string | null; tarefaId: string }[]
  }
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Obrigacao {
  id: string
  titulo: string
  vencimento: string
  status: string
  prioridade: string
  tags: string[]
}

interface Stats {
  atrasadas: number
  vencendoHoje: number
  vencendoSemana: number
  pendentes: number
  concluidasNoMes: number
}

export default function Dashboard() {
  const [obrigacoes, setObrigacoes] = useState<Obrigacao[]>([])
  const [stats, setStats] = useState<Stats>({
    atrasadas: 0,
    vencendoHoje: 0,
    vencendoSemana: 0,
    pendentes: 0,
    concluidasNoMes: 0,
  })
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState<string>('todos')
  const [gerando, setGerando] = useState(false)
  const [mensagemGeracao, setMensagemGeracao] = useState('')
  const [extra, setExtra] = useState<DashboardExtra | null>(null)

  useEffect(() => {
    carregarObrigacoes()
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(dados => setExtra(dados))
      .catch(err => console.error('Erro ao carregar estatísticas do dashboard:', err))
  }, [])

  const carregarObrigacoes = async () => {
    try {
      const response = await fetch('/api/obrigacoes')
      
      const dados = await response.json()
      setObrigacoes(Array.isArray(dados) ? dados : [])
      calcularStats(dados)
    } catch (error) {
      console.error('Erro ao carregar obrigações:', error)
    } finally {
      setCarregando(false)
    }
  }

  const gerarObrigacoesDoMes = async () => {
    setGerando(true)
    setMensagemGeracao('')
    try {
      const response = await fetch('/api/obrigacoes/gerar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const resultado = await response.json()
      if (!response.ok) throw new Error(resultado.error || 'Erro ao gerar')

      setMensagemGeracao(`${resultado.criadas} obrigação(ões) gerada(s) para ${resultado.competencia}.`)
      carregarObrigacoes()
    } catch (error) {
      console.error('Erro ao gerar obrigações:', error)
      setMensagemGeracao('Não foi possível gerar as obrigações do mês.')
    } finally {
      setGerando(false)
    }
  }

  const calcularStats = (obrig: Obrigacao[]) => {
    const agora = new Date()
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
    const semanaProxima = addDays(hoje, 7)

    let atrasadas = 0
    let vencendoHoje = 0
    let vencendoSemana = 0
    let pendentes = 0
    let concluidasNoMes = 0

    obrig.forEach(o => {
      const vencimento = new Date(o.vencimento)

      if (o.status === 'pendente' || o.status === 'em_andamento') {
        pendentes++
      }

      if (
        o.status === 'concluida' &&
        vencimento.getMonth() === agora.getMonth() &&
        vencimento.getFullYear() === agora.getFullYear()
      ) {
        concluidasNoMes++
      }

      if (isBefore(vencimento, hoje) && o.status !== 'concluida') {
        atrasadas++
      } else if (isToday(vencimento)) {
        vencendoHoje++
      } else if (isBefore(vencimento, semanaProxima) && !isToday(vencimento)) {
        vencendoSemana++
      }
    })

    setStats({ atrasadas, vencendoHoje, vencendoSemana, pendentes, concluidasNoMes })
  }

  const obrigacoesFiltradas = obrigacoes.filter(o => {
    if (filtro === 'atrasadas') {
      const vencimento = new Date(o.vencimento)
      const hoje = new Date()
      return isBefore(vencimento, hoje) && o.status !== 'concluida'
    }
    if (filtro === 'pendentes') return o.status === 'pendente'
    if (filtro === 'concluidas') return o.status === 'concluida'
    return true
  })

  const getCorPriori = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'bg-red-100 text-red-800'
      case 'normal': return 'bg-yellow-100 text-yellow-800'
      case 'baixa': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCorStatus = (status: string) => {
    switch (status) {
      case 'concluida': return 'text-green-600'
      case 'pendente': return 'text-red-600'
      case 'em_andamento': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl font-bold">Carregando...</div>
      </div>
    )
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
            <p className="text-slate-500">Gestão de Obrigações - MacContab</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/obrigacoes/calendario"
              className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 px-4 py-3 rounded-lg font-semibold transition border border-green-200"
            >
              <CalendarDays className="w-5 h-5" />
              Calendário
            </Link>
            <button
              onClick={gerarObrigacoesDoMes}
              disabled={gerando}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-semibold transition"
            >
              <Sparkles className="w-5 h-5" />
              {gerando ? 'Gerando...' : 'Gerar Obrigações do Mês'}
            </button>
            <Link
              href="/obrigacoes/novo"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              <Plus className="w-5 h-5" />
              Nova Obrigação
            </Link>
          </div>
        </div>

        {mensagemGeracao ? (
          <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-lg mb-8">
            {mensagemGeracao}
          </div>
        ) : (
          <div className="mb-4" />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <StatCard
            icon={<AlertCircle className="w-6 h-6" />}
            titulo="Atrasadas"
            valor={stats.atrasadas}
            cor="bg-red-500"
            clicavel={() => setFiltro('atrasadas')}
          />
          <StatCard
            icon={<Calendar className="w-6 h-6" />}
            titulo="Vencendo Hoje"
            valor={stats.vencendoHoje}
            cor="bg-orange-500"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            titulo="Próximos 7 Dias"
            valor={stats.vencendoSemana}
            cor="bg-yellow-500"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            titulo="Pendentes"
            valor={stats.pendentes}
            cor="bg-green-500"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            titulo="Concluídas no Mês"
            valor={stats.concluidasNoMes}
            cor="bg-blue-500"
            clicavel={() => setFiltro('concluidas')}
          />
        </div>

        {extra && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5 text-green-700" />
                <h2 className="text-slate-900 font-bold">Financeiro do Mês</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Honorários recebidos</span>
                  <span className="text-green-700 font-semibold">{formatarMoeda(extra.financeiro.honorariosRecebidos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Honorários a receber</span>
                  <span className="text-amber-700 font-semibold">{formatarMoeda(extra.financeiro.honorariosAReceber)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Entradas do escritório</span>
                  <span className="text-green-700 font-semibold">{formatarMoeda(extra.financeiro.entradas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Saídas do escritório</span>
                  <span className="text-red-700 font-semibold">{formatarMoeda(extra.financeiro.saidas)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-green-700" />
                <h2 className="text-slate-900 font-bold">Clientes por Regime</h2>
              </div>
              <div className="space-y-2">
                {Object.entries(extra.clientesPorRegime).map(([regime, qtd]) => {
                  const pct = extra.totalClientesAtivos > 0 ? Math.round((qtd / extra.totalClientesAtivos) * 100) : 0
                  return (
                    <div key={regime}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{REGIME_LABELS[regime] ?? regime}</span>
                        <span className="text-slate-500">{qtd}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                {Object.keys(extra.clientesPorRegime).length === 0 && (
                  <p className="text-slate-500 text-sm">Nenhum cliente ativo.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="w-5 h-5 text-green-700" />
                <h2 className="text-slate-900 font-bold">Tarefas em Andamento</h2>
              </div>
              <div className="flex gap-4 text-sm mb-3">
                <span className="text-slate-600">
                  Pendentes: <strong>{extra.tarefas.totalPendentes}</strong>
                </span>
                <span className="text-red-600">
                  Atrasadas: <strong>{extra.tarefas.totalAtrasadas}</strong>
                </span>
              </div>
              {extra.tarefas.societariasEmAndamento.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-slate-500 text-xs font-semibold uppercase">Aberturas de empresa em curso</p>
                  {extra.tarefas.societariasEmAndamento.map(g => (
                    <Link
                      key={g.tarefaId}
                      href={`/tarefas/${g.tarefaId}`}
                      className="block text-sm hover:text-green-700 transition"
                    >
                      <span className="font-semibold text-slate-800">{g.clienteNome ?? 'Cliente'}</span>
                      <span className="text-slate-500"> · {g.etapaAtual}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {['todos', 'pendentes', 'concluidas', 'atrasadas'].map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filtro === f
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Lista de Obrigações */}
        <div className="space-y-4">
          {obrigacoesFiltradas.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center border border-green-100 shadow-sm">
              <p className="text-slate-600 text-lg">Nenhuma obrigação encontrada</p>
            </div>
          ) : (
            obrigacoesFiltradas.map(obrig => (
              <Link
                key={obrig.id}
                href={`/obrigacoes/${obrig.id}`}
                className="bg-white hover:bg-green-50 rounded-lg p-6 transition cursor-pointer border border-green-100 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-slate-900">{obrig.titulo}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getCorStatus(obrig.status)}`}>
                        {obrig.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap mb-3">
                      {obrig.tags?.map((tag, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(obrig.vencimento), 'dd MMM yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${getCorPriori(obrig.prioridade)}`}>
                    {obrig.prioridade.toUpperCase()}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}

function StatCard({ icon, titulo, valor, cor, clicavel }: any) {
  return (
    <div 
      onClick={clicavel}
      className="bg-white rounded-lg p-6 cursor-pointer hover:bg-green-50 transition border border-green-100 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm mb-2">{titulo}</p>
          <p className="text-4xl font-bold text-slate-900">{valor}</p>
        </div>
        <div className={`${cor} p-4 rounded-lg text-white`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
