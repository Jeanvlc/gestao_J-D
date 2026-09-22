// src/app/clientes/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { nomeCliente } from '@/lib/clientes'

interface Cliente {
  id: string
  nome: string
  razaoSocial: string | null
  regimeTributario: string
  cidade: string | null
  estado: string | null
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

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/clientes')
      .then(res => res.json())
      .then(dados => setClientes(Array.isArray(dados) ? dados : []))
      .catch(err => console.error('Erro ao carregar clientes:', err))
      .finally(() => setCarregando(false))
  }, [])

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
          </div>
          <Link
            href="/clientes/novo"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Plus className="w-5 h-5" />
            Novo Cliente
          </Link>
        </div>

        {carregando ? (
          <div className="text-slate-600">Carregando...</div>
        ) : clientes.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-green-100 shadow-sm">
            <p className="text-slate-600 text-lg">Nenhum cliente cadastrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clientes.map(cliente => (
              <Link
                key={cliente.id}
                href={`/clientes/${cliente.id}`}
                className="flex items-center justify-between bg-white hover:bg-green-50 rounded-lg p-5 transition border border-green-100 shadow-sm"
              >
                <div>
                  <p className="text-slate-900 font-semibold text-lg">{nomeCliente(cliente)}</p>
                  <p className="text-slate-500 text-sm">
                    {REGIME_LABELS[cliente.regimeTributario] ?? cliente.regimeTributario}
                    {cliente.cidade ? ` · ${cliente.cidade}${cliente.estado ? '/' + cliente.estado : ''}` : ''}
                  </p>
                </div>
                {!cliente.ativo && (
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
