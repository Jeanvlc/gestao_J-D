// src/app/honorarios/novo/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AppShell from '@/components/AppShell'

interface Cliente {
  id: string
  nome: string
  ativo: boolean
}

export default function NovoHonorario() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    clienteId: '',
    descricao: '',
    valor: '',
    diaVencimento: '10',
    ativo: true,
  })

  useEffect(() => {
    fetch('/api/clientes')
      .then(res => res.json())
      .then(dados => setClientes(Array.isArray(dados) ? dados.filter((c: Cliente) => c.ativo) : []))
      .catch(err => console.error('Erro ao carregar clientes:', err))
  }, [])

  const atualizarCampo = (campo: string, valor: string) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    const valor = Number(form.valor)
    const dia = Number(form.diaVencimento)

    if (!form.clienteId || !valor || valor <= 0 || !dia || dia < 1 || dia > 31) {
      setErro('Selecione o cliente e preencha valor e dia de vencimento válidos.')
      return
    }

    setSalvando(true)
    try {
      const response = await fetch('/api/honorarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: form.clienteId,
          descricao: form.descricao || null,
          valor,
          diaVencimento: dia,
          ativo: form.ativo,
        }),
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      router.push('/honorarios')
    } catch (error) {
      console.error(error)
      setErro('Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <Link href="/honorarios" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Financeiro
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Novo Contrato de Honorário</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 border border-green-100 shadow-sm space-y-5">
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">Cliente *</label>
            <select
              value={form.clienteId}
              onChange={e => atualizarCampo('clienteId', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            >
              <option value="">Selecione um cliente</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

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
                placeholder="0,00"
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
              placeholder="Ex: Honorário contábil mensal"
            />
          </div>

          <p className="text-slate-500 text-sm">
            Após criar o contrato, use &quot;Gerar Cobranças do Mês&quot; na tela Financeiro para lançar a cobrança da competência atual.
          </p>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            {salvando ? 'Salvando...' : 'Salvar Contrato'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
