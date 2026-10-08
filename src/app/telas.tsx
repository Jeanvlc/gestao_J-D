'use client'
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, salvarLocal, type Abastecimento, type Maquina, type Movimento, type Perfil } from '@/lib/db'
import { sincronizar, apagarPendente, type Cliente } from '@/lib/sync'
import { diferencaMedicao, saldo, ultimaLeitura, validarLeitura, validarLitros } from '@/lib/calc'
import { diaSP, fmtDataHora, fmtHora, fmtNum, hojeSP, parseNum } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'

export const sb = () => createClient() as unknown as Cliente

type Msg = { ok?: string; erro?: string } | null
const Aviso = ({ msg }: { msg: Msg }) =>
  msg ? <p className={`rounded-lg p-3 ${msg.erro ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{msg.erro ?? msg.ok}</p> : null

const novoId = () => crypto.randomUUID()
const agora = () => new Date().toISOString()
const SEM_CADASTRO = 'Cadastros ainda não baixados. Conecte à internet uma vez e toque em "Enviar agora".'

/** Tanque escolhido (lembrado no aparelho). Com um só tanque, nem aparece. */
function useTanque(): [string | null, JSX.Element | null] {
  const tanques = useLiveQuery(() => db.tanques.toArray(), [])
  const [escolhido, setEscolhido] = useState<string | null>(null)
  useEffect(() => { try { setEscolhido(localStorage.getItem('va-tanque')) } catch {} }, [])
  if (!tanques?.length) return [null, null]
  const id = tanques.some((t) => t.id === escolhido) ? escolhido! : tanques[0].id
  if (tanques.length === 1) return [id, null]
  const escolher = (v: string) => { setEscolhido(v); try { localStorage.setItem('va-tanque', v) } catch {} }
  return [id, (
    <div className="flex gap-2">
      {tanques.map((t) => (
        <button key={t.id} onClick={() => escolher(t.id)} className={`btn-2 flex-1 ${t.id === id ? 'border-green-700 bg-green-50' : ''}`}>{t.nome}</button>
      ))}
    </div>
  )]
}

export function Abastecer({ perfil }: { perfil: Perfil }) {
  const maquinas = useLiveQuery(() => db.maquinas.toArray().then((ms) => ms.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }))), [])
  const [tanqueId, seletorTanque] = useTanque()
  const [busca, setBusca] = useState('')
  const [maq, setMaq] = useState<Maquina | null>(null)
  const [litros, setLitros] = useState('')
  const [horimetro, setHorimetro] = useState('')
  const [km, setKm] = useState('')
  const [obs, setObs] = useState('')
  const [avisos, setAvisos] = useState<string[]>([])
  const [msg, setMsg] = useState<Msg>(null)

  const ultima = useLiveQuery(async () => {
    if (!maq) return null
    const srv = await db.leituras.get(maq.id)
    const locais = (await db.registros.where('tabela').equals('va_abastecimentos').toArray())
      .map((r) => r.payload as Abastecimento).filter((p) => p.maquina_id === maq.id)
    return {
      horimetro: ultimaLeitura(srv?.horimetro, locais.map((l) => l.horimetro)),
      km: ultimaLeitura(srv?.km, locais.map((l) => l.km)),
    }
  }, [maq?.id])

  async function salvar() {
    setMsg(null)
    if (!maq) return setMsg({ erro: 'Escolha a máquina' })
    if (!tanqueId) return setMsg({ erro: SEM_CADASTRO })
    const L = parseNum(litros), H = parseNum(horimetro), K = parseNum(km)
    const vs = [validarLitros(L), validarLeitura('horimetro', H, ultima?.horimetro ?? null), validarLeitura('km', K, ultima?.km ?? null)]
    const erro = vs.find((v) => v.erro)?.erro
    if (erro) return setMsg({ erro })
    const novos = vs.flatMap((v) => (v.aviso ? [v.aviso] : []))
    // valor fora do normal: mostra o aviso e só grava no segundo toque
    if (novos.length && novos.join() !== avisos.join()) return setAvisos(novos)

    await salvarLocal('va_abastecimentos', {
      id: novoId(), user_id: perfil.id, tanque_id: tanqueId, maquina_id: maq.id, data_hora: agora(),
      litros: L!, horimetro: H, km: K, observacao: obs.trim() || null, criado_offline: !navigator.onLine,
    })
    setMsg({ ok: `Salvo: ${maq.codigo} — ${fmtNum(L, 2)} L` })
    setMaq(null); setBusca(''); setLitros(''); setHorimetro(''); setKm(''); setObs(''); setAvisos([])
    sincronizar(sb())
  }

  if (maquinas && !maquinas.length) return <Aviso msg={{ erro: SEM_CADASTRO }} />
  const termo = busca.trim().toLowerCase()
  const filtradas = (maquinas ?? []).filter((m) => !termo || `${m.codigo} ${m.nome}`.toLowerCase().includes(termo)).slice(0, 40)

  return (
    <div className="space-y-4 py-2">
      {seletorTanque}
      {maq ? (
        <div className="cartao flex items-center justify-between">
          <div><div className="text-xl font-bold">{maq.codigo}</div><div className="text-gray-600">{maq.nome}</div></div>
          <button className="btn-2" onClick={() => setMaq(null)}>Trocar</button>
        </div>
      ) : (
        <div>
          <label className="rotulo" htmlFor="busca-maquina">Máquina</label>
          <input id="busca-maquina" className="campo" placeholder="Buscar código ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
            {filtradas.map((m) => (
              <button key={m.id} onClick={() => setMaq(m)} className="btn-2 w-full text-left">
                <b>{m.codigo}</b> — {m.nome}
              </button>
            ))}
          </div>
        </div>
      )}
      <label className="block">
        <span className="rotulo">Litros</span>
        <input className="campo" inputMode="decimal" value={litros} onChange={(e) => setLitros(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="rotulo">Horímetro</span>
          <input className="campo" inputMode="decimal" value={horimetro} onChange={(e) => setHorimetro(e.target.value)} />
        </label>
        <label className="block">
          <span className="rotulo">Km</span>
          <input className="campo" inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} />
        </label>
      </div>
      {maq && (
        <p className="text-sm text-gray-600">
          Último horímetro: <b>{fmtNum(ultima?.horimetro)}</b> · Último km: <b>{fmtNum(ultima?.km)}</b>
        </p>
      )}
      <label className="block">
        <span className="rotulo">Observação</span>
        <input className="campo" value={obs} onChange={(e) => setObs(e.target.value)} />
      </label>
      {avisos.length > 0 && <div className="rounded-lg bg-amber-100 p-3 text-amber-900">{avisos.map((a) => <p key={a}>{a}</p>)}</div>}
      <Aviso msg={msg} />
      <button className="btn w-full" onClick={salvar}>{avisos.length ? 'Confirmar mesmo assim' : 'Salvar'}</button>
    </div>
  )
}

export function Tanque({ perfil }: { perfil: Perfil }) {
  const [tanqueId, seletorTanque] = useTanque()
  const [tipo, setTipo] = useState<'entrada' | 'medicao'>('entrada')
  const [litros, setLitros] = useState('')
  const [nf, setNf] = useState('')
  const [msg, setMsg] = useState<Msg>(null)

  const info = useLiveQuery(async () => {
    if (!tanqueId) return null
    const srv = await db.saldos.get(tanqueId)
    if (!srv) return null
    // soma ao saldo baixado o que o servidor ainda não tinha quando baixamos
    const baixado: number = (await db.meta.get('baixado_em'))?.valor ?? 0
    const locais = (await db.registros.toArray()).filter((r) =>
      r.payload.tanque_id === tanqueId && (r.status === 'pendente' || (r.enviado_em ?? 0) > baixado))
    const abast = locais.filter((r) => r.tabela === 'va_abastecimentos').map((r) => r.payload as Abastecimento)
    const movs = locais.filter((r) => r.tabela === 'va_tanque_movimentos').map((r) => r.payload as Movimento)
    const desde = new Date(0).toISOString()
    const medLocal = movs.filter((m) => m.tipo === 'medicao').sort((a, b) => Date.parse(b.data_hora) - Date.parse(a.data_hora))[0]
    const med = medLocal && (!srv.medicao_data || Date.parse(medLocal.data_hora) > Date.parse(srv.medicao_data))
      ? { litros: medLocal.litros, data: medLocal.data_hora, dif: diferencaMedicao(medLocal, srv.saldo, desde, movs, abast) }
      : srv.medicao_data ? { litros: srv.medicao_litros, data: srv.medicao_data, dif: srv.medicao_diferenca } : null
    return { saldo: saldo(srv.saldo, desde, movs, abast), med }
  }, [tanqueId])

  async function salvar() {
    setMsg(null)
    if (!tanqueId) return setMsg({ erro: SEM_CADASTRO })
    const L = parseNum(litros)
    if (L == null || Number.isNaN(L) || L < 0 || (tipo === 'entrada' && L === 0)) return setMsg({ erro: 'Informe os litros' })
    await salvarLocal('va_tanque_movimentos', {
      id: novoId(), user_id: perfil.id, tanque_id: tanqueId, tipo, litros: L, data_hora: agora(),
      nota_fiscal: tipo === 'entrada' ? nf.trim() || null : null, criado_offline: !navigator.onLine,
    })
    setMsg({ ok: `${tipo === 'entrada' ? 'Entrada' : 'Medição'} salva: ${fmtNum(L, 2)} L` })
    setLitros(''); setNf('')
    sincronizar(sb())
  }

  return (
    <div className="space-y-4 py-2">
      {seletorTanque}
      {info ? (
        <div className="cartao space-y-1">
          <div className="text-sm text-gray-600">Saldo calculado</div>
          <div className="text-3xl font-bold">{fmtNum(info.saldo, 0)} L</div>
          {info.med ? (
            <div className="text-sm">
              Última medição: <b>{fmtNum(info.med.litros, 0)} L</b> em {fmtDataHora(info.med.data!)} · Diferença:{' '}
              <b className={(info.med.dif ?? 0) < 0 ? 'text-red-700' : ''}>{fmtNum(info.med.dif, 0)} L</b>
            </div>
          ) : <div className="text-sm text-gray-600">Nenhuma medição ainda</div>}
        </div>
      ) : <Aviso msg={{ erro: SEM_CADASTRO }} />}
      <div className="flex gap-2">
        <button className={`btn-2 flex-1 ${tipo === 'entrada' ? 'border-green-700 bg-green-50' : ''}`} onClick={() => setTipo('entrada')}>Entrada</button>
        <button className={`btn-2 flex-1 ${tipo === 'medicao' ? 'border-green-700 bg-green-50' : ''}`} onClick={() => setTipo('medicao')}>Medição física</button>
      </div>
      <label className="block">
        <span className="rotulo">{tipo === 'entrada' ? 'Litros recebidos' : 'Litros medidos no tanque'}</span>
        <input className="campo" inputMode="decimal" value={litros} onChange={(e) => setLitros(e.target.value)} />
      </label>
      {tipo === 'entrada' && (
        <label className="block">
          <span className="rotulo">Nota fiscal</span>
          <input className="campo" inputMode="numeric" value={nf} onChange={(e) => setNf(e.target.value)} />
        </label>
      )}
      <Aviso msg={msg} />
      <button className="btn w-full" onClick={salvar}>Salvar</button>
    </div>
  )
}

export function Historico({ perfil }: { perfil: Perfil }) {
  const maquinas = useLiveQuery(() => db.maquinas.toArray(), [], [])
  const regs = useLiveQuery(async () => {
    const hoje = hojeSP()
    return (await db.registros.toArray())
      .filter((r) => r.payload.user_id === perfil.id && diaSP(r.data_hora) === hoje)
      .sort((a, b) => Date.parse(b.data_hora) - Date.parse(a.data_hora))
  }, [perfil.id])
  const nomeMaq = (id: string) => { const m = maquinas.find((x) => x.id === id); return m ? `${m.codigo} — ${m.nome}` : 'Máquina' }

  async function apagar(id: string) {
    if (!confirm('Apagar este lançamento?')) return
    try { await apagarPendente(id) } catch (e) { alert((e as Error).message) }
  }

  if (!regs) return null
  if (!regs.length) return <p className="py-6 text-center text-gray-500">Nenhum lançamento hoje.</p>
  return (
    <ul className="space-y-2 py-2">
      {regs.map((r) => {
        const p = r.payload
        const titulo = r.tabela === 'va_abastecimentos'
          ? nomeMaq((p as Abastecimento).maquina_id)
          : (p as Movimento).tipo === 'entrada' ? `Entrada no tanque${(p as Movimento).nota_fiscal ? ` · NF ${(p as Movimento).nota_fiscal}` : ''}` : 'Medição do tanque'
        const a = p as Abastecimento
        return (
          <li key={r.id} className="cartao flex items-center gap-3">
            <div className="flex-1">
              <div className="font-semibold">{titulo}</div>
              <div className="text-sm text-gray-600">
                {fmtHora(r.data_hora)} · {fmtNum(p.litros, 2)} L
                {r.tabela === 'va_abastecimentos' && a.horimetro != null && ` · H ${fmtNum(a.horimetro)}`}
                {r.tabela === 'va_abastecimentos' && a.km != null && ` · ${fmtNum(a.km)} km`}
              </div>
              <div className={`text-xs ${r.status === 'pendente' ? 'text-amber-700' : 'text-green-700'}`}>
                {r.status === 'pendente' ? 'Pendente' : 'Enviado'}
              </div>
            </div>
            {r.status === 'pendente' && <button className="btn-2 text-red-700" onClick={() => apagar(r.id)}>Apagar</button>}
          </li>
        )
      })}
    </ul>
  )
}
