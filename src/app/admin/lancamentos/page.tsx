'use client'
// Ver e corrigir lançamentos: o admin exclui o que foi lançado errado.
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Abastecimento, Movimento } from '@/lib/db'
import { fimDiaSP, fmtDataHora, fmtNum, hojeSP, inicioDiaSP, parseNum } from '@/lib/format'
import { todos } from '../dados'

type Nome = { id: string; nome: string }
type Maq = { id: string; codigo: string; nome: string }
type Perfil = { user_id: string; nome: string }
type Dados = { abast: Abastecimento[]; movs: Movimento[]; maquinas: Maq[]; tanques: Nome[]; perfis: Perfil[] }

// ponytail: mostra no máximo 300 por vez; paginar se o período tiver mais que isso
const LIMITE = 300

export default function Lancamentos() {
  const [d, setD] = useState<Dados | null>(null)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState<'abast' | 'movs'>('abast')
  const [de, setDe] = useState(hojeSP().slice(0, 8) + '01')
  const [ate, setAte] = useState(hojeSP())
  const [maquina, setMaquina] = useState('')
  const [pessoa, setPessoa] = useState('')
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [edit, setEdit] = useState<{ id: string; tabela: 'va_abastecimentos' | 'va_tanque_movimentos'; litros: string; leitura: string; unidade: 'horimetro' | 'km'; texto: string } | null>(null)

  const num = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','))
  const editarAbast = (a: Abastecimento) => setEdit({ id: a.id, tabela: 'va_abastecimentos', litros: num(Number(a.litros)), unidade: a.km != null && a.horimetro == null ? 'km' : 'horimetro', leitura: num(a.horimetro ?? a.km), texto: a.observacao ?? '' })
  const editarMov = (m: Movimento) => setEdit({ id: m.id, tabela: 'va_tanque_movimentos', litros: num(Number(m.litros)), unidade: 'horimetro', leitura: '', texto: m.nota_fiscal ?? '' })

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault()
    if (!edit) return
    setErro('')
    const litros = parseNum(edit.litros), leitura = parseNum(edit.leitura)
    if (litros == null || Number.isNaN(litros) || litros < 0 || Number.isNaN(leitura)) return setErro('Confira os números: use vírgula para decimais.')
    const dados = edit.tabela === 'va_abastecimentos'
      ? { litros, horimetro: edit.unidade === 'horimetro' ? leitura : null, km: edit.unidade === 'km' ? leitura : null, observacao: edit.texto.trim() || null }
      : { litros, nota_fiscal: edit.texto.trim() || null }
    const { data, error } = await createClient().from(edit.tabela).update(dados).eq('id', edit.id).select()
    if (error || !data?.length) return setErro(`Não foi possível salvar${error ? ': ' + error.message : '.'}`)
    setD((x) => x && (edit.tabela === 'va_abastecimentos'
      ? { ...x, abast: x.abast.map((a) => (a.id === edit.id ? { ...a, ...dados } as Abastecimento : a)) }
      : { ...x, movs: x.movs.map((m) => (m.id === edit.id ? { ...m, ...dados } as Movimento : m)) }))
    setEdit(null)
  }

  // chamado como função (não como <Componente/>) para o formulário não ser recriado a cada tecla
  const FormEdicao = ({ abast }: { abast: boolean }) => (
    <form onSubmit={salvarEdicao} className="mt-3 flex w-full flex-wrap items-end gap-3 rounded-xl bg-fundo p-3">
      <label><span className="rotulo">Litros</span><input className="campo w-32 py-2 text-base" inputMode="decimal" value={edit!.litros} onChange={(e) => setEdit({ ...edit!, litros: e.target.value })} /></label>
      {abast && (
        <label><span className="rotulo">{edit!.unidade === 'horimetro' ? 'Horímetro' : 'Km'}</span>
          <input className="campo w-36 py-2 text-base" inputMode="decimal" value={edit!.leitura} onChange={(e) => setEdit({ ...edit!, leitura: e.target.value })} /></label>
      )}
      <label className="min-w-[180px] flex-1"><span className="rotulo">{abast ? 'Observação' : 'Nota fiscal'}</span>
        <input className="campo py-2 text-base" value={edit!.texto} onChange={(e) => setEdit({ ...edit!, texto: e.target.value })} /></label>
      <button className="btn-mata">Salvar</button>
      <button type="button" className="btn-2 py-3" onClick={() => setEdit(null)}>Cancelar</button>
    </form>
  )

  useEffect(() => {
    Promise.all([
      todos<Abastecimento>('va_abastecimentos'), todos<Movimento>('va_tanque_movimentos'),
      todos<Maq>('va_maquinas', 'id,codigo,nome'), todos<Nome>('va_tanques', 'id,nome'), todos<Perfil>('va_perfis', 'user_id,nome'),
    ]).then(([abast, movs, maquinas, tanques, perfis]) => setD({ abast, movs, maquinas, tanques, perfis }))
      .catch((e) => setErro(e.message))
  }, [])

  const v = useMemo(() => {
    if (!d) return null
    const t0 = Date.parse(inicioDiaSP(de)), t1 = Date.parse(fimDiaSP(ate))
    const ok = (x: { data_hora: string; user_id: string }) => {
      const t = Date.parse(x.data_hora)
      return t >= t0 && t <= t1 && (!pessoa || x.user_id === pessoa)
    }
    const recentes = <T extends { data_hora: string }>(xs: T[]) => xs.sort((a, b) => Date.parse(b.data_hora) - Date.parse(a.data_hora))
    return {
      abast: recentes(d.abast.filter((a) => ok(a) && (!maquina || a.maquina_id === maquina))),
      movs: recentes(d.movs.filter(ok)),
      maq: new Map(d.maquinas.map((m) => [m.id, m])),
      tanque: new Map(d.tanques.map((t) => [t.id, t.nome])),
      nome: new Map(d.perfis.map((p) => [p.user_id, p.nome])),
    }
  }, [d, de, ate, maquina, pessoa])

  async function excluir(tabela: 'va_abastecimentos' | 'va_tanque_movimentos', id: string, descricao: string) {
    if (!confirm(`Excluir ${descricao}?\n\nIsso não pode ser desfeito. O saldo do tanque será recalculado.`)) return
    setErro(''); setExcluindo(id)
    const { error } = await createClient().from(tabela).delete().eq('id', id)
    setExcluindo(null)
    if (error) return setErro(`Não foi possível excluir: ${error.message}`)
    setD((x) => x && (tabela === 'va_abastecimentos'
      ? { ...x, abast: x.abast.filter((a) => a.id !== id) }
      : { ...x, movs: x.movs.filter((m) => m.id !== id) }))
  }

  if (erro && !d) return <p className="text-alerta">Erro: {erro}</p>
  if (!d || !v) return <p>Carregando…</p>
  const lista = aba === 'abast' ? v.abast : v.movs

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-mata-escuro">Lançamentos</h1>
          <p className="text-tinta/65">Confira o que foi lançado no campo, corrija ou exclua o que estiver errado.</p>
        </div>
        <div className="segmento w-full sm:w-auto">
          <button aria-pressed={aba === 'abast'} onClick={() => setAba('abast')} className="whitespace-nowrap px-4">Abastecimentos ({v.abast.length})</button>
          <button aria-pressed={aba === 'movs'} onClick={() => setAba('movs')} className="whitespace-nowrap px-4">Entradas e medições ({v.movs.length})</button>
        </div>
      </div>

      <section className="cartao grid grid-cols-2 gap-3 md:grid-cols-4">
        <label><span className="rotulo">De</span><input type="date" className="campo py-2 text-base" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label><span className="rotulo">Até</span><input type="date" className="campo py-2 text-base" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        {aba === 'abast' && (
          <label><span className="rotulo">Máquina</span>
            <select className="campo py-2 text-base" value={maquina} onChange={(e) => setMaquina(e.target.value)}>
              <option value="">Todas</option>
              {d.maquinas.map((m) => <option key={m.id} value={m.id}>{m.codigo} {m.nome}</option>)}
            </select>
          </label>
        )}
        <label><span className="rotulo">Lançado por</span>
          <select className="campo py-2 text-base" value={pessoa} onChange={(e) => setPessoa(e.target.value)}>
            <option value="">Todos</option>
            {d.perfis.map((p) => <option key={p.user_id} value={p.user_id}>{p.nome}</option>)}
          </select>
        </label>
      </section>

      {erro && <p role="alert" className="rounded-xl bg-alerta-claro px-4 py-3 text-alerta">{erro}</p>}
      {!lista.length && <p className="cartao py-8 text-center text-tinta/60">Nenhum lançamento nesse período.</p>}

      <ul className="space-y-2">
        {aba === 'abast' && v.abast.slice(0, LIMITE).map((a) => {
          const m = v.maq.get(a.maquina_id)
          return (
            <li key={a.id} className="cartao flex flex-wrap items-center gap-x-6 gap-y-1 border-l-[6px] border-diesel py-3">
              <div className="num w-full text-[15px] text-tinta/65 sm:w-36">{fmtDataHora(a.data_hora)}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate"><b className="font-display text-xl">{m?.codigo ?? '?'}</b> <span className="text-tinta/70">{m?.nome}</span></div>
                <div className="text-[15px] text-tinta/60">
                  {v.nome.get(a.user_id) ?? 'Usuário removido'}, {v.tanque.get(a.tanque_id)}{a.criado_offline ? ', lançado sem sinal' : ''}
                </div>
                {a.observacao && <div className="text-[15px] italic text-tinta/70">“{a.observacao}”</div>}
              </div>
              <div className="num text-right">
                <div className="font-display text-2xl font-bold">{fmtNum(Number(a.litros), 2)} L</div>
                <div className="text-[15px] text-tinta/60">
                  {a.horimetro != null ? `${fmtNum(Number(a.horimetro))} h` : a.km != null ? `${fmtNum(Number(a.km))} km` : 'sem leitura'}
                </div>
              </div>
              <button onClick={() => editarAbast(a)} className="rounded-xl px-3 py-2 font-semibold text-mata hover:bg-mata-claro">Editar</button>
              <button disabled={excluindo === a.id} onClick={() => excluir('va_abastecimentos', a.id, `o abastecimento de ${fmtNum(Number(a.litros), 2)} L em ${m?.codigo ?? 'máquina'} (${fmtDataHora(a.data_hora)})`)}
                className="rounded-xl px-3 py-2 font-semibold text-alerta hover:bg-alerta-claro disabled:opacity-50">
                {excluindo === a.id ? 'Excluindo…' : 'Excluir'}
              </button>
              {edit?.id === a.id && FormEdicao({ abast: true })}
            </li>
          )
        })}
        {aba === 'movs' && v.movs.slice(0, LIMITE).map((mv) => (
          <li key={mv.id} className="cartao flex flex-wrap items-center gap-x-6 gap-y-1 border-l-[6px] border-mata py-3">
            <div className="num w-full text-[15px] text-tinta/65 sm:w-36">{fmtDataHora(mv.data_hora)}</div>
            <div className="min-w-0 flex-1">
              <div><b className="font-display text-xl">{mv.tipo === 'entrada' ? 'Entrada' : 'Medição'}</b> <span className="text-tinta/70">{mv.nota_fiscal ? `NF ${mv.nota_fiscal}` : ''}</span></div>
              <div className="text-[15px] text-tinta/60">{v.nome.get(mv.user_id) ?? 'Usuário removido'}, {v.tanque.get(mv.tanque_id)}</div>
            </div>
            <div className="num font-display text-2xl font-bold">{fmtNum(Number(mv.litros), 2)} L</div>
            <button onClick={() => editarMov(mv)} className="rounded-xl px-3 py-2 font-semibold text-mata hover:bg-mata-claro">Editar</button>
            <button disabled={excluindo === mv.id} onClick={() => excluir('va_tanque_movimentos', mv.id, `a ${mv.tipo === 'entrada' ? 'entrada' : 'medição'} de ${fmtNum(Number(mv.litros), 2)} L (${fmtDataHora(mv.data_hora)})`)}
              className="rounded-xl px-3 py-2 font-semibold text-alerta hover:bg-alerta-claro disabled:opacity-50">
              {excluindo === mv.id ? 'Excluindo…' : 'Excluir'}
            </button>
            {edit?.id === mv.id && FormEdicao({ abast: false })}
          </li>
        ))}
      </ul>
      {lista.length > LIMITE && <p className="text-center text-tinta/60">Mostrando os {LIMITE} mais recentes. Diminua o período para ver os outros.</p>}
    </div>
  )
}
