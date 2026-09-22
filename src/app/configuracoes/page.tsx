// src/app/configuracoes/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, ArrowUp, ArrowDown } from 'lucide-react'
import AppShell from '@/components/AppShell'

interface ItemFechamento {
  chave: string
  label: string
  critico: boolean
}

interface ItemTarefa {
  chave: string
  label: string
}

interface EtapaSocietaria {
  chave: string
  label: string
}

function slugify(label: string) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || `item_${Date.now()}`
}

export default function ConfiguracoesPage() {
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [checklistFechamento, setChecklistFechamento] = useState<ItemFechamento[]>([])
  const [checklistTarefa, setChecklistTarefa] = useState<ItemTarefa[]>([])
  const [roteiroSocietario, setRoteiroSocietario] = useState<EtapaSocietaria[]>([])
  const [novoItemFechamento, setNovoItemFechamento] = useState('')
  const [novoItemTarefa, setNovoItemTarefa] = useState('')
  const [novaEtapaSocietaria, setNovaEtapaSocietaria] = useState('')

  useEffect(() => {
    fetch('/api/configuracoes')
      .then(res => res.json())
      .then(dados => {
        setChecklistFechamento(dados.checklistFechamento ?? [])
        setChecklistTarefa(dados.checklistTarefa ?? [])
        setRoteiroSocietario(dados.roteiroSocietario ?? [])
      })
      .catch(err => console.error('Erro ao carregar configurações:', err))
      .finally(() => setCarregando(false))
  }, [])

  const adicionarItemFechamento = () => {
    if (!novoItemFechamento.trim()) return
    setChecklistFechamento(prev => [
      ...prev,
      { chave: slugify(novoItemFechamento), label: novoItemFechamento.trim(), critico: false },
    ])
    setNovoItemFechamento('')
  }

  const alternarCriticoFechamento = (chave: string) => {
    setChecklistFechamento(prev =>
      prev.map(item => (item.chave === chave ? { ...item, critico: !item.critico } : item))
    )
  }

  const removerItemFechamento = (chave: string) => {
    setChecklistFechamento(prev => prev.filter(item => item.chave !== chave))
  }

  const adicionarItemTarefa = () => {
    if (!novoItemTarefa.trim()) return
    setChecklistTarefa(prev => [
      ...prev,
      { chave: slugify(novoItemTarefa), label: novoItemTarefa.trim() },
    ])
    setNovoItemTarefa('')
  }

  const removerItemTarefa = (chave: string) => {
    setChecklistTarefa(prev => prev.filter(item => item.chave !== chave))
  }

  const adicionarEtapaSocietaria = () => {
    if (!novaEtapaSocietaria.trim()) return
    setRoteiroSocietario(prev => [
      ...prev,
      { chave: slugify(novaEtapaSocietaria), label: novaEtapaSocietaria.trim() },
    ])
    setNovaEtapaSocietaria('')
  }

  const removerEtapaSocietaria = (chave: string) => {
    setRoteiroSocietario(prev => prev.filter(item => item.chave !== chave))
  }

  const moverEtapaSocietaria = (indice: number, direcao: -1 | 1) => {
    setRoteiroSocietario(prev => {
      const novoIndice = indice + direcao
      if (novoIndice < 0 || novoIndice >= prev.length) return prev
      const copia = [...prev]
      const [item] = copia.splice(indice, 1)
      copia.splice(novoIndice, 0, item)
      return copia
    })
  }

  const salvar = async (chave: string, valor: unknown) => {
    setSalvando(true)
    setMensagem('')
    try {
      const res = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave, valor }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setMensagem('Configuração salva.')
    } catch (error) {
      console.error(error)
      setMensagem('Não foi possível salvar.')
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

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Configurações</h1>
        <p className="text-slate-500 mb-8">
          Personalize os checklists padrão usados no fechamento mensal e na criação de tarefas.
        </p>

        {mensagem && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {mensagem}
          </div>
        )}

        <section className="bg-white rounded-lg p-6 border border-green-100 shadow-sm mb-8">
          <h2 className="text-slate-900 font-bold mb-1">Checklist de Fechamento Mensal</h2>
          <p className="text-slate-500 text-sm mb-4">
            Itens marcados como &quot;crítico&quot; bloqueiam o encerramento da competência sem justificativa.
          </p>

          <div className="space-y-2 mb-4">
            {checklistFechamento.map(item => (
              <div key={item.chave} className="flex items-center gap-3 p-3 rounded-lg border border-green-100">
                <span className="flex-1 text-slate-800">{item.label}</span>
                <label className="flex items-center gap-2 text-sm text-orange-600 font-semibold">
                  <input
                    type="checkbox"
                    checked={item.critico}
                    onChange={() => alternarCriticoFechamento(item.chave)}
                    className="w-4 h-4"
                  />
                  Crítico
                </label>
                <button
                  onClick={() => removerItemFechamento(item.chave)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {checklistFechamento.length === 0 && (
              <p className="text-slate-500 text-sm">Nenhum item. Adicione abaixo.</p>
            )}
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={novoItemFechamento}
              onChange={e => setNovoItemFechamento(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionarItemFechamento())}
              placeholder="Novo item do checklist"
              className="flex-1 bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            />
            <button
              onClick={adicionarItemFechamento}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          <button
            onClick={() => salvar('checklist_fechamento', checklistFechamento)}
            disabled={salvando}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Save className="w-4 h-4" />
            Salvar Checklist de Fechamento
          </button>
        </section>

        <section className="bg-white rounded-lg p-6 border border-green-100 shadow-sm">
          <h2 className="text-slate-900 font-bold mb-1">Checklist Padrão de Tarefas</h2>
          <p className="text-slate-500 text-sm mb-4">
            Usado para preencher automaticamente o checklist de cada nova tarefa criada.
          </p>

          <div className="space-y-2 mb-4">
            {checklistTarefa.map(item => (
              <div key={item.chave} className="flex items-center gap-3 p-3 rounded-lg border border-green-100">
                <span className="flex-1 text-slate-800">{item.label}</span>
                <button
                  onClick={() => removerItemTarefa(item.chave)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {checklistTarefa.length === 0 && (
              <p className="text-slate-500 text-sm">Nenhum item. Adicione abaixo.</p>
            )}
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={novoItemTarefa}
              onChange={e => setNovoItemTarefa(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionarItemTarefa())}
              placeholder="Novo item do checklist"
              className="flex-1 bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            />
            <button
              onClick={adicionarItemTarefa}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          <button
            onClick={() => salvar('checklist_tarefa', checklistTarefa)}
            disabled={salvando}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Save className="w-4 h-4" />
            Salvar Checklist de Tarefas
          </button>
        </section>

        <section className="bg-white rounded-lg p-6 border border-green-100 shadow-sm mt-8">
          <h2 className="text-slate-900 font-bold mb-1">Roteiro de Abertura de Empresa (Societário)</h2>
          <p className="text-slate-500 text-sm mb-4">
            Sequência de etapas usada nas tarefas do tipo &quot;Abertura de Empresa&quot;. A ordem importa: ao concluir
            uma etapa, a próxima da lista é oferecida automaticamente.
          </p>

          <div className="space-y-2 mb-4">
            {roteiroSocietario.map((item, indice) => (
              <div key={item.chave} className="flex items-center gap-3 p-3 rounded-lg border border-green-100">
                <span className="text-slate-400 text-sm font-mono w-6">{indice + 1}.</span>
                <span className="flex-1 text-slate-800">{item.label}</span>
                <button
                  onClick={() => moverEtapaSocietaria(indice, -1)}
                  disabled={indice === 0}
                  className="text-slate-500 hover:text-green-700 disabled:opacity-30"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moverEtapaSocietaria(indice, 1)}
                  disabled={indice === roteiroSocietario.length - 1}
                  className="text-slate-500 hover:text-green-700 disabled:opacity-30"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removerEtapaSocietaria(item.chave)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {roteiroSocietario.length === 0 && (
              <p className="text-slate-500 text-sm">Nenhuma etapa. Adicione abaixo.</p>
            )}
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={novaEtapaSocietaria}
              onChange={e => setNovaEtapaSocietaria(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionarEtapaSocietaria())}
              placeholder="Nova etapa do roteiro"
              className="flex-1 bg-white border border-green-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-green-500"
            />
            <button
              onClick={adicionarEtapaSocietaria}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          <button
            onClick={() => salvar('checklist_societario', roteiroSocietario)}
            disabled={salvando}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Save className="w-4 h-4" />
            Salvar Roteiro Societário
          </button>
        </section>
      </div>
    </AppShell>
  )
}
