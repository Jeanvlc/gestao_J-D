// src/app/clientes/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'

const REGIME_LABELS: Record<string, string> = {
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
  mei: 'MEI',
  pessoa_fisica: 'Pessoa Física',
  produtor_rural: 'Produtor Rural',
}

export default function DetalheCliente({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [encontrado, setEncontrado] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    nome: '',
    cnpjCpf: '',
    regimeTributario: 'simples_nacional',
    cidade: '',
    estado: '',
    ativo: true,
  })

  useEffect(() => {
    fetch(`/api/clientes/${params.id}`)
      .then(res => {
        if (!res.ok) {
          setEncontrado(false)
          return null
        }
        return res.json()
      })
      .then(dados => {
        if (!dados) return
        setForm({
          nome: dados.nome ?? '',
          cnpjCpf: dados.cnpjCpf ?? '',
          regimeTributario: dados.regimeTributario ?? 'simples_nacional',
          cidade: dados.cidade ?? '',
          estado: dados.estado ?? '',
          ativo: dados.ativo ?? true,
        })
      })
      .catch(err => console.error('Erro ao carregar cliente:', err))
      .finally(() => setCarregando(false))
  }, [params.id])

  const atualizarCampo = (campo: string, valor: string | boolean) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!form.nome) {
      setErro('Preencha o nome do cliente.')
      return
    }

    setSalvando(true)
    try {
      const response = await fetch(`/api/clientes/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (!response.ok) throw new Error('Erro ao salvar')
    } catch (error) {
      console.error(error)
      setErro('Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return

    try {
      const response = await fetch(`/api/clientes/${params.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Erro ao excluir')
      router.push('/clientes')
    } catch (error) {
      console.error(error)
      setErro('Não foi possível excluir. Tente novamente.')
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl font-bold">Carregando...</div>
      </div>
    )
  }

  if (!encontrado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/clientes" className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Clientes
          </Link>
          <div className="bg-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-300 text-lg">Cliente não encontrado.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/clientes" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Clientes
          </Link>
          <button
            onClick={excluir}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>

        <h1 className="text-3xl font-bold text-white mb-8">Editar Cliente</h1>

        <form onSubmit={handleSubmit} className="bg-slate-700 rounded-lg p-6 border border-slate-600 space-y-5">
          {erro && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-slate-300 mb-2 font-semibold">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => atualizarCampo('nome', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-2 font-semibold">CPF/CNPJ</label>
            <input
              type="text"
              value={form.cnpjCpf}
              onChange={e => atualizarCampo('cnpjCpf', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-2 font-semibold">Regime Tributário *</label>
            <select
              value={form.regimeTributario}
              onChange={e => atualizarCampo('regimeTributario', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="simples_nacional">Simples Nacional</option>
              <option value="lucro_presumido">Lucro Presumido</option>
              <option value="lucro_real">Lucro Real</option>
              <option value="mei">MEI</option>
              <option value="pessoa_fisica">Pessoa Física</option>
              <option value="produtor_rural">Produtor Rural</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-2 font-semibold">Cidade</label>
              <input
                type="text"
                value={form.cidade}
                onChange={e => atualizarCampo('cidade', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-2 font-semibold">Estado</label>
              <input
                type="text"
                value={form.estado}
                onChange={e => atualizarCampo('estado', e.target.value.toUpperCase())}
                maxLength={2}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={e => atualizarCampo('ativo', e.target.checked)}
              className="w-4 h-4"
            />
            Cliente ativo (só clientes ativos entram na geração automática de obrigações)
          </label>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </div>
  )
}
