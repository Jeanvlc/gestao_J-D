// src/app/modelos-obrigacao/novo/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const USER_ID = 'user-teste-123'

export default function NovoModelo() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    tags: '',
    diaVencimento: '10',
    periodicidade: 'mensal',
    prioridade: 'normal',
    regimeTributario: '',
    cidade: '',
  })

  const atualizarCampo = (campo: string, valor: string) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    const dia = Number(form.diaVencimento)
    if (!form.titulo || !dia || dia < 1 || dia > 31) {
      setErro('Preencha o título e um dia de vencimento válido (1-31).')
      return
    }

    setSalvando(true)
    try {
      const response = await fetch('/api/modelos-obrigacao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID,
        },
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao || null,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          diaVencimento: dia,
          periodicidade: form.periodicidade,
          prioridade: form.prioridade,
          regimeTributario: form.regimeTributario || null,
          cidade: form.cidade || null,
        }),
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      router.push('/modelos-obrigacao')
    } catch (error) {
      console.error(error)
      setErro('Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/modelos-obrigacao" className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar aos Modelos
        </Link>

        <h1 className="text-3xl font-bold text-white mb-8">Novo Modelo de Obrigação</h1>

        <form onSubmit={handleSubmit} className="bg-slate-700 rounded-lg p-6 border border-slate-600 space-y-5">
          {erro && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-slate-300 mb-2 font-semibold">Título *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={e => atualizarCampo('titulo', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Ex: DAS - Simples Nacional"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-2 font-semibold">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={e => atualizarCampo('descricao', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-2 font-semibold">Dia do Vencimento *</label>
              <input
                type="number"
                min={1}
                max={31}
                value={form.diaVencimento}
                onChange={e => atualizarCampo('diaVencimento', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-2 font-semibold">Periodicidade</label>
              <select
                value={form.periodicidade}
                onChange={e => atualizarCampo('periodicidade', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="mensal">Mensal</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-2 font-semibold">Prioridade</label>
            <select
              value={form.prioridade}
              onChange={e => atualizarCampo('prioridade', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-2 font-semibold">Regime Tributário</label>
            <select
              value={form.regimeTributario}
              onChange={e => atualizarCampo('regimeTributario', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos os regimes</option>
              <option value="simples_nacional">Simples Nacional</option>
              <option value="lucro_presumido">Lucro Presumido</option>
              <option value="lucro_real">Lucro Real</option>
              <option value="mei">MEI</option>
              <option value="pessoa_fisica">Pessoa Física</option>
              <option value="produtor_rural">Produtor Rural</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-2 font-semibold">Cidade</label>
            <input
              type="text"
              value={form.cidade}
              onChange={e => atualizarCampo('cidade', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Deixe em branco para valer em qualquer cidade (ex: Alvará varia por cidade)"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-2 font-semibold">Tags (separadas por vírgula)</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => atualizarCampo('tags', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="ISS, IR, SPED"
            />
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            {salvando ? 'Salvando...' : 'Salvar Modelo'}
          </button>
        </form>
      </div>
    </div>
  )
}
