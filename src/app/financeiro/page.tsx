// src/app/financeiro/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AppShell from '@/components/AppShell'

interface Lancamento {
  id: string
  tipo: 'entrada' | 'saida'
  categoria: string
  descricao: string | null
  valor: number
  data: string
  competencia: string
  origem: string | null
  cliente: { id: string; nome: string } | null
}

function competenciaInicioPadrao() {
  const agora = new Date()
  return `${agora.getFullYear()}-01`
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function FinanceiroPage() {
  const [competenciaInicio, setCompetenciaInicio] = useState(competenciaInicioPadrao())
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    tipo: 'saida' as 'entrada' | 'saida',
    categoria: '',
    descricao: '',
    valor: '',
    data: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    carregar(competenciaInicio)
  }, [competenciaInicio])

  const carregar = async (comp: string) => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/financeiro?competenciaInicio=${comp}`)
      const dados = await res.json()
      setLancamentos(Array.isArray(dados) ? dados : [])
    } catch (error) {
      console.error('Erro ao carregar financeiro:', error)
    } finally {
      setCarregando(false)
    }
  }

  const adicionarLancamento = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    const valor = Number(form.valor)
    if (!form.categoria || !valor || valor <= 0 || !form.data) {
      setErro('Preencha categoria, valor e data.')
      return
    }

    try {
      const res = await fetch('/api/financeiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setForm({ tipo: 'saida', categoria: '', descricao: '', valor: '', data: new Date().toISOString().slice(0, 10) })
      carregar(competenciaInicio)
    } catch (error) {
      console.error(error)
      setErro('Não foi possível salvar o lançamento.')
    }
  }

  const excluirLancamento = async (id: string) => {
    if (!window.confirm('Excluir este lançamento?')) return
    try {
      const res = await fetch(`/api/financeiro/${id}`, { method: 'DELETE' })
      const resultado = await res.json()
      if (!res.ok) throw new Error(resultado.error || 'Erro ao excluir')
      carregar(competenciaInicio)
    } catch (error: any) {
      console.error(error)
      setErro(error.message || 'Não foi possível excluir.')
    }
  }

  const { totalEntradas, totalSaidas, resultado, fluxoPorMes } = useMemo(() => {
    let totalEntradas = 0
    let totalSaidas = 0
    const porMes = new Map<string, { entradas: number; saidas: number }>()

    for (const l of lancamentos) {
      const bucket = porMes.get(l.competencia) ?? { entradas: 0, saidas: 0 }
      if (l.tipo === 'entrada') {
        totalEntradas += l.valor
        bucket.entradas += l.valor
      } else {
        totalSaidas += l.valor
        bucket.saidas += l.valor
      }
      porMes.set(l.competencia, bucket)
    }

    const meses = Array.from(porMes.keys()).sort()
    let saldoAcumulado = 0
    const fluxoPorMes = meses.map(mes => {
      const { entradas, saidas } = porMes.get(mes)!
      const saldoMes = entradas - saidas
      saldoAcumulado += saldoMes
      return { mes, entradas, saidas, saldoMes, saldoAcumulado }
    })

    return { totalEntradas, totalSaidas, resultado: totalEntradas - totalSaidas, fluxoPorMes }
  }, [lancamentos])

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Financeiro do Escritório</h1>
            <p className="text-slate-500 mt-1">Entradas, saídas, DRE simples e fluxo de caixa.</p>
          </div>
          <div>
            <label className="block text-slate-700 mb-2 font-semibold text-sm">A partir de</label>
            <input
              type="month"
              value={competenciaInicio}
              onChange={e => setCompetenciaInicio(e.target.value)}
              className="bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {erro}
          </div>
        )}

        {/* DRE simples */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm mb-2">Receitas</p>
                <p className="text-2xl font-bold text-slate-900">{formatarMoeda(totalEntradas)}</p>
              </div>
              <div className="bg-green-500 p-4 rounded-lg text-white">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm mb-2">Despesas</p>
                <p className="text-2xl font-bold text-slate-900">{formatarMoeda(totalSaidas)}</p>
              </div>
              <div className="bg-red-500 p-4 rounded-lg text-white">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm mb-2">Resultado</p>
                <p className={`text-2xl font-bold ${resultado >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                  {formatarMoeda(resultado)}
                </p>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg text-white">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Fluxo de caixa */}
        <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm mb-8 overflow-x-auto">
          <p className="text-slate-700 font-semibold mb-4">Fluxo de Caixa Mensal</p>
          {fluxoPorMes.length === 0 ? (
            <p className="text-slate-500 text-sm">Sem lançamentos no período.</p>
          ) : (
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="text-left text-slate-500 border-b border-green-100">
                  <th className="py-2 pr-4">Mês</th>
                  <th className="py-2 pr-4">Entradas</th>
                  <th className="py-2 pr-4">Saídas</th>
                  <th className="py-2 pr-4">Saldo do Mês</th>
                  <th className="py-2">Saldo Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {fluxoPorMes.map(f => (
                  <tr key={f.mes} className="border-b border-green-50">
                    <td className="py-2 pr-4 text-slate-900 font-semibold">{f.mes}</td>
                    <td className="py-2 pr-4 text-green-700">{formatarMoeda(f.entradas)}</td>
                    <td className="py-2 pr-4 text-red-600">{formatarMoeda(f.saidas)}</td>
                    <td className={`py-2 pr-4 font-semibold ${f.saldoMes >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                      {formatarMoeda(f.saldoMes)}
                    </td>
                    <td className={`py-2 font-bold ${f.saldoAcumulado >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                      {formatarMoeda(f.saldoAcumulado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Novo lançamento */}
        <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm mb-8">
          <p className="text-slate-700 font-semibold mb-4">Novo Lançamento</p>
          <form onSubmit={adicionarLancamento} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-slate-500 mb-1 text-xs font-semibold">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm(prev => ({ ...prev, tipo: e.target.value as 'entrada' | 'saida' }))}
                className="w-full bg-white border border-green-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              >
                <option value="saida">Saída</option>
                <option value="entrada">Entrada</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-500 mb-1 text-xs font-semibold">Categoria</label>
              <input
                type="text"
                value={form.categoria}
                onChange={e => setForm(prev => ({ ...prev, categoria: e.target.value }))}
                placeholder="Ex: Aluguel"
                className="w-full bg-white border border-green-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 text-xs font-semibold">Valor</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.valor}
                onChange={e => setForm(prev => ({ ...prev, valor: e.target.value }))}
                className="w-full bg-white border border-green-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 text-xs font-semibold">Data</label>
              <input
                type="date"
                value={form.data}
                onChange={e => setForm(prev => ({ ...prev, data: e.target.value }))}
                className="w-full bg-white border border-green-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              />
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </form>
        </div>

        {/* Lista de lançamentos */}
        <div>
          <p className="text-slate-700 font-semibold mb-4">Lançamentos</p>
          {carregando ? (
            <p className="text-slate-600">Carregando...</p>
          ) : lancamentos.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center border border-green-100 shadow-sm">
              <p className="text-slate-600 text-lg">Nenhum lançamento no período.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...lancamentos].reverse().map(l => (
                <div
                  key={l.id}
                  className="flex items-center justify-between bg-white rounded-lg p-4 border border-green-100 shadow-sm"
                >
                  <div>
                    <p className="text-slate-900 font-semibold">
                      {l.categoria}
                      {l.descricao ? ` · ${l.descricao}` : ''}
                      {l.cliente ? ` · ${l.cliente.nome}` : ''}
                    </p>
                    <p className="text-slate-500 text-sm">
                      {format(new Date(l.data), 'dd MMM yyyy', { locale: ptBR })}
                      {l.origem === 'honorario' ? ' · gerado por honorário' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${l.tipo === 'entrada' ? 'text-green-700' : 'text-red-600'}`}>
                      {l.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(l.valor)}
                    </span>
                    {l.origem !== 'honorario' && (
                      <button
                        onClick={() => excluirLancamento(l.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
