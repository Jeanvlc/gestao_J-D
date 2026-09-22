// src/app/modelos-obrigacao/novo/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { REGIMES_TRIBUTARIOS } from '@/lib/regimes'

interface ModeloResumo {
  id: string
  titulo: string
}

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

// '' = indiferente, 'sim' = exige verdadeiro, 'nao' = exige falso
const CRITERIOS_TRISTATE = ['', 'sim', 'nao'] as const
type Tristate = typeof CRITERIOS_TRISTATE[number]

function tristateParaBooleano(valor: Tristate): boolean | null {
  if (valor === 'sim') return true
  if (valor === 'nao') return false
  return null
}

export default function NovoModelo() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [modelos, setModelos] = useState<ModeloResumo[]>([])
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    tags: '',
    diaVencimento: '10',
    diaEnvioCliente: '',
    periodicidade: 'mensal',
    prioridade: 'normal',
    regimesTributarios: [] as string[],
    estado: '',
    cidade: '',
    requerFuncionarios: '' as Tristate,
    requerIcms: '' as Tristate,
    requerRetencoes: '' as Tristate,
    proximoModeloId: '',
  })

  useEffect(() => {
    fetch('/api/modelos-obrigacao')
      .then(res => res.json())
      .then(dados => setModelos(Array.isArray(dados) ? dados : []))
      .catch(err => console.error('Erro ao carregar modelos:', err))
  }, [])

  const atualizarCampo = (campo: string, valor: string) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const alternarRegime = (valor: string) => {
    setForm(prev => ({
      ...prev,
      regimesTributarios: prev.regimesTributarios.includes(valor)
        ? prev.regimesTributarios.filter(r => r !== valor)
        : [...prev.regimesTributarios, valor],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    const dia = Number(form.diaVencimento)
    if (!form.titulo || !dia || dia < 1 || dia > 31) {
      setErro('Preencha o título e um dia de vencimento válido (1-31).')
      return
    }
    const diaEnvio = form.diaEnvioCliente ? Number(form.diaEnvioCliente) : null
    if (diaEnvio !== null && (diaEnvio < 1 || diaEnvio > 31)) {
      setErro('O dia de envio ao cliente deve ser entre 1 e 31.')
      return
    }

    setSalvando(true)
    try {
      const response = await fetch('/api/modelos-obrigacao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao || null,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          diaVencimento: dia,
          diaEnvioCliente: diaEnvio,
          periodicidade: form.periodicidade,
          prioridade: form.prioridade,
          regimesTributarios: form.regimesTributarios,
          estado: form.estado || null,
          cidade: form.cidade || null,
          requerFuncionarios: tristateParaBooleano(form.requerFuncionarios),
          requerIcms: tristateParaBooleano(form.requerIcms),
          requerRetencoes: tristateParaBooleano(form.requerRetencoes),
          proximoModeloId: form.proximoModeloId || null,
        }),
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      router.push('/modelos-obrigacao')
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
        <Link href="/modelos-obrigacao" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar aos Modelos
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Novo Modelo de Obrigação</h1>

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
              placeholder="Ex: DAS - Simples Nacional"
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
              <label className="block text-slate-700 mb-2 font-semibold">Dia do Vencimento (prazo legal) *</label>
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
            <label className="block text-slate-700 mb-2 font-semibold">Dia para avisar/cobrar o cliente (opcional)</label>
            <input
              type="number"
              min={1}
              max={31}
              value={form.diaEnvioCliente}
              onChange={e => atualizarCampo('diaEnvioCliente', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              placeholder="Deixe em branco para usar o mesmo dia do vencimento"
            />
            <p className="text-slate-500 text-sm mt-1">
              Ex: PIS/COFINS vence dia 25, mas você quer avisar o cliente dia 20.
            </p>
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
            <label className="block text-slate-700 mb-2 font-semibold">Regimes Tributários</label>
            <div className="border border-green-200 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {REGIMES_TRIBUTARIOS.map(r => (
                <label key={r.value} className="flex items-center gap-2 text-slate-700 text-sm">
                  <input
                    type="checkbox"
                    checked={form.regimesTributarios.includes(r.value)}
                    onChange={() => alternarRegime(r.value)}
                    className="w-4 h-4"
                  />
                  {r.label}
                </label>
              ))}
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Nenhum marcado = vale para todos os regimes.
            </p>
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
              placeholder="ISS, IR, SPED"
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-2 font-semibold">Próxima obrigação (gerar ao concluir)</label>
            <select
              value={form.proximoModeloId}
              onChange={e => atualizarCampo('proximoModeloId', e.target.value)}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            >
              <option value="">Nenhuma</option>
              {modelos.map(m => (
                <option key={m.id} value={m.id}>{m.titulo}</option>
              ))}
            </select>
            <p className="text-slate-500 text-sm mt-1">
              Ao concluir uma obrigação gerada por este modelo, cria automaticamente uma nova obrigação deste
              modelo escolhido para o mesmo cliente.
            </p>
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            {salvando ? 'Salvando...' : 'Salvar Modelo'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
