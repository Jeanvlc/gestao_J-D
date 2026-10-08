'use client'
// Tabela de cadastro simples (lista + formulário). Usada em máquinas, tanques e centros de custo.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deInputDataHora, fmtDataHora, fmtNum, paraInputDataHora, parseNum } from '@/lib/format'

export type Campo = { k: string; rotulo: string; tipo?: 'texto' | 'num' | 'datahora' | 'opcao'; opcoes?: { valor: string; rotulo: string }[] }
type Linha = Record<string, any>

// valores do banco ↔ texto dos inputs
const paraForm = (c: Campo, v: any) =>
  c.tipo === 'datahora' ? (v ? paraInputDataHora(v) : '') : c.tipo === 'num' ? String(v ?? '').replace('.', ',') : v ?? ''
const doForm = (c: Campo, v: any) =>
  c.tipo === 'datahora' ? (v ? deInputDataHora(v) : undefined) : c.tipo === 'num' ? parseNum(v) ?? 0 : String(v).trim() || null
const mostrar = (c: Campo, v: any) =>
  c.tipo === 'datahora' ? (v ? fmtDataHora(v) : '') : c.tipo === 'num' ? fmtNum(Number(v), 2)
    : c.tipo === 'opcao' ? c.opcoes?.find((o) => o.valor === v)?.rotulo ?? '—' : v ?? ''

export function Crud({ titulo, tabela, campos, ordem, item, aoMudar }: {
  titulo: string; tabela: string; campos: Campo[]; ordem: string; item: string; aoMudar?: () => void
}) {
  const sb = createClient()
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [editando, setEditando] = useState<Linha | null>(null)
  const [erro, setErro] = useState('')

  const carregar = () => sb.from(tabela).select('*').order(ordem).then(({ data, error }) => error ? setErro(error.message) : setLinhas(data))
  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const recarregar = () => { carregar(); aoMudar?.() }

  const novo = () => setEditando(Object.fromEntries(campos.map((c) => [c.k, paraForm(c, undefined)])))
  const editar = (l: Linha) => setEditando({ id: l.id, ...Object.fromEntries(campos.map((c) => [c.k, paraForm(c, l[c.k])])) })

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    const dados = Object.fromEntries(campos.map((c) => [c.k, doForm(c, editando![c.k])]).filter(([, v]) => v !== undefined))
    if (campos.some((c) => c.tipo === 'num' && Number.isNaN(dados[c.k]))) return setErro('Confira os números: use vírgula para decimais.')
    const { error } = editando!.id
      ? await sb.from(tabela).update(dados).eq('id', editando!.id)
      : await sb.from(tabela).insert(dados)
    if (error) return setErro(error.code === '23505' ? `Já existe ${item} com esse nome ou prefixo.` : error.message)
    setEditando(null)
    recarregar()
  }

  async function alternarAtivo(l: Linha) {
    const { error } = await sb.from(tabela).update({ ativo: !l.ativo }).eq('id', l.id)
    if (error) return setErro(error.message)
    recarregar()
  }

  async function excluir(l: Linha) {
    if (!confirm('Excluir definitivamente?')) return
    const { error } = await sb.from(tabela).delete().eq('id', l.id)
    if (error) return setErro(error.code === '23503' ? 'Há lançamentos ligados a este cadastro. Desative em vez de excluir.' : error.message)
    recarregar()
  }

  return (
    <section className="cartao">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-mata-escuro">{titulo}</h2>
        {!editando && <button className="btn-mata" onClick={novo}>Adicionar {item}</button>}
      </div>
      {erro && <p role="alert" className="mb-3 rounded-xl bg-alerta-claro px-4 py-2 text-alerta">{erro}</p>}
      {editando && (
        <form onSubmit={salvar} className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-fundo p-4">
          {campos.map((c) => (
            <label key={c.k} className="min-w-[180px] flex-1">
              <span className="rotulo">{c.rotulo}</span>
              {c.tipo === 'opcao' ? (
                <select className="campo py-2.5 text-base" value={editando[c.k]} onChange={(e) => setEditando({ ...editando, [c.k]: e.target.value })}>
                  <option value="">Sem centro de custo</option>
                  {c.opcoes?.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                </select>
              ) : (
                <input className="campo py-2.5 text-base" type={c.tipo === 'datahora' ? 'datetime-local' : 'text'} inputMode={c.tipo === 'num' ? 'decimal' : undefined}
                  value={editando[c.k]} onChange={(e) => setEditando({ ...editando, [c.k]: e.target.value })} />
              )}
            </label>
          ))}
          <div className="flex gap-2">
            <button className="btn-mata">Salvar</button>
            <button type="button" className="btn-2 py-3" onClick={() => setEditando(null)}>Cancelar</button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto">
        <table className="tabela">
          <thead><tr>{campos.map((c) => <th key={c.k}>{c.rotulo}</th>)}<th>Situação</th><th /></tr></thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className={l.ativo === false ? 'text-tinta/40' : ''}>
                {campos.map((c, i) => <td key={c.k} className={i === 0 ? 'font-semibold' : ''}>{String(mostrar(c, l[c.k]))}</td>)}
                <td>{l.ativo ? 'Ativo' : 'Inativo'}</td>
                <td className="whitespace-nowrap text-right">
                  <button className="px-2 font-semibold text-mata underline" onClick={() => editar(l)}>Editar</button>
                  <button className="px-2 font-semibold text-mata underline" onClick={() => alternarAtivo(l)}>{l.ativo ? 'Desativar' : 'Ativar'}</button>
                  <button className="px-2 font-semibold text-alerta underline" onClick={() => excluir(l)}>Excluir</button>
                </td>
              </tr>
            ))}
            {!linhas.length && <tr><td colSpan={campos.length + 2} className="py-6 text-center text-tinta/55">Nenhum cadastro ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
