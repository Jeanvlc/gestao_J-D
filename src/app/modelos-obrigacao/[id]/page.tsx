// src/app/modelos-obrigacao/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import AppShell from '@/components/AppShell'

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

type Tristate = '' | 'sim' | 'nao'

function tristateParaBooleano(valor: Tristate): boolean | null {
  if (valor === 'sim') return true
  if (valor === 'nao') return false
  return null
}

function booleanoParaTristate(valor: boolean | null | undefined): Tristate {
  if (valor === true) return 'sim'
  if (valor === false) return 'nao'
  return ''
}

export default function DetalheModelo({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [encontrado, setEncontrado] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    tags: '',
    diaVencimento: '10',
    periodicidade: 'mensal',
    prioridade: 'normal',
    regimeTributario: '',
    estado: '',
    cidade: '',
    requerFuncionarios: '' as Tristate,
    requerIcms: '' as Tristate,
    requerRetencoes: '' as Tristate,
    ativo: true,
  })

  useEffect(() => {
    fetch(`/api/modelos-obrigacao/${params.id}`)
      .then(res => {
        if (!res.ok) {
          setEncontrado(false)
          return null
        }
        return res.json()
      })
      .then(dados => {
        if (!dados) return
        setForm({
          titulo: dados.titulo ?? '',
          descricao: dados.descricao ?? '',
          tags: (dados.tags ?? []).join(', '),
          diaVencimento: String(dados.diaVencimento ?? 10),
          periodicidade: dados.periodicidade ?? 'mensal',
          prioridade: dados.prioridade ?? 'normal',
          regimeTributario: dados.regimeTributario ?? '',
          estado: dados.estado ?? '',
          cidade: dados.cidade ?? '',
          requerFuncionarios: booleanoParaTristate(dados.requerFuncionarios),
          requerIcms: booleanoParaTristate(dados.requerIcms),
          requerRetencoes: booleanoParaTristate(dados.requerRetencoes),
          ativo: dados.ativo ?? true,
        })
      })
      .catch(err => console.error('Erro ao carregar modelo:', err))
      .finally(() => setCarregando(false))
  }, [params.id])

  const atualizarCampo = (campo: string, valor: string | boolean) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    const dia = Number(form.diaVencimento)
    if (!form.titulo || !dia || dia < 1 || dia > 31) {
      setErro('Preencha o título e um dia de vencimento válido (1-31).')
      return
    }

    setSalvando(true)
    try {
      const response = await fetch(`/api/modelos-obrigacao/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao || null,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          diaVencimento: dia,
          periodicidade: form.periodicidade,
          prioridade: form.prioridade,
          regimeTributario: form.regimeTributario || null,
          estado: form.estado || null,
          cidade: form.cidade || null,
          requerFuncionarios: tristateParaBooleano(form.requerFuncionarios),
          requerIcms: tristateParaBooleano(form.requerIcms),
          requerRetencoes: tristateParaBooleano(form.requerRetencoes),
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
    if (!window.confirm('Tem certeza que deseja excluir este modelo?')) return

    try {
      const response = await fetch(`/api/modelos-obrigacao/${params.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Erro ao excluir')
      router.push('/modelos-obrigacao')
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
          <Link href="/modelos-obrigacao" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Modelos
          </Link>
          <div className="bg-white rounded-lg p-8 text-center border border-green-100 shadow-sm">
            <p className="text-slate-600 text-lg">Modelo não encontrado.</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/modelos-obrigacao" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition">
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Modelos
          </Link>
          <button
            onClick={excluir}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Editar Modelo</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 border border-green-100 shadow-sm space-y-5">
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">Título *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={e => atualizarCampo('titulo', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={e => atualizarCampo('descricao', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-slate-700 mb-2 font-semibold">Periodicidade</label>
              <select
                value={form.periodicidade}
                onChange={e => atualizarCampo('periodicidade', e.target.value)}
                className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              >
                <option value="mensal">Mensal</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">Prioridade</label>
            <select
              value={form.prioridade}
              onChange={e => atualizarCampo('prioridade', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            >
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">Regime Tributário</label>
            <select
              value={form.regimeTributario}
              onChange={e => atualizarCampo('regimeTributario', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            >
              <option value="">Todos os regimes</option>
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
              <label className="block text-slate-700 mb-2 font-semibold">Estado</label>
              <select
                value={form.estado}
                onChange={e => atualizarCampo('estado', e.target.value)}
                className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              >
                <option value="">Todos os estados</option>
                {ESTADOS.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 mb-2 font-semibold">Cidade</label>
              <input
                type="text"
                value={form.cidade}
                onChange={e => atualizarCampo('cidade', e.target.value)}
                className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                placeholder="Deixe em branco para qualquer cidade"
              />
            </div>
          </div>

          <div className="border border-green-200 rounded-lg p-4 space-y-3">
            <p className="text-slate-700 font-semibold text-sm">
              Critérios do perfil fiscal do cliente (motor de obrigações)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-500 mb-2 text-sm">Funcionários</label>
                <select
                  value={form.requerFuncionarios}
                  onChange={e => atualizarCampo('requerFuncionarios', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                >
                  <option value="">Indiferente</option>
                  <option value="sim">Exige que tenha</option>
                  <option value="nao">Exige que não tenha</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 mb-2 text-sm">ICMS</label>
                <select
                  value={form.requerIcms}
                  onChange={e => atualizarCampo('requerIcms', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                >
                  <option value="">Indiferente</option>
                  <option value="sim">Exige que tenha</option>
                  <option value="nao">Exige que não tenha</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 mb-2 text-sm">Retenções</label>
                <select
                  value={form.requerRetencoes}
                  onChange={e => atualizarCampo('requerRetencoes', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                >
                  <option value="">Indiferente</option>
                  <option value="sim">Exige que tenha</option>
                  <option value="nao">Exige que não tenha</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">Tags (separadas por vírgula)</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => atualizarCampo('tags', e.target.value)}
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
            Modelo ativo (só modelos ativos entram na geração automática)
          </label>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
