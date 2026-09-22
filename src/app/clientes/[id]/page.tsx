// src/app/clientes/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, Trash2 } from 'lucide-react'
import AppShell from '@/components/AppShell'

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

interface TarefaVinculada {
  id: string
  titulo: string
  status: string
  tipo: string
  etapaChave: string | null
}

const formInicial = {
  nome: '',
  razaoSocial: '',
  nomeFantasia: '',
  cnpjCpf: '',
  tipoPessoa: 'juridica',
  regimeTributario: 'simples_nacional',
  inscricaoEstadual: '',
  inscricaoMunicipal: '',
  email: '',
  telefone: '',
  responsavel: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  situacaoCadastral: '',
  atividadePrincipal: '',
  dataAbertura: '',
  clienteDesde: '',
  possuiFuncionarios: false,
  possuiIcms: false,
  possuiRetencoes: false,
  observacoes: '',
  ativo: true,
}

export default function DetalheCliente({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [encontrado, setEncontrado] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [erro, setErro] = useState('')
  const [avisoCnpj, setAvisoCnpj] = useState('')
  const [form, setForm] = useState(formInicial)
  const [tarefasVinculadas, setTarefasVinculadas] = useState<TarefaVinculada[]>([])

  useEffect(() => {
    fetch(`/api/tarefas?clienteId=${params.id}`)
      .then(res => res.json())
      .then(dados => setTarefasVinculadas(Array.isArray(dados) ? dados : []))
      .catch(err => console.error('Erro ao carregar tarefas do cliente:', err))
  }, [params.id])

  useEffect(() => {
    fetch(`/api/clientes/${params.id}`)
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
          nome: dados.nome ?? '',
          razaoSocial: dados.razaoSocial ?? '',
          nomeFantasia: dados.nomeFantasia ?? '',
          cnpjCpf: dados.cnpjCpf ?? '',
          tipoPessoa: dados.tipoPessoa ?? 'juridica',
          regimeTributario: dados.regimeTributario ?? 'simples_nacional',
          inscricaoEstadual: dados.inscricaoEstadual ?? '',
          inscricaoMunicipal: dados.inscricaoMunicipal ?? '',
          email: dados.email ?? '',
          telefone: dados.telefone ?? '',
          responsavel: dados.responsavel ?? '',
          cep: dados.cep ?? '',
          logradouro: dados.logradouro ?? '',
          numero: dados.numero ?? '',
          complemento: dados.complemento ?? '',
          bairro: dados.bairro ?? '',
          cidade: dados.cidade ?? '',
          estado: dados.estado ?? '',
          situacaoCadastral: dados.situacaoCadastral ?? '',
          atividadePrincipal: dados.atividadePrincipal ?? '',
          dataAbertura: dados.dataAbertura ? String(dados.dataAbertura).slice(0, 10) : '',
          clienteDesde: dados.clienteDesde ? String(dados.clienteDesde).slice(0, 10) : '',
          possuiFuncionarios: dados.possuiFuncionarios ?? false,
          possuiIcms: dados.possuiIcms ?? false,
          possuiRetencoes: dados.possuiRetencoes ?? false,
          observacoes: dados.observacoes ?? '',
          ativo: dados.ativo ?? true,
        })
      })
      .catch(err => console.error('Erro ao carregar cliente:', err))
      .finally(() => setCarregando(false))
  }, [params.id])

  const atualizarCampo = (campo: string, valor: string | boolean) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const buscarCnpj = async () => {
    const cnpjLimpo = form.cnpjCpf.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) {
      setAvisoCnpj('Digite um CNPJ com 14 dígitos para buscar automaticamente.')
      return
    }

    setAvisoCnpj('')
    setBuscandoCnpj(true)
    try {
      const response = await fetch(`/api/cnpj/${cnpjLimpo}`)
      const dados = await response.json()

      if (!response.ok) {
        setAvisoCnpj(dados.error || 'Não foi possível encontrar esse CNPJ.')
        return
      }

      setForm(prev => ({
        ...prev,
        nome: dados.nome || prev.nome,
        razaoSocial: dados.razaoSocial || prev.razaoSocial,
        nomeFantasia: dados.nomeFantasia || prev.nomeFantasia,
        email: dados.email || prev.email,
        telefone: dados.telefone || prev.telefone,
        cep: dados.cep || prev.cep,
        logradouro: dados.logradouro || prev.logradouro,
        numero: dados.numero || prev.numero,
        complemento: dados.complemento || prev.complemento,
        bairro: dados.bairro || prev.bairro,
        cidade: dados.cidade || prev.cidade,
        estado: dados.estado || prev.estado,
        situacaoCadastral: dados.situacaoCadastral || prev.situacaoCadastral,
        atividadePrincipal: dados.atividadePrincipal || prev.atividadePrincipal,
        dataAbertura: dados.dataAbertura || prev.dataAbertura,
      }))
    } catch (error) {
      console.error(error)
      setAvisoCnpj('Erro ao consultar o CNPJ. Tente novamente.')
    } finally {
      setBuscandoCnpj(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!form.nome) {
      setErro('Preencha o nome do cliente.')
      return
    }

    setSalvando(true)
    try {
      const response = await fetch(`/api/clientes/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
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
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return

    try {
      const response = await fetch(`/api/clientes/${params.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Erro ao excluir')
      router.push('/clientes')
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
        <div className="max-w-3xl mx-auto">
          <Link href="/clientes" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Clientes
          </Link>
          <div className="bg-white rounded-lg p-8 text-center border border-green-100 shadow-sm">
            <p className="text-slate-600 text-lg">Cliente não encontrado.</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/clientes" className="flex items-center gap-2 text-slate-500 hover:text-green-700 transition">
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Clientes
          </Link>
          <button
            onClick={excluir}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Editar Cliente</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 border border-green-100 shadow-sm space-y-6">
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {erro}
            </div>
          )}

          <section className="space-y-4">
            <h2 className="text-green-700 font-bold uppercase text-xs tracking-wide">Identificação</h2>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">CNPJ / CPF</label>
                <input
                  type="text"
                  value={form.cnpjCpf}
                  onChange={e => atualizarCampo('cnpjCpf', e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
              <button
                type="button"
                onClick={buscarCnpj}
                disabled={buscandoCnpj}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                {buscandoCnpj ? 'Buscando...' : 'Buscar CNPJ'}
              </button>
            </div>
            {avisoCnpj && <p className="text-amber-700 text-sm">{avisoCnpj}</p>}

            <div>
              <label className="block text-slate-700 mb-2 font-semibold">Nome (usado no sistema) *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => atualizarCampo('nome', e.target.value)}
                className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">Razão Social</label>
                <input
                  type="text"
                  value={form.razaoSocial}
                  onChange={e => atualizarCampo('razaoSocial', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">Nome Fantasia</label>
                <input
                  type="text"
                  value={form.nomeFantasia}
                  onChange={e => atualizarCampo('nomeFantasia', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">Tipo de Pessoa</label>
                <select
                  value={form.tipoPessoa}
                  onChange={e => atualizarCampo('tipoPessoa', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                >
                  <option value="juridica">Pessoa Jurídica</option>
                  <option value="fisica">Pessoa Física</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">Regime Tributário *</label>
                <select
                  value={form.regimeTributario}
                  onChange={e => atualizarCampo('regimeTributario', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                >
                  <option value="simples_nacional">Simples Nacional</option>
                  <option value="lucro_presumido">Lucro Presumido</option>
                  <option value="lucro_real">Lucro Real</option>
                  <option value="mei">MEI</option>
                  <option value="pessoa_fisica">Pessoa Física</option>
                  <option value="produtor_rural">Produtor Rural</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">Situação Cadastral</label>
                <input
                  type="text"
                  value={form.situacaoCadastral}
                  onChange={e => atualizarCampo('situacaoCadastral', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">Inscrição Estadual</label>
                <input
                  type="text"
                  value={form.inscricaoEstadual}
                  onChange={e => atualizarCampo('inscricaoEstadual', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">Inscrição Municipal</label>
                <input
                  type="text"
                  value={form.inscricaoMunicipal}
                  onChange={e => atualizarCampo('inscricaoMunicipal', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 mb-2 font-semibold">Atividade Principal</label>
              <input
                type="text"
                value={form.atividadePrincipal}
                onChange={e => atualizarCampo('atividadePrincipal', e.target.value)}
                className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-green-100 pt-5">
            <h2 className="text-green-700 font-bold uppercase text-xs tracking-wide">Contato</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">Responsável</label>
                <input
                  type="text"
                  value={form.responsavel}
                  onChange={e => atualizarCampo('responsavel', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => atualizarCampo('email', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">Telefone</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={e => atualizarCampo('telefone', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-green-100 pt-5">
            <h2 className="text-green-700 font-bold uppercase text-xs tracking-wide">Endereço</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">CEP</label>
                <input
                  type="text"
                  value={form.cep}
                  onChange={e => atualizarCampo('cep', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-700 mb-2 font-semibold">Logradouro</label>
                <input
                  type="text"
                  value={form.logradouro}
                  onChange={e => atualizarCampo('logradouro', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">Número</label>
                <input
                  type="text"
                  value={form.numero}
                  onChange={e => atualizarCampo('numero', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">Complemento</label>
                <input
                  type="text"
                  value={form.complemento}
                  onChange={e => atualizarCampo('complemento', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">Bairro</label>
                <input
                  type="text"
                  value={form.bairro}
                  onChange={e => atualizarCampo('bairro', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">Cidade</label>
                <input
                  type="text"
                  value={form.cidade}
                  onChange={e => atualizarCampo('cidade', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-2 font-semibold">Estado</label>
                <select
                  value={form.estado}
                  onChange={e => atualizarCampo('estado', e.target.value)}
                  className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
                >
                  <option value="">Selecione</option>
                  {ESTADOS.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-green-100 pt-5">
            <h2 className="text-green-700 font-bold uppercase text-xs tracking-wide">Vínculo com o escritório</h2>
            <div>
              <label className="block text-slate-700 mb-2 font-semibold">Cliente desde</label>
              <input
                type="date"
                value={form.clienteDesde}
                onChange={e => atualizarCampo('clienteDesde', e.target.value)}
                className="w-full sm:w-64 bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
              />
              <p className="text-slate-500 text-sm mt-1">
                Data em que o cliente passou a ser atendido pelo escritório. O motor de obrigações não gera obrigações
                para competências anteriores a este mês. Deixe em branco para gerar normalmente desde já.
              </p>
            </div>
          </section>

          <section className="space-y-3 border-t border-green-100 pt-5">
            <h2 className="text-green-700 font-bold uppercase text-xs tracking-wide">
              Perfil fiscal (usado para gerar obrigações automaticamente)
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={form.possuiFuncionarios}
                  onChange={e => atualizarCampo('possuiFuncionarios', e.target.checked)}
                  className="w-4 h-4"
                />
                Possui funcionários
              </label>
              <label className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={form.possuiIcms}
                  onChange={e => atualizarCampo('possuiIcms', e.target.checked)}
                  className="w-4 h-4"
                />
                Contribuinte de ICMS
              </label>
              <label className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={form.possuiRetencoes}
                  onChange={e => atualizarCampo('possuiRetencoes', e.target.checked)}
                  className="w-4 h-4"
                />
                Sofre retenções (INSS/IR/etc)
              </label>
            </div>
            <p className="text-slate-500 text-sm">
              Ao salvar, as obrigações pendentes deste mês são recalculadas automaticamente conforme esse perfil.
            </p>
          </section>

          <section className="border-t border-green-100 pt-5">
            <label className="block text-slate-700 mb-2 font-semibold">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => atualizarCampo('observacoes', e.target.value)}
              rows={3}
              className="w-full bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            />
          </section>

          <label className="flex items-center gap-2 text-slate-600 border-t border-green-100 pt-5">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={e => atualizarCampo('ativo', e.target.checked)}
              className="w-4 h-4"
            />
            Cliente ativo (só clientes ativos entram na geração automática de obrigações e honorários)
          </label>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>

        {tarefasVinculadas.length > 0 && (
          <div className="bg-white rounded-lg p-6 border border-green-100 shadow-sm mt-6">
            <h2 className="text-slate-900 font-bold mb-4">Tarefas vinculadas</h2>
            <div className="space-y-2">
              {tarefasVinculadas.map(t => (
                <Link
                  key={t.id}
                  href={`/tarefas/${t.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-green-100 hover:bg-green-50 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-800">{t.titulo}</span>
                    {t.tipo === 'societaria' && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-bold">
                        Societária
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 text-sm">{t.status}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
