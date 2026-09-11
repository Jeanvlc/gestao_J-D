// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { 
  AlertCircle, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { format, isBefore, isToday, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
}

export default function Dashboard() {
  const [obrigacoes, setObrigacoes] = useState<Obrigacao[]>([])
  const [stats, setStats] = useState<Stats>({
    atrasadas: 0,
    vencendoHoje: 0,
    vencendoSemana: 0,
    pendentes: 0
  })
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState<string>('todos')

  useEffect(() => {
    carregarObrigacoes()
  }, [])

  const carregarObrigacoes = async () => {
    try {
      const userId = localStorage.getItem('userId') || ''
      const response = await fetch('/api/obrigacoes', {
        headers: {
          'x-user-id': userId
        }
      })
      
      const dados = await response.json()
      setObrigacoes(Array.isArray(dados) ? dados : [])
      calcularStats(dados)
    } catch (error) {
      console.error('Erro ao carregar obrigações:', error)
    } finally {
      setCarregando(false)
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

    obrig.forEach(o => {
      const vencimento = new Date(o.vencimento)
      
      if (o.status === 'pendente' || o.status === 'em_andamento') {
        pendentes++
      }

      if (isBefore(vencimento, hoje) && o.status !== 'concluida') {
        atrasadas++
      } else if (isToday(vencimento)) {
        vencendoHoje++
      } else if (isBefore(vencimento, semanaProxima) && !isToday(vencimento)) {
        vencendoSemana++
      }
    })

    setStats({ atrasadas, vencendoHoje, vencendoSemana, pendentes })
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
      case 'em_andamento': return 'text-blue-600'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-slate-400">Gestão de Obrigações - MacContab</p>
          </div>
          <Link 
            href="/obrigacoes/novo"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Plus className="w-5 h-5" />
            Nova Obrigação
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
            cor="bg-blue-500"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {['todos', 'pendentes', 'concluidas', 'atrasadas'].map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filtro === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Lista de Obrigações */}
        <div className="space-y-4">
          {obrigacoesFiltradas.length === 0 ? (
            <div className="bg-slate-700 rounded-lg p-8 text-center">
              <p className="text-slate-300 text-lg">Nenhuma obrigação encontrada</p>
            </div>
          ) : (
            obrigacoesFiltradas.map(obrig => (
              <Link
                key={obrig.id}
                href={`/obrigacoes/${obrig.id}`}
                className="bg-slate-700 hover:bg-slate-600 rounded-lg p-6 transition cursor-pointer border border-slate-600"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{obrig.titulo}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getCorStatus(obrig.status)}`}>
                        {obrig.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap mb-3">
                      {obrig.tags?.map((tag, idx) => (
                        <span key={idx} className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
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
    </div>
  )
}

function StatCard({ icon, titulo, valor, cor, clicavel }: any) {
  return (
    <div 
      onClick={clicavel}
      className="bg-slate-700 rounded-lg p-6 cursor-pointer hover:bg-slate-600 transition border border-slate-600"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm mb-2">{titulo}</p>
          <p className="text-4xl font-bold text-white">{valor}</p>
        </div>
        <div className={`${cor} p-4 rounded-lg text-white`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
