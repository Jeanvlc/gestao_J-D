'use client'
import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, salvarLocal, type Abastecimento, type Maquina, type Movimento, type Perfil, type Tanque as TanqueT } from '@/lib/db'
import { sincronizar, apagarPendente, type Cliente } from '@/lib/sync'
import { diferencaMedicao, maquinasDoTanque, saldo, ultimaLeitura, validarLeitura, validarLitros } from '@/lib/calc'
import { diaSP, digitosLitros, fmtDataHora, fmtHora, fmtNum, hojeSP, litrosDeDigitos, mostrarLitros, parseNum } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { IconeBusca, IconeFechar, IconeSeta } from './icones'

export const sb = () => createClient() as unknown as Cliente

type Msg = { ok?: string; erro?: string } | null
const Aviso = ({ msg }: { msg: Msg }) =>
  msg ? (
    <p role="status" className={`rounded-xl px-4 py-3 font-medium ${msg.erro ? 'bg-alerta-claro text-alerta' : 'bg-mata-claro text-mata'}`}>
      {msg.erro ?? msg.ok}
    </p>
  ) : null

const novoId = () => crypto.randomUUID()
const agora = () => new Date().toISOString()
const SEM_CADASTRO = 'Os cadastros ainda não foram baixados. Conecte-se à internet e toque em Enviar.'

const Titulo = ({ children }: { children: React.ReactNode }) => (
  <h1 className="font-display text-[28px] font-bold leading-tight text-mata-escuro">{children}</h1>
)

/** Mostrador de litros no estilo de bomba: digitar 12050 mostra 120,50 */
function Mostrador({ rotulo, digitos, onChange }: { rotulo: string; digitos: string; onChange: (d: string) => void }) {
  return (
    <label className="block rounded-2xl bg-mata-escuro px-4 pb-3 pt-3 text-white">
      <span className="text-[15px] font-semibold text-white/70">{rotulo}</span>
      <span className="flex items-baseline gap-2">
        <input
          inputMode="numeric" placeholder="0,00" value={mostrarLitros(digitos)}
          onChange={(e) => onChange(digitosLitros(e.target.value))}
          className="num w-full min-w-0 bg-transparent text-right font-display text-[56px] font-bold leading-none text-diesel placeholder:text-diesel/25 focus:outline-none"
        />
        <span className="font-display text-2xl font-bold text-white/60">L</span>
      </span>
    </label>
  )
}

/** Comboio escolhido (lembrado no aparelho). Com um só, não aparece. */
function useTanque(): [TanqueT | null, JSX.Element | null] {
  const tanques = useLiveQuery(() => db.tanques.toArray(), [])
  const [escolhido, setEscolhido] = useState<string | null>(null)
  useEffect(() => { try { setEscolhido(localStorage.getItem('va-tanque')) } catch {} }, [])
  if (!tanques?.length) return [null, null]
  const atual = tanques.find((t) => t.id === escolhido) ?? tanques[0]
  if (tanques.length === 1) return [atual, null]
  const escolher = (v: string) => { setEscolhido(v); try { localStorage.setItem('va-tanque', v) } catch {} }
  return [atual, (
    <div>
      <span className="rotulo">Comboio</span>
      <div className="segmento">
        {tanques.map((t) => <button key={t.id} aria-pressed={t.id === atual.id} onClick={() => escolher(t.id)}>{t.nome}</button>)}
      </div>
    </div>
  )]
}

