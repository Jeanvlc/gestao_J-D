// src/app/fechamento/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Unlock, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AppShell from '@/components/AppShell'
import type { ItemChecklist } from '@/lib/checklistFechamento'

interface Fechamento {
  id: string
  competencia: string
  status: string
  itens: ItemChecklist[]
  justificativa: string | null
  autorizadoPor: string | null
  fechadoEm: string | null
  cliente: { id: string; nome: string }
}

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Em andamento',
  concluido: 'Encerrado',
  concluido_com_pendencia: 'Encerrado com pendência',
}

export default function DetalheFechamento({ params }: { params: { id: string } }) {
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [pendenciasBloqueio, setPendenciasBloqueio] = useState<string[]>([])
  const [justificativa, setJustificativa] = useState('')
  const [autorizadoPor, setAutorizadoPor] = useState('')

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/fechamentos/${params.id}`)
      if (!res.ok) {
        setFechamento(null)
        return
      }
      const dados = await res.json()
      setFechamento(dados)
    } catch (error) {
      console.error('Erro ao carregar fechamento:', error)
    } finally {
      setCarregando(false)
    }
  }

  const alternarItem = async (chave: string) => {
    if (!fechamento || fechamento.status !== 'aberto') return

    const itens = fechamento.itens.map(item =>
      item.chave === chave ? { ...item, concluido: !item.concluido } : item
    )
    setFechamento({ ...fechamento, itens })

    try {
      await fetch(`/api/fechamentos/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens }),
      })
    } catch (error) {
      console.error('Erro ao salvar item:', error)
    }
  }

  const fecharCompetencia = async (comJustificativa: boolean) => {
    if (!fechamento) return
    setErro('')
    setSalvando(true)
    try {
      const res = await fetch(`/api/fechamentos/${params.id}/fechar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          comJustificativa ? { justificativa, autorizadoPor } : {}
        ),
      })
      const resultado = await res.json()

      if (res.status === 409) {
        setPendenciasBloqueio(resultado.pendencias || [])
        if (!comJustificativa) {
          setErro('')
        } else {
          setErro('Preencha justificativa e quem autoriza para fechar mesmo com pendências.')
        }
        return
      }

      if (!res.ok) throw new Error(resultado.error || 'Erro ao fechar')

      setPendenciasBloqueio([])
      setFechamento(resultado)
    } catch (error) {
      console.error(error)
      setErro('Não foi possível fechar a competência.')
    } finally {
      setSalvando(false)
    }
  }

  const reabrir = async () => {
    if (!window.confirm('Reabrir esta competência para edição?')) return
    setSalvando(true)
    try {
      const res = await fetch(`/api/fechamentos/${params.id}/reabrir`, { method: 'POST' })
      if (!res.ok) throw new Error('Erro ao reabrir')
      const resultado = await res.json()
      setFechamento(resultado)
      setPendenciasBloqueio([])
      setJustificativa('')
      setAutorizadoPor('')
    } catch (error) {
      console.error(error)
      setErro('Não foi possível reabrir a competência.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl font-bold">Carregando...</div>
      </div>
    )
  }

  if (!fechamento) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto">
          <Link href="/fechamento" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Fechamento Mensal
          </Link>
          <div className="bg-white rounded-lg p-8 text-center border border-green-100 shadow-sm">
            <p className="text-slate-600 text-lg">Fechamento não encontrado.</p>
          </div>
        </div>
      </AppShell>
    )
  }

  const aberto = fechamento.status === 'aberto'
  const feitos = fechamento.itens.filter(i => i.concluido).length
  const total = fechamento.itens.length

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <Link href="/fechamento" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Fechamento Mensal
        </Link>

        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{fechamento.cliente.nome}</h1>
            <p className="text-slate-500">Competência {fechamento.competencia} · {STATUS_LABEL[fechamento.status]}</p>
          </div>
          {!aberto && (
            <button
              onClick={reabrir}
              disabled={salvando}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition"
            >
              <Unlock className="w-4 h-4" />
              Reabrir
            </button>
          )}
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 mt-4">
            {erro}
          </div>
        )}

        {!aberto && (
          <div className={`px-4 py-3 rounded-lg mb-4 mt-4 border ${
            fechamento.status === 'concluido_com_pendencia'
              ? 'bg-orange-50 border-orange-200 text-orange-700'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            Fechado em {fechamento.fechadoEm ? format(new Date(fechamento.fechadoEm), "dd MMM yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
            {fechamento.status === 'concluido_com_pendencia' && (
              <div className="mt-2 text-sm">
                <p><strong>Justificativa:</strong> {fechamento.justificativa}</p>
                <p><strong>Autorizado por:</strong> {fechamento.autorizadoPor}</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-700 font-semibold">Checklist ({feitos}/{total})</p>
          </div>

          <div className="space-y-2">
            {fechamento.itens.map(item => (
              <label
                key={item.chave}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  item.concluido ? 'bg-green-50 border-green-200' : 'bg-white border-green-100'
                } ${aberto ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
              >
                <input
                  type="checkbox"
                  checked={item.concluido}
                  onChange={() => alternarItem(item.chave)}
                  disabled={!aberto}
                  className="w-4 h-4"
                />
                <span className="text-slate-800">{item.label}</span>
                {item.critico && (
                  <span className="ml-auto text-xs font-bold text-orange-600 uppercase">Crítico</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {aberto && (
          <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm mt-4">
            <button
              onClick={() => fecharCompetencia(false)}
              disabled={salvando}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              <Lock className="w-5 h-5" />
              {salvando ? 'Fechando...' : 'Encerrar Competência'}
            </button>

            {pendenciasBloqueio.length > 0 && (
              <div className="mt-4 border-t border-green-100 pt-4">
                <div className="flex items-center gap-2 text-orange-700 font-semibold mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  Pendências críticas impedem o fechamento normal
                </div>
                <ul className="text-slate-600 text-sm list-disc list-inside mb-4">
                  {pendenciasBloqueio.map(p => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>

                <p className="text-slate-700 font-semibold text-sm mb-3">
                  Para fechar mesmo assim, justifique e informe quem autoriza:
                </p>
                <div className="space-y-3">
                  <textarea
                    value={justificativa}
                    onChange={e => setJustificativa(e.target.value)}
                    rows={2}
                    placeholder="Justificativa da pendência"
                    className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                  />
                  <input
                    type="text"
                    value={autorizadoPor}
                    onChange={e => setAutorizadoPor(e.target.value)}
                    placeholder="Autorizado por (nome)"
                    className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                  />
                  <button
                    onClick={() => fecharCompetencia(true)}
                    disabled={salvando || !justificativa.trim() || !autorizadoPor.trim()}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
                  >
                    Fechar com Pendência Justificada
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
