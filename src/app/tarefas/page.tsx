// src/app/tarefas/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AppShell from '@/components/AppShell'

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
  clienteRef: { id: string; nome: string } | null
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
  id: string
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

  useEffect(() => {
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
    fetch('/api/clientes')
      .then(res => res.json())
      .then(dados => setClientes(Array.isArray(dados) ? dados : []))
      .catch(err => console.error('Erro ao carregar clientes:', err))
  }, [])

  const itens: ItemLista[] = [
    ...tarefas.map(t => ({
      id: t.id,
      titulo: t.titulo,
      status: t.status,
      prioridade: t.prioridade,
      categoria: t.categoria,
      dataVencimento: t.dataVencimento,
      feitos: t.checklist?.filter(i => i.concluido).length ?? 0,
      total: t.checklist?.length ?? 0,
      badge: t.tipo === 'societaria' ? 'Societária' : null,
      clienteId: t.clienteRef?.id ?? null,
      clienteNome: t.clienteRef?.nome ?? null,
      href: `/tarefas/${t.id}`,
    })),
    ...obrigacoes.map(o => ({
      id: o.id,
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

  const itensFiltrados = itens.filter(i => {
    if (filtro !== 'todas' && (BUCKET_FILTRO[i.status] ?? i.status) !== filtro) return false
    if (filtroCliente && i.clienteId !== filtroCliente) return false
    return true
  })

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tarefas</h1>
            <p className="text-slate-500 mt-1">Tarefas gerais, com checklist básico.</p>
          </div>
          <Link
            href="/tarefas/novo"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Plus className="w-5 h-5" />
            Nova Tarefa
          </Link>
        </div>

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
              <option key={c.id} value={c.id}>{c.nome}</option>
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
          <div className="space-y-3">
            {itensFiltrados.map(i => (
              <Link
                key={`${i.badge ?? 'tarefa'}-${i.id}`}
                href={i.href}
                className="flex items-center justify-between bg-white hover:bg-green-50 rounded-lg p-5 transition border border-green-100 shadow-sm"
              >
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
                      ? format(new Date(i.dataVencimento), 'dd MMM yyyy', { locale: ptBR })
                      : 'Sem prazo'}
                    {i.categoria ? ` · ${i.categoria}` : ''}
                    {i.clienteNome ? ` · Cliente: ${i.clienteNome}` : ''}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COR[i.status]}`}>
                  {STATUS_LABEL[i.status] ?? i.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
