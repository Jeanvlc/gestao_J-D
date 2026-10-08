'use client'
import { useEffect, useMemo, useState } from 'react'
import type { Abastecimento, Movimento } from '@/lib/db'
import { diferencaMedicao, kmPorLitro, litrosPorHora, saldo } from '@/lib/calc'
import { alertas } from '@/lib/alertas'
import { diaSP, fimDiaSP, fmtDataHora, fmtNum, hojeSP, inicioDiaSP } from '@/lib/format'
import { baixarExcel, dataExcel, todos } from './dados'

type TanqueRow = { id: string; nome: string; saldo_inicial: number; data_saldo_inicial: string; ativo: boolean }
type MaqRow = { id: string; codigo: string; nome: string; centro_custo_id: string | null; ativo: boolean }
type CentroRow = { id: string; nome: string }
type PerfilRow = { user_id: string; nome: string; papel: string; ativo: boolean }
type Dados = { tanques: TanqueRow[]; maquinas: MaqRow[]; perfis: PerfilRow[]; abast: Abastecimento[]; movs: Movimento[]; centros: CentroRow[] }

// ponytail: carrega tudo e filtra no navegador; mover filtros para o servidor se passar de ~50 mil linhas
const carregar = async (): Promise<Dados> => {
  const [tanques, maquinas, perfis, abast, movs, centros] = await Promise.all([
    todos<TanqueRow>('va_tanques'), todos<MaqRow>('va_maquinas'), todos<PerfilRow>('va_perfis'),
    todos<Abastecimento>('va_abastecimentos'), todos<Movimento>('va_tanque_movimentos'), todos<CentroRow>('va_centros_custo'),
  ])
  return { tanques, maquinas, perfis, abast, movs, centros }
}

