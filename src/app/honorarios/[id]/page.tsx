// src/app/honorarios/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AppShell from '@/components/AppShell'

interface Pagamento {
  id: string
  competencia: string
  valor: number
  vencimento: string
  status: string
  dataPagamento: string | null
}

export default function DetalheHonorario({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [encontrado, setEncontrado] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [form, setForm] = useState({
    descricao: '',
    valor: '',
    diaVencimento: '10',
    ativo: true,
  })

  useEffect(() => {
    fetch(`/api/honorarios/${params.id}`)
      .then(res => {
        if (!res.ok) {
          setEncontrado(false)
          return null
        }
        return res.json()
      })
      .then(dados => {
        if (!dados) return
        setClienteNome(dados.cliente?.nome ?? '')
        setPagamentos(dados.pagamentos ?? [])
        setForm({
          descricao: dados.descricao ?? '',
          valor: String(dados.valor ?? ''),
          diaVencimento: String(dados.diaVencimento ?? 10),
          ativo: dados.ativo ?? true,
        })
      })
      .catch(err => console.error('Erro ao carregar honorário:', err))
      .finally(() => setCarregando(false))
  }, [params.id])

  const atualizarCampo = (campo: string, valor: string | boolean) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    const valor = Number(form.valor)
    const dia = Number(form.diaVencimento)

    if (!valor || valor <= 0 || !dia || dia < 1 || dia > 31) {
      setErro('Preencha valor e dia de vencimento válidos.')
      return
    }

    setSalvando(true)
    try {
      const response = await fetch(`/api/honorarios/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: form.descricao || null,
          valor,
          diaVencimento: dia,
          ativo: form.ativo,
        }),
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
    if (!window.confirm('Tem certeza que deseja excluir este contrato de honorário? Todas as cobranças geradas também serão removidas.')) return

    try {
      const response = await fetch(`/api/honorarios/${params.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Erro ao excluir')
      router.push('/honorarios')
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
      <AppShell>
        <div className="max-w-2xl mx-auto">
          <Link href="/honorarios" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Financeiro
          </Link>
          <div className="bg-white rounded-lg p-8 text-center border border-green-100 shadow-sm">
            <p className="text-slate-600 text-lg">Contrato não encontrado.</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/honorarios" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Financeiro
          </Link>
          <button
            onClick={excluir}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-1">Editar Contrato</h1>
        <p className="text-slate-500 mb-8">Cliente: {clienteNome}</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 border border-green-100 shadow-sm space-y-5 mb-8">
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {erro}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 mb-2 font-semibold">Valor Mensal (R$) *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.valor}
                onChange={e => atualizarCampo('valor', e.target.value)}
                className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-2 font-semibold">Dia do Vencimento *</label>
              <input
                type="number"
                min={1}
                max={31}
                value={form.diaVencimento}
                onChange={e => atualizarCampo('diaVencimento', e.target.value)}
                className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">Descrição</label>
            <input
              type="text"
              value={form.descricao}
              onChange={e => atualizarCampo('descricao', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            />
          </div>

          <label className="flex items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={e => atualizarCampo('ativo', e.target.checked)}
              className="w-4 h-4"
            />
            Contrato ativo (só contratos ativos entram na geração automática de cobranças)
          </label>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>

        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Histórico de Cobranças</h2>
          {pagamentos.length === 0 ? (
            <p className="text-slate-600">Nenhuma cobrança gerada ainda.</p>
          ) : (
            <div className="space-y-2">
              {pagamentos.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-white rounded-lg p-4 border border-green-100 shadow-sm">
                  <div>
                    <p className="text-slate-900 font-semibold">{p.competencia}</p>
                    <p className="text-slate-500 text-sm">
                      Vence {format(new Date(p.vencimento), 'dd MMM yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-900 font-bold">
                      {p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      p.status === 'pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
