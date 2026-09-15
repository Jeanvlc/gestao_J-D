// src/app/fechamento/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertTriangle, Circle } from 'lucide-react'
import AppShell from '@/components/AppShell'
import type { ItemChecklist } from '@/lib/checklistFechamento'

interface Fechamento {
  id: string
  competencia: string
  status: string
  itens: ItemChecklist[]
  cliente: { id: string; nome: string }
  obrigacoes: { id: string; status: string }[]
}

function competenciaAtual() {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
}

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Em andamento',
  concluido: 'Encerrado',
  concluido_com_pendencia: 'Encerrado c/ pendência',
}

const STATUS_COR: Record<string, string> = {
  aberto: 'bg-yellow-100 text-yellow-800',
  concluido: 'bg-green-100 text-green-800',
  concluido_com_pendencia: 'bg-orange-100 text-orange-800',
}

export default function FechamentoPage() {
  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregar(competencia)
  }, [competencia])

  const carregar = async (comp: string) => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/fechamentos?competencia=${comp}`)
      const dados = await res.json()
      setFechamentos(Array.isArray(dados) ? dados : [])
    } catch (error) {
      console.error('Erro ao carregar fechamentos:', error)
    } finally {
      setCarregando(false)
    }
  }

  const progresso = (itens: ItemChecklist[]) => {
    const total = itens.length
    const feitos = itens.filter(i => i.concluido).length
    return { feitos, total }
  }

  const temPendenciaCritica = (f: Fechamento) =>
    f.itens.some(i => i.critico && !i.concluido) || f.obrigacoes.some(o => o.status !== 'concluida')

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Fechamento Mensal</h1>
            <p className="text-slate-500 mt-1">
              Checklist padrão de fechamento por cliente e competência.
            </p>
          </div>
          <div>
            <label className="block text-slate-700 mb-2 font-semibold text-sm">Competência</label>
            <input
              type="month"
              value={competencia}
              onChange={e => setCompetencia(e.target.value)}
              className="bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        {carregando ? (
          <p className="text-slate-600">Carregando...</p>
        ) : fechamentos.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-green-100 shadow-sm">
            <p className="text-slate-600 text-lg">Nenhum cliente ativo para fechar nessa competência.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fechamentos.map(f => {
              const { feitos, total } = progresso(f.itens)
              const pendenciaCritica = f.status === 'aberto' && temPendenciaCritica(f)
              return (
                <Link
                  key={f.id}
                  href={`/fechamento/${f.id}`}
                  className="flex items-center justify-between bg-white hover:bg-green-50 rounded-lg p-5 transition border border-green-100 shadow-sm"
                >
                  <div>
                    <p className="text-slate-900 font-semibold text-lg">{f.cliente.nome}</p>
                    <p className="text-slate-500 text-sm flex items-center gap-2 mt-1">
                      {f.status === 'aberto' ? (
                        pendenciaCritica ? (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400" />
                        )
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      )}
                      {feitos}/{total} itens concluídos
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COR[f.status]}`}>
                    {STATUS_LABEL[f.status] ?? f.status}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
