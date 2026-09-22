// src/app/tarefas/novo/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AppShell from '@/components/AppShell'

interface ClienteResumo {
  id: string
  nome: string
}

export default function NovaTarefa() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [clientes, setClientes] = useState<ClienteResumo[]>([])
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    dataVencimento: '',
    prioridade: 'normal',
    categoria: '',
    clienteId: '',
    tipo: 'padrao',
  })

  useEffect(() => {
    fetch('/api/clientes')
      .then(res => res.json())
      .then(dados => setClientes(Array.isArray(dados) ? dados : []))
      .catch(err => console.error('Erro ao carregar clientes:', err))
  }, [])

  const atualizarCampo = (campo: string, valor: string) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (form.tipo === 'societaria') {
      if (!form.clienteId) {
        setErro('Abertura de empresa exige um cliente vinculado.')
        return
      }
    } else if (!form.titulo) {
      setErro('Preencha o título da tarefa.')
      return
    }

    setSalvando(true)
    try {
      const response = await fetch('/api/tarefas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: form.titulo || null,
          descricao: form.descricao || null,
          dataVencimento: form.dataVencimento || null,
          prioridade: form.prioridade,
          categoria: form.categoria || null,
          clienteId: form.clienteId || null,
          tipo: form.tipo,
        }),
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      router.push('/tarefas')
    } catch (error) {
      console.error(error)
      setErro('Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <Link href="/tarefas" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar às Tarefas
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Nova Tarefa</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 border border-green-100 shadow-sm space-y-5">
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">Tipo de tarefa</label>
            <select
              value={form.tipo}
              onChange={e => atualizarCampo('tipo', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            >
              <option value="padrao">Padrão</option>
              <option value="societaria">Abertura de Empresa (societária)</option>
            </select>
            {form.tipo === 'societaria' && (
              <p className="text-slate-500 text-sm mt-1">
                Cria a primeira etapa do roteiro societário configurado em Configurações. Ao concluir cada etapa,
                você poderá gerar a próxima.
              </p>
            )}
          </div>

          {form.tipo !== 'societaria' && (
            <div>
              <label className="block text-slate-700 mb-2 font-semibold">Título *</label>
              <input
                type="text"
                value={form.titulo}
                onChange={e => atualizarCampo('titulo', e.target.value)}
                className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              />
            </div>
          )}

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">
              Cliente {form.tipo === 'societaria' ? '*' : '(opcional)'}
            </label>
            <select
              value={form.clienteId}
              onChange={e => atualizarCampo('clienteId', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            >
              <option value="">Nenhum</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={e => atualizarCampo('descricao', e.target.value)}
              rows={3}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 mb-2 font-semibold">Vencimento</label>
              <input
                type="date"
                value={form.dataVencimento}
                onChange={e => atualizarCampo('dataVencimento', e.target.value)}
                className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-2 font-semibold">Prioridade</label>
              <select
                value={form.prioridade}
                onChange={e => atualizarCampo('prioridade', e.target.value)}
                className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              >
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">Categoria</label>
            <input
              type="text"
              value={form.categoria}
              onChange={e => atualizarCampo('categoria', e.target.value)}
              placeholder="Ex: Urgente, Rotina..."
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            />
          </div>

          <p className="text-slate-500 text-sm">
            O checklist padrão configurado em Configurações será aplicado automaticamente a esta tarefa.
          </p>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            {salvando ? 'Salvando...' : 'Salvar Tarefa'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
