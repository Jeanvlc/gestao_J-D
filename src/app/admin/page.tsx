'use client'
import { useEffect, useMemo, useState } from 'react'
import type { Abastecimento, Movimento } from '@/lib/db'
import { diferencaMedicao, kmPorLitro, litrosPorHora, saldo } from '@/lib/calc'
import { fimDiaSP, fmtDataHora, fmtNum, hojeSP, inicioDiaSP } from '@/lib/format'
import { baixarExcel, dataExcel, todos } from './dados'

type TanqueRow = { id: string; nome: string; saldo_inicial: number; data_saldo_inicial: string; ativo: boolean }
type MaqRow = { id: string; codigo: string; nome: string; tipo: string | null; ativo: boolean }
type PerfilRow = { user_id: string; nome: string; papel: string; ativo: boolean }
type Dados = { tanques: TanqueRow[]; maquinas: MaqRow[]; perfis: PerfilRow[]; abast: Abastecimento[]; movs: Movimento[] }

// ponytail: carrega tudo e filtra no navegador; mover filtros para o servidor se passar de ~50 mil linhas
const carregar = async (): Promise<Dados> => {
  const [tanques, maquinas, perfis, abast, movs] = await Promise.all([
    todos<TanqueRow>('va_tanques'), todos<MaqRow>('va_maquinas'), todos<PerfilRow>('va_perfis'),
    todos<Abastecimento>('va_abastecimentos'), todos<Movimento>('va_tanque_movimentos'),
  ])
  return { tanques, maquinas, perfis, abast, movs }
}

