// src/app/tarefas/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, CheckCircle } from 'lucide-react'
import AppShell from '@/components/AppShell'

interface ItemChecklistTarefa {
  chave: string
  label: string
  concluido: boolean
}

interface Tarefa {
  id: string
  titulo: string
  descricao: string | null
  dataVencimento: string | null
  status: string
  prioridade: string
  categoria: string | null
  checklist: ItemChecklistTarefa[]
}

function paraInputDate(iso: string | null) {
  return iso ? iso.slice(0, 10) : ''
}

export default function DetalheTarefa({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [tarefa, setTarefa] = useState<Tarefa | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/tarefas/${params.id}`)
      if (!res.ok) {
        setTarefa(null)
        return
      }
      setTarefa(await res.json())
    } catch (error) {
      console.error('Erro ao carregar tarefa:', error)
    } finally {
      setCarregando(false)
    }
  }

  const salvarCampos = async (campos: Record<string, unknown>) => {
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch(`/api/tarefas/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campos),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setTarefa(await res.json())
    } catch (error) {
      console.error(error)
      setErro('Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const alternarItem = (chave: string) => {
    if (!tarefa) return
    const checklist = tarefa.checklist.map(item =>
      item.chave === chave ? { ...item, concluido: !item.concluido } : item
    )
    setTarefa({ ...tarefa, checklist })
    salvarCampos({ checklist })
  }

  const finalizar = () => salvarCampos({ status: 'concluida' })

  const excluir = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return
    try {
      const res = await fetch(`/api/tarefas/${params.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      router.push('/tarefas')
    } catch (error) {
      console.error(error)
      setErro('Não foi possível excluir.')
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl font-bold">Carregando...</div>
      </div>
    )
  }

  if (!tarefa) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto">
          <Link href="/tarefas" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar às Tarefas
          </Link>
          <div className="bg-white rounded-lg p-8 text-center border border-green-100 shadow-sm">
            <p className="text-slate-600 text-lg">Tarefa não encontrada.</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/tarefas" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition">
            <ArrowLeft className="w-4 h-4" />
            Voltar às Tarefas
          </Link>
          <div className="flex gap-3">
            {tarefa.status !== 'concluida' && (
              <button
                onClick={finalizar}
                disabled={salvando}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                <CheckCircle className="w-4 h-4" />
                Finalizar
              </button>
            )}
            <button
              onClick={excluir}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {erro}
          </div>
        )}

        <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm space-y-4 mb-4">
          <h1 className="text-2xl font-bold text-slate-900">{tarefa.titulo}</h1>
          {tarefa.descricao && <p className="text-slate-600">{tarefa.descricao}</p>}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Vencimento</p>
              <input
                type="date"
                value={paraInputDate(tarefa.dataVencimento)}
                onChange={e => salvarCampos({ dataVencimento: e.target.value || null })}
                className="bg-white border border-green-300 rounded-lg px-3 py-1 text-slate-900 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <p className="text-slate-500">Status</p>
              <select
                value={tarefa.status}
                onChange={e => salvarCampos({ status: e.target.value })}
                className="bg-white border border-green-300 rounded-lg px-3 py-1 text-slate-900 focus:outline-none focus:border-green-500"
              >
                <option value="pendente">Pendente</option>
                <option value="em_progresso">Em progresso</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm">
          <p className="text-slate-700 font-semibold mb-4">
            Checklist ({tarefa.checklist.filter(i => i.concluido).length}/{tarefa.checklist.length})
          </p>
          <div className="space-y-2">
            {tarefa.checklist.map(item => (
              <label
                key={item.chave}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                  item.concluido ? 'bg-green-50 border-green-200' : 'bg-white border-green-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.concluido}
                  onChange={() => alternarItem(item.chave)}
                  className="w-4 h-4"
                />
                <span className="text-slate-800">{item.label}</span>
              </label>
            ))}
            {tarefa.checklist.length === 0 && (
              <p className="text-slate-500 text-sm">Sem checklist para esta tarefa.</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
