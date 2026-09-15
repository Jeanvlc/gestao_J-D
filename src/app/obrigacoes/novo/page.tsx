// src/app/obrigacoes/novo/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AppShell from '@/components/AppShell'

export default function NovaObrigacao() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    vencimento: '',
    periodicidade: 'unica',
    status: 'pendente',
    prioridade: 'normal',
    cliente: '',
    tags: '',
    linkDocumento: '',
  })

  const atualizarCampo = (campo: string, valor: string) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!form.titulo || !form.vencimento) {
      setErro('Preencha ao menos título e vencimento.')
      return
    }

    setSalvando(true)
    try {
      const response = await fetch('/api/obrigacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao || null,
          vencimento: form.vencimento,
          periodicidade: form.periodicidade,
          status: form.status,
          prioridade: form.prioridade,
          cliente: form.cliente || null,
          tags: form.tags
            ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
            : [],
          linkDocumento: form.linkDocumento || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar obrigação')
      }

      router.push('/dashboard')
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
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Nova Obrigação</h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg p-6 border border-green-100 shadow-sm space-y-5"
        >
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">
              Título *
            </label>
            <input
              type="text"
              value={form.titulo}
              onChange={e => atualizarCampo('titulo', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              placeholder="Ex: Declaração ISS"
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">
              Descrição
            </label>
            <textarea
              value={form.descricao}
              onChange={e => atualizarCampo('descricao', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 mb-2 font-semibold">
                Vencimento *
              </label>
              <input
                type="date"
                value={form.vencimento}
                onChange={e => atualizarCampo('vencimento', e.target.value)}
                className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-2 font-semibold">
                Periodicidade
              </label>
              <select
                value={form.periodicidade}
                onChange={e => atualizarCampo('periodicidade', e.target.value)}
                className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              >
                <option value="unica">Única</option>
                <option value="mensal">Mensal</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 mb-2 font-semibold">
                Status
              </label>
              <select
                value={form.status}
                onChange={e => atualizarCampo('status', e.target.value)}
                className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              >
                <option value="pendente">Pendente</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 mb-2 font-semibold">
                Prioridade
              </label>
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
            <label className="block text-slate-700 mb-2 font-semibold">
              Cliente
            </label>
            <input
              type="text"
              value={form.cliente}
              onChange={e => atualizarCampo('cliente', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">
              Tags (separadas por vírgula)
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={e => atualizarCampo('tags', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              placeholder="ISS, IR, SPED"
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">
              Link do Documento
            </label>
            <input
              type="text"
              value={form.linkDocumento}
              onChange={e => atualizarCampo('linkDocumento', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            />
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            {salvando ? 'Salvando...' : 'Salvar Obrigação'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
