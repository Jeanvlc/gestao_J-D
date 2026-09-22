// src/app/obrigacoes/gerar/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import AppShell from '@/components/AppShell'

function competenciasProximas(qtdPassado: number, qtdFuturo: number) {
  const base = new Date()
  const lista: string[] = []
  for (let i = -qtdPassado; i <= qtdFuturo; i++) {
    const data = new Date(base.getFullYear(), base.getMonth() + i, 1)
    lista.push(`${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`)
  }
  return lista
}

function labelCompetencia(competencia: string) {
  const [ano, mes] = competencia.split('-')
  const data = new Date(Number(ano), Number(mes) - 1, 1)
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default function GerarObrigacoes() {
  const router = useRouter()
  const opcoes = competenciasProximas(12, 6)
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState('')

  const alternar = (competencia: string) => {
    setSelecionadas(prev =>
      prev.includes(competencia) ? prev.filter(c => c !== competencia) : [...prev, competencia]
    )
  }

  const gerar = async () => {
    if (selecionadas.length === 0) {
      setErro('Selecione pelo menos um mês.')
      return
    }
    setErro('')
    setResultado('')
    setGerando(true)
    try {
      const res = await fetch('/api/obrigacoes/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competencias: selecionadas }),
      })
      const dados = await res.json()
      if (!res.ok) throw new Error(dados.error || 'Erro ao gerar')
      setResultado(
        `${dados.criadas} obrigação(ões) nova(s) gerada(s). Obrigações que já existiam para o mesmo cliente/mês/modelo não foram duplicadas.`
      )
    } catch (error) {
      console.error(error)
      setErro('Não foi possível gerar as obrigações.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Gerar Obrigações</h1>
        <p className="text-slate-500 mb-8">
          Selecione os meses (competências) para gerar. Obrigações que já existem para o mesmo
          cliente, modelo e mês nunca são duplicadas.
        </p>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{erro}</div>
        )}
        {resultado && (
          <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-lg mb-4">
            {resultado}
          </div>
        )}

        <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm mb-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-slate-700 font-semibold">Meses</p>
            <div className="flex gap-2 text-sm">
              <button
                onClick={() => setSelecionadas(opcoes)}
                className="text-green-700 hover:underline"
              >
                Selecionar todos
              </button>
              <span className="text-slate-300">·</span>
              <button
                onClick={() => setSelecionadas([])}
                className="text-slate-500 hover:underline"
              >
                Limpar
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {opcoes.map(competencia => (
              <label
                key={competencia}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer capitalize ${
                  selecionadas.includes(competencia)
                    ? 'bg-green-50 border-green-300 text-green-800'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selecionadas.includes(competencia)}
                  onChange={() => alternar(competencia)}
                  className="w-4 h-4"
                />
                {labelCompetencia(competencia)}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={gerar}
            disabled={gerando}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Sparkles className="w-5 h-5" />
            {gerando ? 'Gerando...' : `Gerar ${selecionadas.length || ''} mês(es)`}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-lg font-semibold transition"
          >
            Voltar
          </button>
        </div>
      </div>
    </AppShell>
  )
}