export default function Painel() {
  const [d, setD] = useState<Dados | null>(null)
  const [erro, setErro] = useState('')
  const [de, setDe] = useState(hojeSP().slice(0, 8) + '01')
  const [ate, setAte] = useState(hojeSP())
  const [maquina, setMaquina] = useState('')
  const [usuario, setUsuario] = useState('')
  const [tanque, setTanque] = useState('')
  const [backup, setBackup] = useState(false)

  useEffect(() => { carregar().then(setD).catch((e) => setErro(e.message)) }, [])

  const v = useMemo(() => {
    if (!d) return null
    const maq = new Map(d.maquinas.map((m) => [m.id, m]))
    const pessoa = new Map(d.perfis.map((p) => [p.user_id, p.nome]))
    const tq = new Map(d.tanques.map((t) => [t.id, t]))
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
      .filter((a) => noPeriodo(a) && (!maquina || a.maquina_id === maquina) && (!usuario || a.user_id === usuario) && (!tanque || a.tanque_id === tanque))
      .sort((a, b) => Date.parse(b.data_hora) - Date.parse(a.data_hora))

    const porMaq = new Map<string, Abastecimento[]>()
    for (const a of lista) porMaq.set(a.maquina_id, [...(porMaq.get(a.maquina_id) ?? []), a])
    const consumo = [...porMaq].map(([id, as]) => ({
      m: maq.get(id), n: as.length, litros: as.reduce((s, a) => s + Number(a.litros), 0),
      lh: litrosPorHora(as), kml: kmPorLitro(as),
    })).sort((a, b) => b.litros - a.litros)

    const entradas = d.movs.filter((m) => m.tipo === 'entrada' && noPeriodo(m) && (!tanque || m.tanque_id === tanque))
    return {
      saldos, medicoes, lista, consumo, maq, pessoa, tq,
      totalAbast: lista.reduce((s, a) => s + Number(a.litros), 0),
      totalEntradas: entradas.reduce((s, m) => s + Number(m.litros), 0),
    }
  }, [d, de, ate, maquina, usuario, tanque])

  if (erro) return <p className="text-red-700">Erro: {erro}</p>
  if (!d || !v) return <p>Carregando…</p>

  const exportar = () => baixarExcel(`abastecimentos_${de}_a_${ate}.xlsx`, {
    Abastecimentos: v.lista.map((a) => ({
      'Data/hora': dataExcel(a.data_hora), Máquina: v.maq.get(a.maquina_id)?.codigo, 'Nome máquina': v.maq.get(a.maquina_id)?.nome,
      Motorista: v.pessoa.get(a.user_id), Tanque: v.tq.get(a.tanque_id)?.nome, Litros: Number(a.litros),
      Horímetro: a.horimetro == null ? null : Number(a.horimetro), Km: a.km == null ? null : Number(a.km),
      Observação: a.observacao, 'Lançado offline': a.criado_offline ? 'sim' : 'não',
    })),
    'Consumo por máquina': v.consumo.map((c) => ({
      Máquina: c.m?.codigo, Nome: c.m?.nome, Abastecimentos: c.n, Litros: c.litros,
      'L/h': c.lh == null ? null : Math.round(c.lh * 100) / 100, 'km/L': c.kml == null ? null : Math.round(c.kml * 100) / 100,
    })),
  })

  async function backupCompleto() {
    setBackup(true)
    try {
      const nomes = ['va_perfis', 'va_maquinas', 'va_tanques', 'va_abastecimentos', 'va_tanque_movimentos']
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
            <div className="text-sm text-gray-600">{s.t.nome} — saldo calculado</div>
            <div className="text-3xl font-bold">{fmtNum(s.saldo, 0)} L</div>
            {s.med ? (
              <div className="text-sm">
                Última medição {fmtNum(Number(s.med.litros), 0)} L em {fmtDataHora(s.med.data_hora)} · diferença{' '}
                <b className={(s.dif ?? 0) < 0 ? 'text-red-700' : ''}>{fmtNum(s.dif, 0)} L</b>
              </div>
            ) : <div className="text-sm text-gray-500">Sem medição</div>}
          </div>
        ))}
      </section>

      <section className="cartao flex flex-wrap items-end gap-3">
        <label>De<br /><input type="date" className="campo py-2 text-base" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label>Até<br /><input type="date" className="campo py-2 text-base" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        <label>Máquina<br />
          <select className="campo py-2 text-base" value={maquina} onChange={(e) => setMaquina(e.target.value)}>
            <option value="">Todas</option>
            {d.maquinas.map((m) => <option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}
          </select>
        </label>
        <label>Motorista<br />
          <select className="campo py-2 text-base" value={usuario} onChange={(e) => setUsuario(e.target.value)}>
            <option value="">Todos</option>
            {d.perfis.map((p) => <option key={p.user_id} value={p.user_id}>{p.nome}</option>)}
          </select>
        </label>
        {d.tanques.length > 1 && (
          <label>Tanque<br />
            <select className="campo py-2 text-base" value={tanque} onChange={(e) => setTanque(e.target.value)}>
              <option value="">Todos</option>
              {d.tanques.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </label>
        )}
        <button className="btn-2" onClick={exportar}>Exportar Excel</button>
        <button className="btn-2" onClick={backupCompleto} disabled={backup}>{backup ? 'Gerando…' : 'Backup completo'}</button>
      </section>

      <p>No período: <b>{fmtNum(v.totalAbast, 0)} L</b> abastecidos · <b>{fmtNum(v.totalEntradas, 0)} L</b> de entrada no tanque</p>

      <section>
        <h2 className="mb-2 text-lg font-bold">Consumo por máquina</h2>
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead><tr><th>Máquina</th><th>Abast.</th><th>Litros</th><th>L/h</th><th>km/L</th></tr></thead>
            <tbody>
              {v.consumo.map((c) => (
                <tr key={c.m?.id}>
                  <td>{c.m?.codigo} — {c.m?.nome}</td><td>{c.n}</td><td>{fmtNum(c.litros, 1)}</td>
                  <td>{fmtNum(c.lh, 2)}</td><td>{fmtNum(c.kml, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-gray-500">L/h e km/L: litros abastecidos depois do primeiro registro com leitura ÷ diferença de leitura no período (método tanque cheio).</p>
      </section>

      {v.medicoes.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-bold">Medições × saldo calculado</h2>
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead><tr><th>Data</th><th>Tanque</th><th>Medido</th><th>Calculado</th><th>Diferença</th><th>Por</th></tr></thead>
              <tbody>
                {v.medicoes.map(({ m, t, calculado, dif }) => (
                  <tr key={m.id}>
                    <td>{fmtDataHora(m.data_hora)}</td><td>{t.nome}</td><td>{fmtNum(Number(m.litros), 0)}</td>
                    <td>{fmtNum(calculado, 0)}</td><td className={dif < 0 ? 'text-red-700' : ''}>{fmtNum(dif, 0)}</td><td>{v.pessoa.get(m.user_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-bold">Abastecimentos ({v.lista.length})</h2>
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead><tr><th>Data/hora</th><th>Máquina</th><th>Motorista</th><th>Litros</th><th>Horímetro</th><th>Km</th><th>Obs.</th></tr></thead>
            <tbody>
              {v.lista.map((a) => (
                <tr key={a.id}>
                  <td>{fmtDataHora(a.data_hora)}{a.criado_offline && <span title="lançado sem sinal"> ✈</span>}</td>
                  <td>{v.maq.get(a.maquina_id)?.codigo}</td><td>{v.pessoa.get(a.user_id)}</td>
                  <td>{fmtNum(Number(a.litros), 2)}</td><td>{fmtNum(a.horimetro == null ? null : Number(a.horimetro))}</td>
                  <td>{fmtNum(a.km == null ? null : Number(a.km))}</td><td>{a.observacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-gray-500">Dados carregados ao abrir a página. Recarregue para atualizar.</p>
    </div>
  )
}
