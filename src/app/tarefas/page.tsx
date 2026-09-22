// src/app/tarefas/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, CheckSquare, Square, Trash2, RotateCcw, CheckCheck, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AppShell from '@/components/AppShell'
import { nomeCliente } from '@/lib/clientes'

interface ItemChecklistTarefa {
  chave: string
  label: string
  concluido: boolean
}

interface Tarefa {
  id: string
  titulo: string
  status: string
  prioridade: string
  categoria: string | null
  dataVencimento: string | null
  checklist: ItemChecklistTarefa[]
  tipo: string
  etapaChave: string | null
  clienteRef: { id: string; nome: string; razaoSocial: string | null } | null
}

interface Obrigacao {
  id: string
  titulo: string
  status: string
  prioridade: string
  vencimento: string
  tags: string[]
  cliente: string | null
  clienteId: string | null
}

interface ItemLista {
  chave: string
  id: string
  origem: 'tarefa' | 'obrigacao'
  titulo: string
  status: string
  prioridade: string
  categoria: string | null
  dataVencimento: string | null
  feitos: number
  total: number
  badge: string | null
  clienteId: string | null
  clienteNome: string | null
  href: string
}

interface ClienteResumo {
  id: string
  nome: string
  razaoSocial: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  em_progresso: 'Em progresso',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  atrasada: 'Atrasada',
}

const STATUS_COR: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  em_progresso: 'bg-blue-100 text-blue-800',
  em_andamento: 'bg-blue-100 text-blue-800',
  concluida: 'bg-green-100 text-green-800',
  atrasada: 'bg-red-100 text-red-800',
}

