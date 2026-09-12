// src/app/modelos-obrigacao/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'

interface Modelo {
  id: string
  titulo: string
  diaVencimento: number
  periodicidade: string
  regimeTributario: string | null
  cidade: string | null
  ativo: boolean
}

const REGIME_LABELS: Record<string, string> = {
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
  mei: 'MEI',
  pessoa_fisica: 'Pessoa Física',
  produtor_rural: 'Produtor Rural',
}

export default function ModelosObrigacaoPage() {
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/modelos-obrigacao')
      .then(res => res.json())
      .then(dados => setModelos(Array.isArray(dados) ? dados : []))
      .catch(err => console.error('Erro ao carregar modelos:', err))
      .finally(() => setCarregando(false))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-3">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white">Modelos de Obrigação</h1>
            <p className="text-slate-400 mt-1">
              Regras que geram obrigações mensais automaticamente por regime tributário e/ou cidade.
            </p>
          </div>
          <Link
            href="/modelos-obrigacao/novo"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Plus className="w-5 h-5" />
            Novo Modelo
          </Link>
        </div>

        {carregando ? (
          <div className="text-slate-300">Carregando...</div>
        ) : modelos.length === 0 ? (
          <div className="bg-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-300 text-lg">Nenhum modelo cadastrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {modelos.map(modelo => (
              <Link
                key={modelo.id}
                href={`/modelos-obrigacao/${modelo.id}`}
                className="flex items-center justify-between bg-slate-700 hover:bg-slate-600 rounded-lg p-5 transition border border-slate-600"
              >
                <div>
                  <p className="text-white font-semibold text-lg">{modelo.titulo}</p>
                  <p className="text-slate-400 text-sm">
                    Vence todo dia {modelo.diaVencimento} · {modelo.periodicidade}
                    {' · '}
                    {modelo.regimeTributario ? REGIME_LABELS[modelo.regimeTributario] ?? modelo.regimeTributario : 'Todos os regimes'}
                    {modelo.cidade ? ` · ${modelo.cidade}` : ' · Qualquer cidade'}
                  </p>
                </div>
                {!modelo.ativo && (
                  <span className="bg-slate-600 text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                    INATIVO
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
