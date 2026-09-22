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

interface EtapaRoteiroSocietario {
  chave: string
  label: string
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
  tipo: string
  etapaChave: string | null
  grupoSocietarioId: string | null
  clienteId: string | null
  clienteRef: { id: string; nome: string } | null
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
  const [roteiro, setRoteiro] = useState<EtapaRoteiroSocietario[]>([])
  const [perguntarAvancar, setPerguntarAvancar] = useState(false)
  const [confirmarDesfazer, setConfirmarDesfazer] = useState<string | null>(null)

  useEffect(() => {
    carregar()
    fetch('/api/configuracoes')
      .then(res => res.json())
      .then(dados => setRoteiro(dados.roteiroSocietario ?? []))
      .catch(err => console.error('Erro ao carregar roteiro societário:', err))
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

  const etapaIndice = tarefa && tarefa.tipo === 'societaria'
    ? roteiro.findIndex(e => e.chave === tarefa.etapaChave)
    : -1
  const proximaEtapa = etapaIndice >= 0 ? roteiro[etapaIndice + 1] : undefined

  const finalizar = () => {
    if (tarefa?.tipo === 'societaria' && proximaEtapa) {
      setPerguntarAvancar(true)
      return
    }
    salvarCampos({ status: 'concluida' })
  }

  const avancarEtapa = async (avancar: boolean) => {
    setPerguntarAvancar(false)
    await salvarCampos({ status: 'concluida' })
    if (!avancar || !tarefa || !proximaEtapa) return

    try {
      const res = await fetch('/api/tarefas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'societaria',
          etapaChave: proximaEtapa.chave,
          grupoSocietarioId: tarefa.grupoSocietarioId,
          clienteId: tarefa.clienteId,
        }),
      })
      if (!res.ok) throw new Error('Erro ao criar próxima etapa')
      const nova = await res.json()
      router.push(`/tarefas/${nova.id}`)
    } catch (error) {
      console.error(error)
      setErro('Não foi possível gerar a próxima etapa.')
    }
  }

  const alterarStatus = async (novoStatus: string) => {
    if (!tarefa) return
    if (tarefa.status === 'concluida' && novoStatus !== 'concluida' && tarefa.grupoSocietarioId) {
      try {
        const res = await fetch(`/api/tarefas?grupoSocietarioId=${tarefa.grupoSocietarioId}`)
        const outras = res.ok ? await res.json() : []
        if (Array.isArray(outras) && outras.some((t: Tarefa) => t.id !== tarefa.id)) {
          setConfirmarDesfazer(novoStatus)
          return
        }
      } catch (error) {
        console.error('Erro ao verificar tarefas vinculadas:', error)
      }
    }
    salvarCampos({ status: novoStatus })
  }

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

        {confirmarDesfazer && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-4 rounded-lg mb-4">
            <p className="font-semibold mb-3">
              Esta tarefa está vinculada a outra etapa da abertura de empresa. Tem certeza que deseja desfazer a conclusão dela?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  salvarCampos({ status: confirmarDesfazer })
                  setConfirmarDesfazer(null)
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Sim, desfazer
              </button>
              <button
                onClick={() => setConfirmarDesfazer(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {perguntarAvancar && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-4 rounded-lg mb-4">
            <p className="font-semibold mb-3">
              Avançar para a próxima etapa: &quot;{proximaEtapa?.label}&quot;?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => avancarEtapa(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Sim
              </button>
              <button
                onClick={() => avancarEtapa(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition"
              >
                Não
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm space-y-4 mb-4">
          {tarefa.tipo === 'societaria' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold">
                Abertura de Empresa
              </span>
              {etapaIndice >= 0 && (
                <span className="text-slate-500 text-sm">
                  Etapa {etapaIndice + 1} de {roteiro.length}
                </span>
              )}
              {tarefa.clienteRef && (
                <span className="text-slate-500 text-sm">· Cliente: {tarefa.clienteRef.nome}</span>
              )}
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-900">{tarefa.titulo}</h1>
          {tarefa.descricao && <p className="text-slate-600">{tarefa.descricao}</p>}
          {tarefa.tipo !== 'societaria' && tarefa.clienteRef && (
            <p className="text-slate-500 text-sm">Cliente: {tarefa.clienteRef.nome}</p>
          )}

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
                onChange={e => alterarStatus(e.target.value)}
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