/** Campo de máquina: abre uma lista com busca */
function SeletorMaquina({ maquinas, valor, onChange }: { maquinas: Maquina[]; valor: Maquina | null; onChange: (m: Maquina) => void }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const campoBusca = useRef<HTMLInputElement>(null)
  useEffect(() => { if (aberto) { setBusca(''); campoBusca.current?.focus() } }, [aberto])

  const termo = busca.trim().toLowerCase()
  const lista = maquinas.filter((m) => !termo || m.codigo.toLowerCase().includes(termo) || m.nome.toLowerCase().includes(termo))

  return (
    <div>
      <span className="rotulo">Máquina</span>
      <button onClick={() => setAberto(true)} aria-haspopup="dialog"
        className="flex w-full items-center gap-3 rounded-xl border-2 border-tinta/15 bg-white px-4 py-3 text-left">
        {valor ? (
          <span className="min-w-0 flex-1">
            <span className="block font-display text-2xl font-bold leading-tight">{valor.codigo}</span>
            <span className="block truncate text-tinta/60">{valor.nome}</span>
          </span>
        ) : <span className="flex-1 py-1.5 text-lg text-tinta/40">Escolha a máquina</span>}
        <IconeSeta />
      </button>

      {aberto && (
        <div role="dialog" aria-modal="true" aria-label="Escolher máquina" className="fixed inset-0 z-30 mx-auto flex max-w-lg flex-col bg-fundo">
          <div className="flex items-center gap-2 bg-mata px-3 py-3">
            <label className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3">
              <span className="text-tinta/40"><IconeBusca /></span>
              <input ref={campoBusca} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Prefixo ou nome"
                aria-label="Buscar máquina" className="w-full bg-transparent py-3 text-lg focus:outline-none" />
            </label>
            <button onClick={() => setAberto(false)} aria-label="Fechar" className="rounded-xl p-3 text-white active:bg-mata-escuro"><IconeFechar /></button>
          </div>
          <ul className="flex-1 overflow-y-auto px-3 py-2">
            {lista.map((m) => (
              <li key={m.id}>
                <button onClick={() => { onChange(m); setAberto(false) }}
                  className={`mb-1.5 flex w-full items-baseline gap-3 rounded-xl px-4 py-3.5 text-left active:bg-mata-claro ${m.id === valor?.id ? 'bg-mata-claro' : 'bg-white'}`}>
                  <span className="font-display text-xl font-bold">{m.codigo}</span>
                  <span className="truncate text-tinta/70">{m.nome}</span>
                </button>
              </li>
            ))}
            {!lista.length && (
              <li className="px-2 py-8 text-center text-tinta/60">
                {maquinas.length ? `Nenhuma máquina com "${busca}".` : 'Nenhuma máquina vinculada a este comboio. Peça ao administrador para vincular o centro de custo.'}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export function Abastecer({ perfil }: { perfil: Perfil }) {
  const [tanque, seletorTanque] = useTanque()
  const todas = useLiveQuery(() => db.maquinas.toArray().then((ms) => ms.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }))), [])
  const maquinas = tanque && todas ? maquinasDoTanque(todas, tanque.centros) : []
  const [maq, setMaq] = useState<Maquina | null>(null)
  const [litros, setLitros] = useState('')
  const [leitura, setLeitura] = useState('')
  const [escolhaUnidade, setEscolhaUnidade] = useState<{ maq: string; u: 'h' | 'km' } | null>(null)
  const [obs, setObs] = useState('')
  const [avisos, setAvisos] = useState<string[]>([])
  const [msg, setMsg] = useState<Msg>(null)

  // trocou de comboio e a máquina não é dele: limpa
  useEffect(() => { if (maq && !maquinas.some((m) => m.id === maq.id)) setMaq(null) }, [tanque?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // unidade: a que a máquina usou por último (horímetro por padrão), ou a que o motorista escolheu
  const padrao = ultima?.km != null && ultima.horimetro == null ? 'km' : 'h'
  const unidade = escolhaUnidade && escolhaUnidade.maq === maq?.id ? escolhaUnidade.u : padrao
  const ultimoValor = unidade === 'h' ? ultima?.horimetro : ultima?.km

  async function salvar() {
    setMsg(null)
    if (!tanque) return setMsg({ erro: SEM_CADASTRO })
    if (!maq) return setMsg({ erro: 'Escolha a máquina.' })
    const L = litrosDeDigitos(litros), V = parseNum(leitura)
    const campo = unidade === 'h' ? 'horimetro' : 'km'
    const vs = [validarLitros(L), validarLeitura(campo, V, ultimoValor ?? null)]
    const erro = vs.find((v) => v.erro)?.erro
    if (erro) return setMsg({ erro })
    const novos = vs.flatMap((v) => (v.aviso ? [v.aviso] : []))
    // valor fora do normal: mostra o aviso e só grava no segundo toque
    if (novos.length && novos.join() !== avisos.join()) return setAvisos(novos)

    await salvarLocal('va_abastecimentos', {
      id: novoId(), user_id: perfil.id, tanque_id: tanque.id, maquina_id: maq.id, data_hora: agora(), litros: L!,
      horimetro: campo === 'horimetro' ? V : null, km: campo === 'km' ? V : null,
      observacao: obs.trim() || null, criado_offline: !navigator.onLine,
    })
    setMsg({ ok: `Abastecimento salvo: ${maq.codigo}, ${fmtNum(L, 2)} L.` })
    setMaq(null); setLitros(''); setLeitura(''); setObs(''); setAvisos([])
    sincronizar(sb())
  }

  if (todas && !todas.length) return <Aviso msg={{ erro: SEM_CADASTRO }} />

  return (
    <div className="space-y-5">
      <Titulo>Abastecer</Titulo>
      {seletorTanque}
      <SeletorMaquina maquinas={maquinas} valor={maq} onChange={(m) => { setMaq(m); setAvisos([]) }} />
      <Mostrador rotulo="Litros" digitos={litros} onChange={(d) => { setLitros(d); setAvisos([]) }} />

      <div>
        <div className="mb-1.5 flex items-end justify-between gap-3">
          <label htmlFor="leitura" className="text-[15px] font-semibold text-tinta/75">Horímetro / Km</label>
          <div className="segmento w-40 p-0.5 text-sm">
            <button aria-pressed={unidade === 'h'} onClick={() => maq && setEscolhaUnidade({ maq: maq.id, u: 'h' })} className="!py-1.5">Horas</button>
            <button aria-pressed={unidade === 'km'} onClick={() => maq && setEscolhaUnidade({ maq: maq.id, u: 'km' })} className="!py-1.5">Km</button>
          </div>
        </div>
        <div className="flex items-center rounded-xl border-2 border-tinta/15 bg-white pr-4 focus-within:border-mata">
          <input id="leitura" inputMode="decimal" value={leitura} placeholder={unidade === 'h' ? 'Ex.: 1.250,5' : 'Ex.: 48.300'}
            onChange={(e) => { setLeitura(e.target.value); setAvisos([]) }}
            className="num w-full min-w-0 bg-transparent px-4 py-3.5 text-xl font-semibold focus:outline-none" />
          <span className="font-semibold text-tinta/50">{unidade}</span>
        </div>
        {maq && (
          <p className="mt-1.5 text-[15px] text-tinta/60">
            {ultimoValor != null ? <>Último: <b className="num text-tinta">{fmtNum(ultimoValor)} {unidade}</b></> : 'Sem leitura anterior nesta máquina.'}
          </p>
        )}
      </div>

      <label className="block">
        <span className="rotulo">Observação <span className="font-normal text-tinta/45">(opcional)</span></span>
        <input className="campo" value={obs} onChange={(e) => setObs(e.target.value)} />
      </label>

      {avisos.length > 0 && <div role="alert" className="rounded-xl bg-diesel-claro px-4 py-3 font-medium text-tinta">{avisos.map((a) => <p key={a}>{a}</p>)}</div>}
      <Aviso msg={msg} />
      <button className="btn w-full" onClick={salvar}>{avisos.length ? 'Confirmar e salvar' : 'Salvar abastecimento'}</button>
    </div>
  )
}

export function Tanque({ perfil }: { perfil: Perfil }) {
  const [tanque, seletorTanque] = useTanque()
  const [tipo, setTipo] = useState<'entrada' | 'medicao'>('entrada')
  const [litros, setLitros] = useState('')
  const [nf, setNf] = useState('')
  const [msg, setMsg] = useState<Msg>(null)

  const info = useLiveQuery(async () => {
    if (!tanque) return null
    const srv = await db.saldos.get(tanque.id)
    if (!srv) return null
    // soma ao saldo baixado o que o servidor ainda não tinha quando baixamos
    const baixado: number = (await db.meta.get('baixado_em'))?.valor ?? 0
    const locais = (await db.registros.toArray()).filter((r) =>
      r.payload.tanque_id === tanque.id && (r.status === 'pendente' || (r.enviado_em ?? 0) > baixado))
    const abast = locais.filter((r) => r.tabela === 'va_abastecimentos').map((r) => r.payload as Abastecimento)
    const movs = locais.filter((r) => r.tabela === 'va_tanque_movimentos').map((r) => r.payload as Movimento)
    const desde = new Date(0).toISOString()
    const medLocal = movs.filter((m) => m.tipo === 'medicao').sort((a, b) => Date.parse(b.data_hora) - Date.parse(a.data_hora))[0]
    const med = medLocal && (!srv.medicao_data || Date.parse(medLocal.data_hora) > Date.parse(srv.medicao_data))
      ? { litros: medLocal.litros, data: medLocal.data_hora, dif: diferencaMedicao(medLocal, srv.saldo, desde, movs, abast) }
      : srv.medicao_data ? { litros: srv.medicao_litros, data: srv.medicao_data, dif: srv.medicao_diferenca } : null
    return { saldo: saldo(srv.saldo, desde, movs, abast), med }
  }, [tanque?.id])

  async function salvar() {
    setMsg(null)
    if (!tanque) return setMsg({ erro: SEM_CADASTRO })
    const L = litrosDeDigitos(litros)
    if (tipo === 'entrada' && !L) return setMsg({ erro: 'Informe os litros recebidos.' })
    if (tipo === 'medicao' && L == null) return setMsg({ erro: 'Informe os litros medidos.' })
    await salvarLocal('va_tanque_movimentos', {
      id: novoId(), user_id: perfil.id, tanque_id: tanque.id, tipo, litros: L!, data_hora: agora(),
      nota_fiscal: tipo === 'entrada' ? nf.trim() || null : null, criado_offline: !navigator.onLine,
    })
    setMsg({ ok: `${tipo === 'entrada' ? 'Entrada' : 'Medição'} salva: ${fmtNum(L, 2)} L.` })
    setLitros(''); setNf('')
    sincronizar(sb())
  }

  return (
    <div className="space-y-5">
      <Titulo>Tanque</Titulo>
      {seletorTanque}
      {info ? (
        <div className="rounded-2xl bg-white p-4">
          <div className="text-[15px] font-semibold text-tinta/60">Saldo calculado{tanque && ` do ${tanque.nome}`}</div>
          <div className="num font-display text-5xl font-bold text-mata-escuro">{fmtNum(info.saldo, 0)} <span className="text-2xl text-tinta/50">L</span></div>
          {info.med ? (
            <p className="mt-2 text-[15px] text-tinta/70">
              Última medição: <b className="num text-tinta">{fmtNum(info.med.litros, 0)} L</b> em {fmtDataHora(info.med.data!)}.{' '}
              Diferença: <b className={`num ${(info.med.dif ?? 0) < 0 ? 'text-alerta' : 'text-mata'}`}>{fmtNum(info.med.dif, 0)} L</b>
            </p>
          ) : <p className="mt-2 text-[15px] text-tinta/60">Nenhuma medição registrada.</p>}
        </div>
      ) : <Aviso msg={{ erro: SEM_CADASTRO }} />}

      <div className="segmento">
        <button aria-pressed={tipo === 'entrada'} onClick={() => setTipo('entrada')}>Entrada de diesel</button>
        <button aria-pressed={tipo === 'medicao'} onClick={() => setTipo('medicao')}>Medição física</button>
      </div>
      <Mostrador rotulo={tipo === 'entrada' ? 'Litros recebidos' : 'Litros medidos no tanque'} digitos={litros} onChange={setLitros} />
      {tipo === 'entrada' && (
        <label className="block">
          <span className="rotulo">Nota fiscal</span>
          <input className="campo" inputMode="numeric" value={nf} onChange={(e) => setNf(e.target.value)} />
        </label>
      )}
      <Aviso msg={msg} />
      <button className="btn w-full" onClick={salvar}>{tipo === 'entrada' ? 'Salvar entrada' : 'Salvar medição'}</button>
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

  async function apagar(id: string) {
    if (!confirm('Apagar este lançamento? Ele ainda não foi enviado.')) return
    try { await apagarPendente(id) } catch (e) { alert((e as Error).message) }
  }

  if (!regs) return null
  const total = regs.filter((r) => r.tabela === 'va_abastecimentos').reduce((s, r) => s + Number(r.payload.litros), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <Titulo>Hoje</Titulo>
        {total > 0 && <span className="num text-[15px] text-tinta/60">{fmtNum(total, 0)} L abastecidos</span>}
      </div>
      {!regs.length && <p className="rounded-2xl bg-white px-4 py-8 text-center text-tinta/60">Nenhum lançamento hoje. Os abastecimentos que você salvar aparecem aqui.</p>}
      <ul className="space-y-2">
        {regs.map((r) => {
          const abast = r.tabela === 'va_abastecimentos'
          const a = r.payload as Abastecimento, mv = r.payload as Movimento
          const m = abast ? maquinas.find((x) => x.id === a.maquina_id) : null
          return (
            <li key={r.id} className={`flex items-center gap-3 rounded-2xl border-l-[6px] bg-white py-3 pl-3 pr-3 ${abast ? 'border-diesel' : 'border-mata'}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-xl font-bold">{abast ? (m?.codigo ?? 'Máquina') : mv.tipo === 'entrada' ? 'Entrada' : 'Medição'}</span>
                  <span className="truncate text-tinta/60">{abast ? m?.nome : mv.nota_fiscal ? `NF ${mv.nota_fiscal}` : 'no tanque'}</span>
                </div>
                <div className="num text-[15px] text-tinta/70">
                  {fmtHora(r.data_hora)} — <b className="text-tinta">{fmtNum(r.payload.litros, 2)} L</b>
                  {abast && a.horimetro != null && `, ${fmtNum(a.horimetro)} h`}
                  {abast && a.km != null && `, ${fmtNum(a.km)} km`}
                </div>
                <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${r.status === 'pendente' ? 'bg-diesel-claro text-diesel-escuro' : 'bg-mata-claro text-mata'}`}>
                  {r.status === 'pendente' ? 'Aguardando envio' : 'Enviado'}
                </span>
              </div>
              {r.status === 'pendente' && <button className="rounded-xl px-3 py-3 font-semibold text-alerta active:bg-alerta-claro" onClick={() => apagar(r.id)}>Apagar</button>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
