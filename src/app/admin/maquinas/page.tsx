'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deInputDataHora, fmtDataHora, fmtNum, paraInputDataHora, parseNum } from '@/lib/format'

type Campo = { k: string; rotulo: string; tipo?: 'texto' | 'num' | 'datahora' | 'bool' }
type Linha = Record<string, any>

const MAQUINAS: Campo[] = [
  { k: 'codigo', rotulo: 'Código/prefixo' }, { k: 'nome', rotulo: 'Nome' }, { k: 'tipo', rotulo: 'Tipo' },
  { k: 'ativo', rotulo: 'Ativa', tipo: 'bool' },
]
const TANQUES: Campo[] = [
  { k: 'nome', rotulo: 'Nome' }, { k: 'saldo_inicial', rotulo: 'Saldo inicial (L)', tipo: 'num' },
  { k: 'data_saldo_inicial', rotulo: 'Data do saldo inicial', tipo: 'datahora' }, { k: 'ativo', rotulo: 'Ativo', tipo: 'bool' },
]

export default function Cadastros() {
  return (
    <div className="space-y-8">
      <Crud titulo="Máquinas" tabela="va_maquinas" campos={MAQUINAS} ordem="codigo" />
      <Crud titulo="Tanques / comboios" tabela="va_tanques" campos={TANQUES} ordem="nome" />
    </div>
  )
}

// valores do banco ↔ texto dos inputs
const paraForm = (c: Campo, v: any) =>
  c.tipo === 'bool' ? v !== false : c.tipo === 'datahora' ? (v ? paraInputDataHora(v) : '') : c.tipo === 'num' ? String(v ?? '').replace('.', ',') : v ?? ''
const doForm = (c: Campo, v: any) =>
  c.tipo === 'bool' ? !!v : c.tipo === 'datahora' ? (v ? deInputDataHora(v) : undefined) : c.tipo === 'num' ? parseNum(v) ?? 0 : String(v).trim() || null

function Crud({ titulo, tabela, campos, ordem }: { titulo: string; tabela: string; campos: Campo[]; ordem: string }) {
  const sb = createClient()
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [editando, setEditando] = useState<Linha | null>(null)
  const [erro, setErro] = useState('')

  const carregar = () => sb.from(tabela).select('*').order(ordem).then(({ data, error }) => error ? setErro(error.message) : setLinhas(data))
  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const novo = () => setEditando(Object.fromEntries(campos.map((c) => [c.k, paraForm(c, undefined)])))
  const editar = (l: Linha) => setEditando({ id: l.id, ...Object.fromEntries(campos.map((c) => [c.k, paraForm(c, l[c.k])])) })

  async function salvar() {
    setErro('')
    const dados = Object.fromEntries(campos.map((c) => [c.k, doForm(c, editando![c.k])]).filter(([, v]) => v !== undefined))
    if (campos.some((c) => c.tipo === 'num' && Number.isNaN(dados[c.k]))) return setErro('Número inválido')
    const { error } = editando!.id
      ? await sb.from(tabela).update(dados).eq('id', editando!.id)
      : await sb.from(tabela).insert(dados)
    if (error) return setErro(error.code === '23505' ? 'Já existe um cadastro com esse código/nome' : error.message)
    setEditando(null)
    carregar()
  }

  async function excluir(l: Linha) {
    if (!confirm('Excluir definitivamente?')) return
    const { error } = await sb.from(tabela).delete().eq('id', l.id)
    if (error) return setErro(error.code === '23503' ? 'Tem lançamentos ligados a este cadastro. Desative em vez de excluir.' : error.message)
    carregar()
  }

  const mostrar = (c: Campo, v: any) =>
    c.tipo === 'bool' ? (v ? 'sim' : 'não') : c.tipo === 'datahora' ? (v ? fmtDataHora(v) : '') : c.tipo === 'num' ? fmtNum(Number(v), 2) : v ?? ''

  return (
    <section>
      <div className="mb-2 flex items-center gap-4">
        <h2 className="text-lg font-bold">{titulo}</h2>
        <button className="btn-2 py-1" onClick={novo}>+ Novo</button>
      </div>
      {erro && <p className="mb-2 rounded bg-red-100 p-2 text-red-800">{erro}</p>}
      {editando && (
        <div className="cartao mb-3 flex flex-wrap items-end gap-3">
          {campos.map((c) => (
            <label key={c.k} className="text-sm">{c.rotulo}<br />
              {c.tipo === 'bool'
                ? <input type="checkbox" className="h-6 w-6" checked={editando[c.k]} onChange={(e) => setEditando({ ...editando, [c.k]: e.target.checked })} />
                : <input className="campo py-2 text-base" type={c.tipo === 'datahora' ? 'datetime-local' : 'text'} inputMode={c.tipo === 'num' ? 'decimal' : undefined}
                    value={editando[c.k]} onChange={(e) => setEditando({ ...editando, [c.k]: e.target.value })} />}
            </label>
          ))}
          <button className="btn py-2" onClick={salvar}>Salvar</button>
          <button className="btn-2 py-2" onClick={() => setEditando(null)}>Cancelar</button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="tabela">
          <thead><tr>{campos.map((c) => <th key={c.k}>{c.rotulo}</th>)}<th /></tr></thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className={l.ativo === false ? 'text-gray-400' : ''}>
                {campos.map((c) => <td key={c.k}>{String(mostrar(c, l[c.k]))}</td>)}
                <td className="whitespace-nowrap">
                  <button className="underline" onClick={() => editar(l)}>Editar</button>{' '}
                  <button className="text-red-700 underline" onClick={() => excluir(l)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
