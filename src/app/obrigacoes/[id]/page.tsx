// src/app/obrigacoes/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AppShell from '@/components/AppShell'

interface Obrigacao {
  id: string
  titulo: string
  descricao: string | null
  vencimento: string
  periodicidade: string | null
  status: string
  prioridade: string
  cliente: string | null
  tags: string[]
  linkDocumento: string | null
  dataAtendimento: string | null
}

function paraInputDate(iso: string) {
  return iso ? iso.slice(0, 10) : ''
}

export default function DetalheObrigacao({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [obrigacao, setObrigacao] = useState<Obrigacao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    vencimento: '',
    periodicidade: 'unica',
    status: 'pendente',
    prioridade: 'normal',
    cliente: '',
    tags: '',
    linkDocumento: '',
  })

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    setCarregando(true)
    try {
      const response = await fetch(`/api/obrigacoes/${params.id}`)
      if (!response.ok) {
        setObrigacao(null)
        return
      }
      const dados = await response.json()
      setObrigacao(dados)
      setForm({
        titulo: dados.titulo ?? '',
        descricao: dados.descricao ?? '',
        vencimento: paraInputDate(dados.vencimento),
        periodicidade: dados.periodicidade ?? 'unica',
        status: dados.status ?? 'pendente',
        prioridade: dados.prioridade ?? 'normal',
        cliente: dados.cliente ?? '',
        tags: (dados.tags ?? []).join(', '),
        linkDocumento: dados.linkDocumento ?? '',
      })
    } catch (error) {
      console.error('Erro ao carregar obrigação:', error)
    } finally {
      setCarregando(false)
    }
  }

  const atualizarCampo = (campo: string, valor: string) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const salvar = async (dadosExtras: Record<string, unknown> = {}) => {
    setErro('')
    setSalvando(true)
    try {
      const response = await fetch(`/api/obrigacoes/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao || null,
          vencimento: form.vencimento,
          periodicidade: form.periodicidade,
          status: form.status,
          prioridade: form.prioridade,
          cliente: form.cliente || null,
          tags: form.tags
            ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
            : [],
          linkDocumento: form.linkDocumento || null,
          ...dadosExtras,
        }),
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      const atualizada = await response.json()
      setObrigacao(atualizada)
      setEditando(false)
    } catch (error) {
      console.error(error)
      setErro('Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo || !form.vencimento) {
      setErro('Preencha ao menos título e vencimento.')
      return
    }
    salvar()
  }

  const finalizar = () => {
    salvar({ status: 'concluida', dataAtendimento: new Date().toISOString() })
  }

  const excluir = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta obrigação?')) return

    try {
      const response = await fetch(`/api/obrigacoes/${params.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Erro ao excluir')
      router.push('/dashboard')
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

  if (!obrigacao) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>
          <div className="bg-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-300 text-lg">Obrigação não encontrada.</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>

          <div className="flex gap-3">
            {obrigacao.status !== 'concluida' && (
              <button
                onClick={finalizar}
                disabled={salvando}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                <CheckCircle className="w-4 h-4" />
                Finalizar
              </button>
            )}
            <button
              onClick={excluir}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>

        {erro && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4">
            {erro}
          </div>
        )}

        {obrigacao.status === 'concluida' && obrigacao.dataAtendimento && (
          <div className="bg-green-900/40 border border-green-700 text-green-200 px-4 py-3 rounded-lg mb-4">
            Finalizada em{' '}
            {format(new Date(obrigacao.dataAtendimento), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        )}

        {!editando ? (
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 space-y-4">
            <div className="flex justify-between items-start">
              <h1 className="text-2xl font-bold text-white">{obrigacao.titulo}</h1>
              <button
                onClick={() => setEditando(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Editar
              </button>
            </div>

            {obrigacao.descricao && (
              <p className="text-slate-300">{obrigacao.descricao}</p>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Vencimento</p>
                <p className="text-white font-semibold">
                  {format(new Date(obrigacao.vencimento), 'dd MMM yyyy', { locale: ptBR })}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Periodicidade</p>
                <p className="text-white font-semibold">{obrigacao.periodicidade ?? '-'}</p>
              </div>
              <div>
                <p className="text-slate-400">Status</p>
                <p className="text-white font-semibold">{obrigacao.status}</p>
              </div>
              <div>
                <p className="text-slate-400">Prioridade</p>
                <p className="text-white font-semibold">{obrigacao.prioridade}</p>
              </div>
              <div>
                <p className="text-slate-400">Cliente</p>
                <p className="text-white font-semibold">{obrigacao.cliente ?? '-'}</p>
              </div>
              <div>
                <p className="text-slate-400">Link do Documento</p>
                {obrigacao.linkDocumento ? (
                  <a
                    href={obrigacao.linkDocumento}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Abrir
                  </a>
                ) : (
                  <p className="text-white font-semibold">-</p>
                )}
              </div>
            </div>

            {obrigacao.tags?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {obrigacao.tags.map((tag, idx) => (
                  <span key={idx} className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-slate-700 rounded-lg p-6 border border-slate-600 space-y-5"
          >
            <div>
              <label className="block text-slate-300 mb-2 font-semibold">Título *</label>
              <input
                type="text"
                value={form.titulo}
                onChange={e => atualizarCampo('titulo', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-semibold">Descrição</label>
              <textarea
                value={form.descricao}
                onChange={e => atualizarCampo('descricao', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-2 font-semibold">Vencimento *</label>
                <input
                  type="date"
                  value={form.vencimento}
                  onChange={e => atualizarCampo('vencimento', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-2 font-semibold">Periodicidade</label>
                <select
                  value={form.periodicidade}
                  onChange={e => atualizarCampo('periodicidade', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="unica">Única</option>
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-2 font-semibold">Status</label>
                <select
                  value={form.status}
                  onChange={e => atualizarCampo('status', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-2 font-semibold">Prioridade</label>
                <select
                  value={form.prioridade}
                  onChange={e => atualizarCampo('prioridade', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-semibold">Cliente</label>
              <input
                type="text"
                value={form.cliente}
                onChange={e => atualizarCampo('cliente', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-semibold">Tags (separadas por vírgula)</label>
              <input
                type="text"
                value={form.tags}
                onChange={e => atualizarCampo('tags', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-semibold">Link do Documento</label>
              <input
                type="text"
                value={form.linkDocumento}
                onChange={e => atualizarCampo('linkDocumento', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={salvando}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  )
}
