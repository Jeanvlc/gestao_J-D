'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Nome, Parada, Producao } from '@/lib/db'
import { fmtDuracao } from '@/lib/calc'
import { fimDiaSP, fmtDataHora, fmtNum, hojeSP, inicioDiaSP } from '@/lib/format'
import { baixarExcel, dataExcel, todos } from '../dados'

type Maq = { id: string; codigo: string; nome: string }
type Pessoa = { user_id: string; nome: string }
type Dados = { prod: Producao[]; par: Parada[]; maq: Maq[]; serv: Nome[]; loc: Nome[]; mot: Nome[]; pessoas: Pessoa[] }

// ponytail: carrega tudo e filtra no navegador; mover filtros para o servidor se passar de ~50 mil linhas
export default function Producao() {
  const [d, setD] = useState<Dados | null>(null)
  const [erro, setErro] = useState('')
  const [de, setDe] = useState(hojeSP().slice(0, 8) + '01')
  const [ate, setAte] = useState(hojeSP())
  const [filtro, setFiltro] = useState({ operador: '', servico: '', local: '', maquina: '' })
  const [aba, setAba] = useState<'prod' | 'par'>('prod')

  useEffect(() => {
    Promise.all([
      todos<Producao>('va_producoes'), todos<Parada>('va_paradas'), todos<Maq>('va_maquinas', 'id,codigo,nome'),
      todos<Nome>('va_servicos', 'id,nome'), todos<Nome>('va_locais', 'id,nome'), todos<Nome>('va_motivos_parada', 'id,nome'),
      todos<Pessoa>('va_perfis', 'user_id,nome'),
    ]).then(([prod, par, maq, serv, loc, mot, pessoas]) => setD({ prod, par, maq, serv, loc, mot, pessoas })).catch((e) => setErro(e.message))
  }, [])

  const v = useMemo(() => {
    if (!d) return null
    const t0 = Date.parse(inicioDiaSP(de)), t1 = Date.parse(fimDiaSP(ate))
    const no = (x: { data_hora: string; user_id: string; maquina_id: string }) => {
      const t = Date.parse(x.data_hora)
      return t >= t0 && t <= t1 && (!filtro.operador || x.user_id === filtro.operador) && (!filtro.maquina || x.maquina_id === filtro.maquina)
    }
    const recentes = <T extends { data_hora: string }>(xs: T[]) => xs.sort((a, b) => Date.parse(b.data_hora) - Date.parse(a.data_hora))
    const prod = recentes(d.prod.filter((p) => no(p) && (!filtro.servico || p.servico_id === filtro.servico) && (!filtro.local || p.local_id === filtro.local)))
    const par = recentes(d.par.filter(no))
    const mapa = (xs: { id: string; nome: string }[]) => new Map(xs.map((x) => [x.id, x.nome]))
    const nomes = { maq: new Map(d.maq.map((m) => [m.id, `${m.codigo} ${m.nome}`])), cod: new Map(d.maq.map((m) => [m.id, m.codigo])), serv: mapa(d.serv), loc: mapa(d.loc), mot: mapa(d.mot), pessoa: new Map(d.pessoas.map((p) => [p.user_id, p.nome])) }
    const somar = <T,>(xs: T[], chave: (x: T) => string, valor: (x: T) => number) => {
      const m = new Map<string, number>()
      for (const x of xs) m.set(chave(x), (m.get(chave(x)) ?? 0) + valor(x))
      return [...m].sort((a, b) => b[1] - a[1])
    }
    return {
      prod, par, nomes,
      totalHa: prod.reduce((s, p) => s + Number(p.hectares), 0),
      totalMin: par.reduce((s, p) => s + p.minutos, 0),
      porServico: somar(prod, (p) => nomes.serv.get(p.servico_id) ?? '?', (p) => Number(p.hectares)),
      porOperador: somar(prod, (p) => nomes.pessoa.get(p.user_id) ?? '?', (p) => Number(p.hectares)),
      porLocal: somar(prod, (p) => nomes.loc.get(p.local_id) ?? '?', (p) => Number(p.hectares)),
      porMaquina: somar(prod, (p) => nomes.cod.get(p.maquina_id) ?? '?', (p) => Number(p.hectares)),
      porMotivo: somar(par, (p) => nomes.mot.get(p.motivo_id) ?? '?', (p) => p.minutos),
    }
  }, [d, de, ate, filtro])

  async function excluir(tabela: 'va_producoes' | 'va_paradas', id: string, descricao: string) {
    if (!confirm(`Excluir ${descricao}?\n\nIsso não pode ser desfeito.`)) return
    setErro('')
    const { error } = await createClient().from(tabela).delete().eq('id', id)
    if (error) return setErro(`Não foi possível excluir: ${error.message}`)
    setD((x) => x && (tabela === 'va_producoes' ? { ...x, prod: x.prod.filter((p) => p.id !== id) } : { ...x, par: x.par.filter((p) => p.id !== id) }))
  }

  if (erro && !d) return <p className="text-alerta">Erro: {erro}</p>
  if (!d || !v) return <p>Carregando…</p>
  const n = v.nomes

  const exportar = () => baixarExcel(`producao_${de}_a_${ate}.xlsx`, {
    Produção: v.prod.map((p) => ({ 'Data/hora': dataExcel(p.data_hora), Operador: n.pessoa.get(p.user_id), Máquina: n.maq.get(p.maquina_id), Serviço: n.serv.get(p.servico_id), Talhão: n.loc.get(p.local_id), Hectares: Number(p.hectares), Observação: p.observacao })),
    Paradas: v.par.map((p) => ({ 'Data/hora': dataExcel(p.data_hora), Operador: n.pessoa.get(p.user_id), Máquina: n.maq.get(p.maquina_id), Motivo: n.mot.get(p.motivo_id), Minutos: p.minutos, Horas: Math.round((p.minutos / 60) * 100) / 100, Observação: p.observacao })),
    'Por serviço': v.porServico.map(([nome, ha]) => ({ Serviço: nome, Hectares: Math.round(ha * 100) / 100 })),
    'Por talhão': v.porLocal.map(([nome, ha]) => ({ Talhão: nome, Hectares: Math.round(ha * 100) / 100 })),
    'Por operador': v.porOperador.map(([nome, ha]) => ({ Operador: nome, Hectares: Math.round(ha * 100) / 100 })),
  })

  const Quadro = ({ titulo, linhas, unidade }: { titulo: string; linhas: [string, number][]; unidade: 'ha' | 'min' }) => (
    <section className="cartao">
      <h2 className="mb-2 font-display text-xl font-bold text-mata-escuro">{titulo}</h2>
      {!linhas.length ? <p className="text-tinta/55">Sem dados no período.</p> : (
        <table className="tabela"><tbody>
          {linhas.map(([nome, valor]) => <tr key={nome}><td className="font-semibold">{nome}</td><td className="num text-right">{unidade === 'ha' ? `${fmtNum(valor, 2)} ha` : fmtDuracao(valor)}</td></tr>)}
        </tbody></table>
      )}
    </section>
  )

  const sel = (rotulo: string, chave: keyof typeof filtro, itens: { id: string; nome: string }[]) => (
    <label><span className="rotulo">{rotulo}</span>
      <select className="campo py-2 text-base" value={filtro[chave]} onChange={(e) => setFiltro({ ...filtro, [chave]: e.target.value })}>
        <option value="">Todos</option>{itens.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
      </select>
    </label>
  )

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold text-mata-escuro">Produção e paradas</h1>

      <section className="cartao grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <label><span className="rotulo">De</span><input type="date" className="campo py-2 text-base" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label><span className="rotulo">Até</span><input type="date" className="campo py-2 text-base" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        {sel('Operador', 'operador', d.pessoas.map((p) => ({ id: p.user_id, nome: p.nome })))}
        {sel('Serviço', 'servico', d.serv)}
        {sel('Talhão', 'local', d.loc)}
        {sel('Máquina', 'maquina', d.maq.map((m) => ({ id: m.id, nome: `${m.codigo} ${m.nome}` })))}
        <button className="btn-mata col-span-2 self-end md:col-span-1" onClick={exportar}>Exportar Excel</button>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="cartao"><div className="font-semibold text-tinta/60">Área no período</div><div className="num font-display text-5xl font-bold text-mata-escuro">{fmtNum(v.totalHa, 2)} <span className="text-2xl text-tinta/50">ha</span></div></div>
        <div className="cartao"><div className="font-semibold text-tinta/60">Tempo parado</div><div className="num font-display text-5xl font-bold text-alerta">{fmtDuracao(v.totalMin)}</div></div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Quadro titulo="Hectares por serviço" linhas={v.porServico} unidade="ha" />
        <Quadro titulo="Hectares por talhão" linhas={v.porLocal} unidade="ha" />
        <Quadro titulo="Hectares por operador" linhas={v.porOperador} unidade="ha" />
        <Quadro titulo="Hectares por máquina" linhas={v.porMaquina} unidade="ha" />
        <Quadro titulo="Paradas por motivo" linhas={v.porMotivo} unidade="min" />
      </div>

      {erro && <p role="alert" className="rounded-xl bg-alerta-claro px-4 py-3 text-alerta">{erro}</p>}
      <div className="segmento w-full sm:w-80">
        <button aria-pressed={aba === 'prod'} onClick={() => setAba('prod')} className="whitespace-nowrap">Produção ({v.prod.length})</button>
        <button aria-pressed={aba === 'par'} onClick={() => setAba('par')} className="whitespace-nowrap">Paradas ({v.par.length})</button>
      </div>

      <ul className="space-y-2">
        {aba === 'prod' && v.prod.slice(0, 300).map((p) => (
          <li key={p.id} className="cartao flex flex-wrap items-center gap-x-6 gap-y-1 border-l-[6px] border-mata py-3">
            <div className="num w-full text-[15px] text-tinta/65 sm:w-36">{fmtDataHora(p.data_hora)}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate"><b className="font-display text-xl">{n.cod.get(p.maquina_id)}</b> <span className="text-tinta/70">{n.serv.get(p.servico_id)}, {n.loc.get(p.local_id)}</span></div>
              <div className="text-[15px] text-tinta/60">{n.pessoa.get(p.user_id) ?? 'Usuário removido'}{p.criado_offline ? ', lançado sem sinal' : ''}{p.observacao ? ` — “${p.observacao}”` : ''}</div>
            </div>
            <div className="num font-display text-2xl font-bold">{fmtNum(Number(p.hectares), 2)} ha</div>
            <button onClick={() => excluir('va_producoes', p.id, `a produção de ${fmtNum(Number(p.hectares), 2)} ha em ${n.cod.get(p.maquina_id)} (${fmtDataHora(p.data_hora)})`)} className="rounded-xl px-3 py-2 font-semibold text-alerta hover:bg-alerta-claro">Excluir</button>
          </li>
        ))}
        {aba === 'par' && v.par.slice(0, 300).map((p) => (
          <li key={p.id} className="cartao flex flex-wrap items-center gap-x-6 gap-y-1 border-l-[6px] border-alerta py-3">
            <div className="num w-full text-[15px] text-tinta/65 sm:w-36">{fmtDataHora(p.data_hora)}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate"><b className="font-display text-xl">{n.cod.get(p.maquina_id)}</b> <span className="text-tinta/70">{n.mot.get(p.motivo_id)}</span></div>
              <div className="text-[15px] text-tinta/60">{n.pessoa.get(p.user_id) ?? 'Usuário removido'}{p.observacao ? ` — “${p.observacao}”` : ''}</div>
            </div>
            <div className="num font-display text-2xl font-bold">{fmtDuracao(p.minutos)}</div>
            <button onClick={() => excluir('va_paradas', p.id, `a parada de ${fmtDuracao(p.minutos)} em ${n.cod.get(p.maquina_id)} (${fmtDataHora(p.data_hora)})`)} className="rounded-xl px-3 py-2 font-semibold text-alerta hover:bg-alerta-claro">Excluir</button>
          </li>
        ))}
      </ul>
      {(aba === 'prod' ? v.prod : v.par).length === 0 && <p className="cartao py-8 text-center text-tinta/60">Nenhum lançamento nesse período.</p>}
    </div>
  )
}
