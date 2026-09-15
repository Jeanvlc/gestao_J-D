// src/app/honorarios/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Sparkles, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AppShell from '@/components/AppShell'

interface Honorario {
  id: string
  descricao: string | null
  valor: number
  diaVencimento: number
  ativo: boolean
  cliente: { id: string; nome: string }
}

interface Pagamento {
  id: string
  competencia: string
  valor: number
  vencimento: string
  status: string
  dataPagamento: string | null
  cliente: { id: string; nome: string }
}

function competenciaAtual() {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function HonorariosPage() {
  const [honorarios, setHonorarios] = useState<Honorario[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    carregarHonorarios()
  }, [])

  useEffect(() => {
    carregarPagamentos(competencia)
  }, [competencia])

  const carregarHonorarios = async () => {
    try {
      const res = await fetch('/api/honorarios')
      const dados = await res.json()
      setHonorarios(Array.isArray(dados) ? dados : [])
    } catch (error) {
      console.error('Erro ao carregar honorários:', error)
    }
  }

  const carregarPagamentos = async (comp: string) => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/pagamentos-honorarios?competencia=${comp}`)
      const dados = await res.json()
      setPagamentos(Array.isArray(dados) ? dados : [])
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error)
    } finally {
      setCarregando(false)
    }
  }

  const gerarCobrancas = async () => {
    setGerando(true)
    setMensagem('')
    try {
      const res = await fetch('/api/honorarios/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competencia }),
      })
      const resultado = await res.json()
      if (!res.ok) throw new Error(resultado.error || 'Erro ao gerar')
      setMensagem(`${resultado.criadas} cobrança(s) gerada(s) para ${resultado.competencia}.`)
      carregarPagamentos(competencia)
    } catch (error) {
      console.error(error)
      setMensagem('Não foi possível gerar as cobranças do mês.')
    } finally {
      setGerando(false)
    }
  }

  const marcarComoPago = async (id: string) => {
    try {
      const res = await fetch(`/api/pagamentos-honorarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pago' }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar')
      carregarPagamentos(competencia)
    } catch (error) {
      console.error(error)
    }
  }

  const desmarcarPago = async (id: string) => {
    try {
      const res = await fetch(`/api/pagamentos-honorarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pendente' }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar')
      carregarPagamentos(competencia)
    } catch (error) {
      console.error(error)
    }
  }

  const stats = useMemo(() => {
    const hoje = new Date()
    let total = 0
    let recebido = 0
    let pendente = 0
    let atrasado = 0

    pagamentos.forEach(p => {
      total += p.valor
      if (p.status === 'pago') {
        recebido += p.valor
      } else if (new Date(p.vencimento) < hoje) {
        atrasado += p.valor
      } else {
        pendente += p.valor
      }
    })

    return { total, recebido, pendente, atrasado }
  }, [pagamentos])

  const statusDaLinha = (p: Pagamento) => {
    if (p.status === 'pago') return 'pago'
    if (new Date(p.vencimento) < new Date()) return 'atrasado'
    return 'pendente'
  }

  const corStatus: Record<string, string> = {
    pago: 'bg-green-100 text-green-800',
    atrasado: 'bg-red-100 text-red-800',
    pendente: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Financeiro · Honorários</h1>
            <p className="text-slate-400 mt-1">Controle de honorários mensais e vencimentos.</p>
          </div>
          <Link
            href="/honorarios/novo"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Plus className="w-5 h-5" />
            Novo Contrato de Honorário
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Clock className="w-6 h-6" />} titulo="Total do Mês" valor={formatarMoeda(stats.total)} cor="bg-blue-500" />
          <StatCard icon={<CheckCircle className="w-6 h-6" />} titulo="Recebido" valor={formatarMoeda(stats.recebido)} cor="bg-green-500" />
          <StatCard icon={<Clock className="w-6 h-6" />} titulo="A Receber" valor={formatarMoeda(stats.pendente)} cor="bg-yellow-500" />
          <StatCard icon={<AlertCircle className="w-6 h-6" />} titulo="Atrasado" valor={formatarMoeda(stats.atrasado)} cor="bg-red-500" />
        </div>

        {/* Controle do mês */}
        <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 mb-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div>
              <label className="block text-slate-300 mb-2 font-semibold text-sm">Competência</label>
              <input
                type="month"
                value={competencia}
                onChange={e => setCompetencia(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={gerarCobrancas}
              disabled={gerando}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-semibold transition"
            >
              <Sparkles className="w-5 h-5" />
              {gerando ? 'Gerando...' : 'Gerar Cobranças do Mês'}
            </button>
          </div>

          {mensagem && (
            <div className="bg-purple-900/40 border border-purple-700 text-purple-200 px-4 py-3 rounded-lg mb-4">
              {mensagem}
            </div>
          )}

          {carregando ? (
            <p className="text-slate-300">Carregando...</p>
          ) : pagamentos.length === 0 ? (
            <p className="text-slate-300">Nenhuma cobrança gerada para essa competência ainda.</p>
          ) : (
            <div className="space-y-2">
              {pagamentos.map(p => {
                const status = statusDaLinha(p)
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-slate-800 rounded-lg p-4 border border-slate-600 flex-wrap gap-3"
                  >
                    <div>
                      <p className="text-white font-semibold">{p.cliente?.nome}</p>
                      <p className="text-slate-400 text-sm">
                        Vence em {format(new Date(p.vencimento), 'dd MMM yyyy', { locale: ptBR })}
                        {p.dataPagamento ? ` · Pago em ${format(new Date(p.dataPagamento), 'dd MMM yyyy', { locale: ptBR })}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold">{formatarMoeda(p.valor)}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${corStatus[status]}`}>
                        {status.toUpperCase()}
                      </span>
                      {status === 'pago' ? (
                        <button
                          onClick={() => desmarcarPago(p.id)}
                          className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg text-sm font-semibold transition"
                        >
                          Desfazer
                        </button>
                      ) : (
                        <button
                          onClick={() => marcarComoPago(p.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition"
                        >
                          Marcar como pago
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Contratos */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Contratos de Honorário</h2>
          {honorarios.length === 0 ? (
            <div className="bg-slate-700 rounded-lg p-8 text-center">
              <p className="text-slate-300 text-lg">Nenhum contrato de honorário cadastrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {honorarios.map(h => (
                <Link
                  key={h.id}
                  href={`/honorarios/${h.id}`}
                  className="flex items-center justify-between bg-slate-700 hover:bg-slate-600 rounded-lg p-5 transition border border-slate-600"
                >
                  <div>
                    <p className="text-white font-semibold text-lg">{h.cliente?.nome}</p>
                    <p className="text-slate-400 text-sm">
                      {formatarMoeda(h.valor)} · Vence todo dia {h.diaVencimento}
                      {h.descricao ? ` · ${h.descricao}` : ''}
                    </p>
                  </div>
                  {!h.ativo && (
                    <span className="bg-slate-600 text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                      INATIVO
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function StatCard({ icon, titulo, valor, cor }: any) {
  return (
    <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm mb-2">{titulo}</p>
          <p className="text-2xl font-bold text-white">{valor}</p>
        </div>
        <div className={`${cor} p-4 rounded-lg text-white`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
