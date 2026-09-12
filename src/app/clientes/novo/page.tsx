// src/app/clientes/novo/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NovoCliente() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    nome: '',
    cnpjCpf: '',
    regimeTributario: 'simples_nacional',
    cidade: '',
    estado: '',
  })

  const atualizarCampo = (campo: string, valor: string) => {
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
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      router.push('/clientes')
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
        <Link href="/clientes" className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar aos Clientes
        </Link>

        <h1 className="text-3xl font-bold text-white mb-8">Novo Cliente</h1>

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
                placeholder="SP"
              />
            </div>
          </div>

          <p className="text-slate-400 text-sm">
            A cidade é usada para aplicar obrigações locais (ex: Alvará) que variam por município.
          </p>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            {salvando ? 'Salvando...' : 'Salvar Cliente'}
          </button>
        </form>
      </div>
    </div>
  )
}
