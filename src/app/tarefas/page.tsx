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
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  em_progresso: 'Em progresso',
  concluida: 'Concluída',
}

const STATUS_COR: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  em_progresso: 'bg-blue-100 text-blue-800',
  concluida: 'bg-green-100 text-green-800',
}

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState('todas')

  useEffect(() => {
    fetch('/api/tarefas')
      .then(res => res.json())
      .then(dados => setTarefas(Array.isArray(dados) ? dados : []))
      .catch(err => console.error('Erro ao carregar tarefas:', err))
      .finally(() => setCarregando(false))
  }, [])

  const tarefasFiltradas = tarefas.filter(t => filtro === 'todas' || t.status === filtro)

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

        <div className="flex gap-3 mb-6 flex-wrap">
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
        </div>

        {carregando ? (
          <p className="text-slate-600">Carregando...</p>
        ) : tarefasFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-green-100 shadow-sm">
            <p className="text-slate-600 text-lg">Nenhuma tarefa encontrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tarefasFiltradas.map(t => {
              const feitos = t.checklist?.filter(i => i.concluido).length ?? 0
              const total = t.checklist?.length ?? 0
              return (
                <Link
                  key={t.id}
                  href={`/tarefas/${t.id}`}
                  className="flex items-center justify-between bg-white hover:bg-green-50 rounded-lg p-5 transition border border-green-100 shadow-sm"
                >
                  <div>
                    <p className="text-slate-900 font-semibold text-lg">{t.titulo}</p>
                    <p className="text-slate-500 text-sm">
                      {total > 0 ? `${feitos}/${total} itens do checklist · ` : ''}
                      {t.dataVencimento
                        ? format(new Date(t.dataVencimento), 'dd MMM yyyy', { locale: ptBR })
                        : 'Sem prazo'}
                      {t.categoria ? ` · ${t.categoria}` : ''}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COR[t.status]}`}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
