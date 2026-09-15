// src/app/modelos-obrigacao/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { REGIME_LABELS } from '@/lib/regimes'

interface Modelo {
  id: string
  titulo: string
  diaVencimento: number
  periodicidade: string
  regimesTributarios: string[]
  estado: string | null
  cidade: string | null
  ativo: boolean
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
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Modelos de Obrigação</h1>
            <p className="text-slate-500 mt-1">
              Regras que geram obrigações mensais automaticamente por regime tributário e/ou cidade.
            </p>
          </div>
          <Link
            href="/modelos-obrigacao/novo"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Plus className="w-5 h-5" />
            Novo Modelo
          </Link>
        </div>

        {carregando ? (
          <div className="text-slate-600">Carregando...</div>
        ) : modelos.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-green-100 shadow-sm">
            <p className="text-slate-600 text-lg">Nenhum modelo cadastrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {modelos.map(modelo => (
              <Link
                key={modelo.id}
                href={`/modelos-obrigacao/${modelo.id}`}
                className="flex items-center justify-between bg-white hover:bg-green-50 rounded-lg p-5 transition border border-green-100 shadow-sm"
              >
                <div>
                  <p className="text-slate-900 font-semibold text-lg">{modelo.titulo}</p>
                  <p className="text-slate-500 text-sm">
                    Vence todo dia {modelo.diaVencimento} · {modelo.periodicidade}
                    {' · '}
                    {modelo.regimesTributarios.length > 0
                      ? modelo.regimesTributarios.map(r => REGIME_LABELS[r] ?? r).join(', ')
                      : 'Todos os regimes'}
                    {modelo.estado ? ` · ${modelo.estado}` : ''}
                    {modelo.cidade ? ` · ${modelo.cidade}` : ' · Qualquer cidade'}
                  </p>
                </div>
                {!modelo.ativo && (
                  <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">
                    INATIVO
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