export default function Painel() {
  const [d, setD] = useState<Dados | null>(null)
  const [erro, setErro] = useState('')
  const [de, setDe] = useState(hojeSP().slice(0, 8) + '01')
  const [ate, setAte] = useState(hojeSP())
  const [maquina, setMaquina] = useState('')
  const [usuario, setUsuario] = useState('')
  const [tanque, setTanque] = useState('')
  const [centro, setCentro] = useState('')
  const [backup, setBackup] = useState(false)

  useEffect(() => { carregar().then(setD).catch((e) => setErro(e.message)) }, [])

  const v = useMemo(() => {
    if (!d) return null
    const maq = new Map(d.maquinas.map((m) => [m.id, m]))
    const pessoa = new Map(d.perfis.map((p) => [p.user_id, p.nome]))
    const tq = new Map(d.tanques.map((t) => [t.id, t]))
    const cc = new Map(d.centros.map((c) => [c.id, c.nome]))
    const centroDe = (maqId: string) => cc.get(maq.get(maqId)?.centro_custo_id ?? '') ?? ''
    const t0 = Date.parse(inicioDiaSP(de)), t1 = Date.parse(fimDiaSP(ate))
    const noPeriodo = (x: { data_hora: string }) => { const t = Date.parse(x.data_hora); return t >= t0 && t <= t1 }

    const saldos = d.tanques.filter((t) => t.ativo).map((t) => {
      const movs = d.movs.filter((m) => m.tanque_id === t.id)
      const abast = d.abast.filter((a) => a.tanque_id === t.id)
      const med = movs.filter((m) => m.tipo === 'medicao').sort((a, b) => Date.parse(b.data_hora) - Date.parse(a.data_hora))[0]
      return {
        t, saldo: saldo(t.saldo_inicial, t.data_saldo_inicial, movs, abast),
        med, dif: med ? diferencaMedicao(med, t.saldo_inicial, t.data_saldo_inicial, movs, abast) : null,
      }
    })

    const medicoes = d.movs.filter((m) => m.tipo === 'medicao' && noPeriodo(m) && (!tanque || m.tanque_id === tanque))
      .sort((a, b) => Date.parse(b.data_hora) - Date.parse(a.data_hora))
      .map((m) => {
        const t = tq.get(m.tanque_id)!
        const movs = d.movs.filter((x) => x.tanque_id === t.id)
        const abast = d.abast.filter((x) => x.tanque_id === t.id)
        return { m, t, calculado: saldo(t.saldo_inicial, t.data_saldo_inicial, movs, abast, m.data_hora), dif: diferencaMedicao(m, t.saldo_inicial, t.data_saldo_inicial, movs, abast) }
      })

    const lista = d.abast
      .filter((a) => noPeriodo(a) && (!maquina || a.maquina_id === maquina) && (!usuario || a.user_id === usuario) && (!tanque || a.tanque_id === tanque)
        && (!centro || maq.get(a.maquina_id)?.centro_custo_id === centro))
      .sort((a, b) => Date.parse(b.data_hora) - Date.parse(a.data_hora))

    const porMaq = new Map<string, Abastecimento[]>()
    for (const a of lista) porMaq.set(a.maquina_id, [...(porMaq.get(a.maquina_id) ?? []), a])
    const consumo = [...porMaq].map(([id, as]) => ({
      m: maq.get(id), centro: centroDe(id), n: as.length, litros: as.reduce((s, a) => s + Number(a.litros), 0),
      lh: litrosPorHora(as), kml: kmPorLitro(as),
    })).sort((a, b) => b.litros - a.litros)

    const alertasPeriodo = alertas(lista as any, (id) => maq.get(id)?.codigo ?? '?')
    const porDia = new Map<string, number>()
    for (const a of lista) porDia.set(diaSP(a.data_hora), (porDia.get(diaSP(a.data_hora)) ?? 0) + Number(a.litros))
    const dias = [...porDia].sort(([x], [y]) => (x < y ? -1 : 1)).slice(-31)
    const porCentro = new Map<string, { litros: number; n: number }>()
    for (const a of lista) {
      const k = centroDe(a.maquina_id) || 'Sem centro de custo'
      const c = porCentro.get(k) ?? { litros: 0, n: 0 }
      porCentro.set(k, { litros: c.litros + Number(a.litros), n: c.n + 1 })
    }
    const centrosRel = [...porCentro].map(([nome, c]) => ({ nome, ...c })).sort((x, y) => y.litros - x.litros)
    const entradas = d.movs.filter((m) => m.tipo === 'entrada' && noPeriodo(m) && (!tanque || m.tanque_id === tanque))
    return {
      alertasPeriodo, dias, centrosRel, saldos, medicoes, lista, consumo, maq, pessoa, tq, centroDe,
      totalAbast: lista.reduce((s, a) => s + Number(a.litros), 0),
      totalEntradas: entradas.reduce((s, m) => s + Number(m.litros), 0),
    }
  }, [d, de, ate, maquina, usuario, tanque, centro])

  if (erro) return <p className="text-alerta">Erro: {erro}</p>
  if (!d || !v) return <p>Carregando…</p>

  const exportar = () => baixarExcel(`abastecimentos_${de}_a_${ate}.xlsx`, {
    Abastecimentos: v.lista.map((a) => ({
      'Data/hora': dataExcel(a.data_hora), Máquina: v.maq.get(a.maquina_id)?.codigo, 'Nome máquina': v.maq.get(a.maquina_id)?.nome, 'Centro de custo': v.centroDe(a.maquina_id),
      Motorista: v.pessoa.get(a.user_id), Tanque: v.tq.get(a.tanque_id)?.nome, Litros: Number(a.litros),
      Horímetro: a.horimetro == null ? null : Number(a.horimetro), Km: a.km == null ? null : Number(a.km),
      Observação: a.observacao, 'Lançado offline': a.criado_offline ? 'sim' : 'não',
    })),
    'Por centro de custo': v.centrosRel.map((c) => ({ 'Centro de custo': c.nome, Abastecimentos: c.n, Litros: Math.round(c.litros * 100) / 100 })),
    'Consumo por máquina': v.consumo.map((c) => ({
      Máquina: c.m?.codigo, Nome: c.m?.nome, 'Centro de custo': c.centro, Abastecimentos: c.n, Litros: c.litros,
      'L/h': c.lh == null ? null : Math.round(c.lh * 100) / 100, 'km/L': c.kml == null ? null : Math.round(c.kml * 100) / 100,
    })),
  })

  async function backupCompleto() {
    setBackup(true)
    try {
      const nomes = ['va_perfis', 'va_maquinas', 'va_centros_custo', 'va_tanques', 'va_tanque_centros', 'va_abastecimentos', 'va_tanque_movimentos', 'va_servicos', 'va_locais', 'va_motivos_parada', 'va_producoes', 'va_paradas']
      const tabelas = await Promise.all(nomes.map((n) => todos(n)))
      await baixarExcel(`backup_va_${hojeSP()}.xlsx`, Object.fromEntries(nomes.map((n, i) => [n, tabelas[i]])))
    } catch (e) { alert('Falha no backup: ' + (e as Error).message) }
    setBackup(false)
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {v.saldos.map((s) => (
          <div key={s.t.id} className="cartao">
            <div className="font-semibold text-tinta/60">Saldo do {s.t.nome}</div>
            <div className="num font-display text-5xl font-bold text-mata-escuro">{fmtNum(s.saldo, 0)} <span className="text-2xl text-tinta/50">L</span></div>
            {s.med ? (
              <div className="text-sm">
                Última medição {fmtNum(Number(s.med.litros), 0)} L em {fmtDataHora(s.med.data_hora)} · diferença{' '}
                <b className={(s.dif ?? 0) < 0 ? 'text-alerta' : ''}>{fmtNum(s.dif, 0)} L</b>
              </div>
            ) : <div className="text-sm text-tinta/55">Sem medição</div>}
          </div>
        ))}
      </section>

      <section className="cartao flex flex-wrap items-end gap-3">
        <label className="font-semibold text-tinta/75">De<br /><input type="date" className="campo py-2 text-base" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label className="font-semibold text-tinta/75">Até<br /><input type="date" className="campo py-2 text-base" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        <label className="font-semibold text-tinta/75">Máquina<br />
          <select className="campo py-2 text-base" value={maquina} onChange={(e) => setMaquina(e.target.value)}>
            <option value="">Todas</option>
            {d.maquinas.map((m) => <option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}
          </select>
        </label>
        <label className="font-semibold text-tinta/75">Motorista<br />
          <select className="campo py-2 text-base" value={usuario} onChange={(e) => setUsuario(e.target.value)}>
            <option value="">Todos</option>
            {d.perfis.map((p) => <option key={p.user_id} value={p.user_id}>{p.nome}</option>)}
          </select>
        </label>
        {d.centros.length > 0 && (
          <label className="font-semibold text-tinta/75">Centro de custo<br />
            <select className="campo py-2 text-base" value={centro} onChange={(e) => setCentro(e.target.value)}>
              <option value="">Todos</option>
              {d.centros.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
        )}
        {d.tanques.length > 1 && (
          <label className="font-semibold text-tinta/75">Tanque<br />
            <select className="campo py-2 text-base" value={tanque} onChange={(e) => setTanque(e.target.value)}>
              <option value="">Todos</option>
              {d.tanques.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </label>
        )}
        <button className="btn-mata" onClick={exportar}>Exportar Excel</button>
        <button className="btn-2" onClick={backupCompleto} disabled={backup}>{backup ? 'Gerando…' : 'Backup completo'}</button>
      </section>

      <p>No período: <b>{fmtNum(v.totalAbast, 0)} L</b> abastecidos · <b>{fmtNum(v.totalEntradas, 0)} L</b> de entrada no tanque</p>

      {v.alertasPeriodo.length > 0 && (
        <section className="rounded-2xl border-2 border-diesel bg-diesel-claro p-4">
          <h2 className="font-display text-2xl font-bold text-tinta">Conferir {v.alertasPeriodo.length} {v.alertasPeriodo.length > 1 ? 'lançamentos' : 'lançamento'}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {v.alertasPeriodo.slice(0, 8).map((a) => <li key={a.id + a.texto}>{a.texto}</li>)}
          </ul>
          <a href="/admin/lancamentos" className="mt-3 inline-block font-semibold text-mata underline">Abrir lançamentos para corrigir</a>
        </section>
      )}

      {v.dias.length > 0 && (
        <section className="cartao">
          <h2 className="mb-3 font-display text-2xl font-bold text-mata-escuro">Litros por dia</h2>
          <div className="flex h-40 items-end gap-1" role="img" aria-label="Gráfico de litros abastecidos por dia">
            {v.dias.map(([dia, litros]) => {
              const max = Math.max(...v.dias.map(([, l]) => l))
              return (
                <div key={dia} className="flex h-full flex-1 flex-col justify-end" title={`${dia.slice(8)}/${dia.slice(5, 7)}: ${fmtNum(litros, 0)} L`}>
                  <div className="rounded-t bg-mata" style={{ height: `${Math.max(3, (litros / max) * 100)}%` }} />
                </div>
              )
            })}
          </div>
          <div className="mt-1 flex justify-between text-[13px] text-tinta/55">
            <span>{v.dias[0][0].slice(8)}/{v.dias[0][0].slice(5, 7)}</span>
            <span>{v.dias[v.dias.length - 1][0].slice(8)}/{v.dias[v.dias.length - 1][0].slice(5, 7)}</span>
          </div>
        </section>
      )}

      <section className="cartao">
        <h2 className="mb-3 font-display text-2xl font-bold text-mata-escuro">Consumo por máquina</h2>
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead><tr><th>Máquina</th><th>Centro de custo</th><th>Abast.</th><th>Litros</th><th>L/h</th><th>km/L</th></tr></thead>
            <tbody>
              {v.consumo.map((c) => (
                <tr key={c.m?.id}>
                  <td><b>{c.m?.codigo}</b> {c.m?.nome}</td><td>{c.centro}</td><td>{c.n}</td><td>{fmtNum(c.litros, 1)}</td>
                  <td>{fmtNum(c.lh, 2)}</td><td>{fmtNum(c.kml, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-tinta/55">L/h e km/L: litros abastecidos depois do primeiro registro com leitura ÷ diferença de leitura no período (método tanque cheio).</p>
      </section>

      <section className="cartao">
        <h2 className="mb-3 font-display text-2xl font-bold text-mata-escuro">Por centro de custo</h2>
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead><tr><th>Centro de custo</th><th>Abast.</th><th>Litros</th><th>% do total</th></tr></thead>
            <tbody>
              {v.centrosRel.map((c) => (
                <tr key={c.nome}><td className="font-semibold">{c.nome}</td><td>{c.n}</td><td className="num">{fmtNum(c.litros, 1)}</td>
                  <td className="num">{v.totalAbast ? fmtNum((c.litros / v.totalAbast) * 100, 1) : '—'}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[13px] text-tinta/55">Escolha as datas acima para fechar o mês. O Excel exportado inclui esta tabela.</p>
      </section>

      {v.medicoes.length > 0 && (
        <section className="cartao">
          <h2 className="mb-3 font-display text-2xl font-bold text-mata-escuro">Medições × saldo calculado</h2>
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead><tr><th>Data</th><th>Tanque</th><th>Medido</th><th>Calculado</th><th>Diferença</th><th>Por</th></tr></thead>
              <tbody>
                {v.medicoes.map(({ m, t, calculado, dif }) => (
                  <tr key={m.id}>
                    <td>{fmtDataHora(m.data_hora)}</td><td>{t.nome}</td><td>{fmtNum(Number(m.litros), 0)}</td>
                    <td>{fmtNum(calculado, 0)}</td><td className={dif < 0 ? 'text-alerta' : ''}>{fmtNum(dif, 0)}</td><td>{v.pessoa.get(m.user_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <a href="/admin/lancamentos" className="cartao flex items-center justify-between gap-4 hover:bg-mata-claro">
        <span>
          <b className="font-display text-xl text-mata-escuro">{v.lista.length} abastecimentos no período</b>
          <span className="block text-tinta/65">Ver a lista completa e excluir lançamentos errados</span>
        </span>
        <span className="font-semibold text-mata">Abrir lançamentos</span>
      </a>
      <p className="text-xs text-tinta/55">Dados carregados ao abrir a página. Recarregue para atualizar.</p>
    </div>
  )
}