// Agrupa os status específicos de Obrigação nos mesmos filtros usados por Tarefa
const BUCKET_FILTRO: Record<string, string> = {
  pendente: 'pendente',
  atrasada: 'pendente',
  em_progresso: 'em_progresso',
  em_andamento: 'em_progresso',
  concluida: 'concluida',
}

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [obrigacoes, setObrigacoes] = useState<Obrigacao[]>([])
  const [clientes, setClientes] = useState<ClienteResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [modoSelecao, setModoSelecao] = useState(false)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [processando, setProcessando] = useState(false)

  const carregarListas = () => {
    setCarregando(true)
    Promise.all([
      fetch('/api/tarefas').then(res => res.json()),
      fetch('/api/obrigacoes').then(res => res.json()),
    ])
      .then(([dadosTarefas, dadosObrigacoes]) => {
        setTarefas(Array.isArray(dadosTarefas) ? dadosTarefas : [])
        setObrigacoes(Array.isArray(dadosObrigacoes) ? dadosObrigacoes : [])
      })
      .catch(err => console.error('Erro ao carregar tarefas/obrigações:', err))
      .finally(() => setCarregando(false))
  }

  useEffect(() => {
    carregarListas()
    fetch('/api/clientes')
      .then(res => res.json())
      .then(dados => setClientes(Array.isArray(dados) ? dados : []))
      .catch(err => console.error('Erro ao carregar clientes:', err))
  }, [])

  const itens: ItemLista[] = [
    ...tarefas.map(t => ({
      chave: `tarefa-${t.id}`,
      id: t.id,
      origem: 'tarefa' as const,
      titulo: t.titulo,
      status: t.status,
      prioridade: t.prioridade,
      categoria: t.categoria,
      dataVencimento: t.dataVencimento,
      feitos: t.checklist?.filter(i => i.concluido).length ?? 0,
      total: t.checklist?.length ?? 0,
      badge: t.tipo === 'societaria' ? 'Societária' : null,
      clienteId: t.clienteRef?.id ?? null,
      clienteNome: t.clienteRef ? nomeCliente(t.clienteRef) : null,
      href: `/tarefas/${t.id}`,
    })),
    ...obrigacoes.map(o => ({
      chave: `obrigacao-${o.id}`,
      id: o.id,
      origem: 'obrigacao' as const,
      titulo: o.titulo,
      status: o.status,
      prioridade: o.prioridade,
      categoria: o.tags?.length ? o.tags.join(', ') : null,
      dataVencimento: o.vencimento,
      feitos: 0,
      total: 0,
      badge: 'Obrigação',
      clienteId: o.clienteId,
      clienteNome: o.cliente,
      href: `/obrigacoes/${o.id}`,
    })),
  ]

  const alternarSelecao = (chave: string) => {
    setSelecionados(prev => {
      const novo = new Set(prev)
      if (novo.has(chave)) novo.delete(chave)
      else novo.add(chave)
      return novo
    })
  }

  const cancelarSelecao = () => {
    setModoSelecao(false)
    setSelecionados(new Set())
  }

  const itensSelecionados = itens.filter(i => selecionados.has(i.chave))

  const aplicarEmMassa = async (acao: 'excluir' | 'pendente' | 'concluida') => {
    if (itensSelecionados.length === 0) return
    if (acao === 'excluir' && !window.confirm(`Excluir ${itensSelecionados.length} item(ns) selecionado(s)? Essa ação não pode ser desfeita.`)) {
      return
    }
    setProcessando(true)
    try {
      await Promise.all(
        itensSelecionados.map(item => {
          const url = item.origem === 'tarefa' ? `/api/tarefas/${item.id}` : `/api/obrigacoes/${item.id}`
          if (acao === 'excluir') return fetch(url, { method: 'DELETE' })
          return fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: acao }),
          })
        })
      )
      cancelarSelecao()
      carregarListas()
    } catch (error) {
      console.error('Erro ao aplicar ação em massa:', error)
    } finally {
      setProcessando(false)
    }
  }

  const itensFiltrados = itens.filter(i => {
    if (filtro !== 'todas' && (BUCKET_FILTRO[i.status] ?? i.status) !== filtro) return false
    if (filtroCliente && i.clienteId !== filtroCliente) return false
    return true
  })

  // Agrupa por cliente e, dentro do cliente, une pendências repetidas do mesmo tipo
  // (ex: PIS/COFINS pendente em vários meses) num único card com os meses embaixo.
  const porOrdemData = (a: ItemLista, b: ItemLista) =>
    (a.dataVencimento ?? '').localeCompare(b.dataVencimento ?? '')

  const gruposCliente = new Map<string, ItemLista[]>()
  for (const item of itensFiltrados) {
    const chave = item.clienteNome ?? 'Sem cliente'
    if (!gruposCliente.has(chave)) gruposCliente.set(chave, [])
    gruposCliente.get(chave)!.push(item)
  }

  const secoes = Array.from(gruposCliente.entries())
    .sort(([a], [b]) => (a === 'Sem cliente' ? 1 : b === 'Sem cliente' ? -1 : a.localeCompare(b)))
    .map(([clienteNome, itensDoCliente]) => {
      const porTitulo = new Map<string, ItemLista[]>()
      const avulsas: ItemLista[] = []

      for (const item of itensDoCliente) {
        if (item.status === 'concluida') {
          avulsas.push(item)
          continue
        }
        const chave = `${item.badge ?? ''}|${item.titulo}`
        if (!porTitulo.has(chave)) porTitulo.set(chave, [])
        porTitulo.get(chave)!.push(item)
      }

      const grupos: { titulo: string; badge: string | null; itens: ItemLista[] }[] = []
      porTitulo.forEach(lista => {
        if (lista.length > 1) {
          grupos.push({ titulo: lista[0].titulo, badge: lista[0].badge, itens: lista.sort(porOrdemData) })
        } else {
          avulsas.push(lista[0])
        }
      })

      avulsas.sort(porOrdemData)
      grupos.sort((a, b) => a.titulo.localeCompare(b.titulo))

      return { clienteNome, grupos, avulsas }
    })

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tarefas</h1>
            <p className="text-slate-500 mt-1">Tarefas gerais, com checklist básico.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => (modoSelecao ? cancelarSelecao() : setModoSelecao(true))}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition border ${
                modoSelecao
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-700 border-green-200 hover:bg-slate-100'
              }`}
            >
              {modoSelecao ? <X className="w-5 h-5" /> : <CheckSquare className="w-5 h-5" />}
              {modoSelecao ? 'Cancelar seleção' : 'Selecionar'}
            </button>
            <Link
              href="/tarefas/novo"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              <Plus className="w-5 h-5" />
              Nova Tarefa
            </Link>
          </div>
        </div>

        {modoSelecao && (
          <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-800 text-white rounded-lg px-4 py-3 mb-6">
            <span className="font-semibold text-sm">
              {itensSelecionados.length} selecionado(s)
            </span>
            <div className="flex gap-2 flex-wrap">
              <button
                disabled={processando || itensSelecionados.length === 0}
                onClick={() => aplicarEmMassa('pendente')}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-sm font-semibold transition"
              >
                <RotateCcw className="w-4 h-4" />
                Desfazer conclusão
              </button>
              <button
                disabled={processando || itensSelecionados.length === 0}
                onClick={() => aplicarEmMassa('concluida')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-sm font-semibold transition"
              >
                <CheckCheck className="w-4 h-4" />
                Marcar concluída
              </button>
              <button
                disabled={processando || itensSelecionados.length === 0}
                onClick={() => aplicarEmMassa('excluir')}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-sm font-semibold transition"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-6 flex-wrap items-center">
          {['todas', 'pendente', 'em_progresso', 'concluida'].map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filtro === f ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'todas' ? 'Todas' : STATUS_LABEL[f]}
            </button>
          ))}
          <select
            value={filtroCliente}
            onChange={e => setFiltroCliente(e.target.value)}
            className="bg-white border border-green-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-green-500"
          >
            <option value="">Todos os clientes</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{nomeCliente(c)}</option>
            ))}
          </select>
        </div>

        {carregando ? (
          <p className="text-slate-600">Carregando...</p>
        ) : itensFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-green-100 shadow-sm">
            <p className="text-slate-600 text-lg">Nenhuma tarefa encontrada.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {secoes.map(secao => (
              <div key={secao.clienteNome}>
                <h2 className="text-slate-700 font-bold text-sm uppercase tracking-wide mb-2 flex items-center gap-2">
                  {secao.clienteNome}
                  <span className="text-slate-400 font-normal normal-case">
                    ({secao.grupos.length + secao.avulsas.length})
                  </span>
                </h2>
                <div className="space-y-3">
                  {secao.grupos.map(grupo => (
                    <div
                      key={`${grupo.badge ?? ''}-${grupo.titulo}`}
                      className="bg-white rounded-lg p-5 border border-green-100 shadow-sm"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-slate-900 font-semibold text-lg">{grupo.titulo}</p>
                          {grupo.badge && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              grupo.badge === 'Obrigação' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {grupo.badge}
                            </span>
                          )}
                        </div>
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">
                          {grupo.itens.length} pendentes
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {grupo.itens.map(item => (
                          <Link
                            key={item.chave}
                            href={item.href}
                            onClick={e => {
                              if (!modoSelecao) return
                              e.preventDefault()
                              alternarSelecao(item.chave)
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${STATUS_COR[item.status] ?? 'bg-slate-100 text-slate-700'} hover:opacity-75`}
                          >
                            {modoSelecao && (
                              selecionados.has(item.chave)
                                ? <CheckSquare className="w-4 h-4" />
                                : <Square className="w-4 h-4" />
                            )}
                            {item.dataVencimento
                              ? format(new Date(item.dataVencimento), 'MMM/yyyy', { locale: ptBR })
                              : 'Sem prazo'}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}

                  {secao.avulsas.map(i => (
                    <Link
                      key={i.chave}
                      href={i.href}
                      onClick={e => {
                        if (!modoSelecao) return
                        e.preventDefault()
                        alternarSelecao(i.chave)
                      }}
                      className={`flex items-center justify-between bg-white hover:bg-green-50 rounded-lg p-5 transition border shadow-sm ${
                        modoSelecao && selecionados.has(i.chave) ? 'border-green-400 ring-1 ring-green-300' : 'border-green-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {modoSelecao && (
                          selecionados.has(i.chave)
                            ? <CheckSquare className="w-5 h-5 text-green-700 shrink-0" />
                            : <Square className="w-5 h-5 text-slate-400 shrink-0" />
                        )}
                        <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-slate-900 font-semibold text-lg">{i.titulo}</p>
                          {i.badge && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              i.badge === 'Obrigação' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {i.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-sm">
                          {i.total > 0 ? `${i.feitos}/${i.total} itens do checklist · ` : ''}
                          {i.dataVencimento
                            ? format(new Date(i.dataVencimento), 'MMM yyyy', { locale: ptBR })
                            : 'Sem prazo'}
                          {i.categoria ? ` · ${i.categoria}` : ''}
                        </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COR[i.status]}`}>
                        {STATUS_LABEL[i.status] ?? i.status}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
