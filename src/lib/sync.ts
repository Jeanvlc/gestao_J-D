import { db, type EstadoSync, type Registro } from './db'

// Só o que usamos do supabase-js — facilita testar com um servidor falso
type Resp = PromiseLike<{ data?: any; error: { message: string } | null }>
export type Cliente = {
  from(tabela: string): {
    upsert(linhas: object[], opcoes: { onConflict: string; ignoreDuplicates: boolean }): Resp
    select(colunas: string): { eq(coluna: string, valor: unknown): Resp }
  }
  rpc(funcao: string): Resp
}

const SETE_DIAS = 7 * 24 * 3600 * 1000

/**
 * Envia a fila. Idempotente: o id do registro (gerado no celular) é a PK, e o envio é
 * INSERT ... ON CONFLICT DO NOTHING. Se cair no meio, o que não foi confirmado continua
 * 'pendente' e é reenviado; o que já chegou no servidor é ignorado.
 */
export async function enviarPendentes(sb: Cliente): Promise<number> {
  const pendentes = await db.registros.where('status').equals('pendente').toArray()
  const porTabela = new Map<string, Registro[]>()
  for (const r of pendentes) porTabela.set(r.tabela, [...(porTabela.get(r.tabela) ?? []), r])

  for (const [tabela, regs] of porTabela) {
    const { error } = await sb.from(tabela).upsert(regs.map((r) => r.payload), { onConflict: 'id', ignoreDuplicates: true })
    if (error) throw new Error(error.message)
    const agora = Date.now()
    await db.registros.where('id').anyOf(regs.map((r) => r.id)).modify({ status: 'enviado', enviado_em: agora })
  }
  return pendentes.length
}

/** Baixa cadastros, últimas leituras e saldos para funcionar sem sinal. */
export async function baixarCadastros(sb: Cliente) {
  const inicio = Date.now() // registros enviados depois disto ainda não estão nos saldos baixados
  const [maq, tq, leit, sal] = await Promise.all([
    sb.from('va_maquinas').select('id,codigo,nome,centro_custo_id').eq('ativo', true),
    sb.from('va_tanques').select('id,nome,va_tanque_centros(centro_custo_id)').eq('ativo', true),
    sb.rpc('va_ultimas_leituras'),
    sb.rpc('va_saldos'),
  ])
  const erro = maq.error ?? tq.error ?? leit.error ?? sal.error
  if (erro) throw new Error(erro.message)

  await db.transaction('rw', [db.maquinas, db.tanques, db.leituras, db.saldos, db.meta, db.registros], async () => {
    await db.maquinas.clear(); await db.maquinas.bulkPut(maq.data)
    await db.tanques.clear()
    await db.tanques.bulkPut(tq.data.map((t: any) => ({
      id: t.id, nome: t.nome, centros: (t.va_tanque_centros ?? []).map((v: any) => v.centro_custo_id),
    })))
    await db.leituras.clear(); await db.leituras.bulkPut(leit.data)
    await db.saldos.clear(); await db.saldos.bulkPut(sal.data)
    await db.meta.put({ chave: 'baixado_em', valor: inicio })
    // histórico local: guarda enviados por 7 dias
    await db.registros.where('status').equals('enviado').filter((r) => (r.enviado_em ?? 0) < inicio - SETE_DIAS).delete()
  })
}

let rodando: Promise<void> | null = null
let tentativas = 0
let timer: ReturnType<typeof setTimeout> | undefined

const estado = async (e: Partial<EstadoSync>) => {
  const atual: EstadoSync = (await db.meta.get('sync'))?.valor ?? { enviando: false, erro: null, ultimo: null }
  await db.meta.put({ chave: 'sync', valor: { ...atual, ...e } })
}

// falha de rede vira texto para o motorista; erro do servidor (ex.: sessão expirada) aparece como veio
const mensagemErro = (e: unknown) =>
  e instanceof Error && /fetch|network|timeout|abort/i.test(`${e.name} ${e.message}`)
    ? 'Sem conexão. Vai tentar de novo sozinho.'
    : e instanceof Error ? e.message : String(e)

export const sincronizando = () => rodando !== null

/** Envia e baixa. Chamado ao abrir o app, no evento `online`, ao voltar para o app e no botão. */
export function sincronizar(sb: Cliente): Promise<void> {
  if (rodando) return rodando
  clearTimeout(timer)
  rodando = (async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await estado({ enviando: false, erro: 'Sem sinal' })
      return // o evento `online` chama de novo
    }
    await estado({ enviando: true })
    try {
      await enviarPendentes(sb)
      await baixarCadastros(sb)
      tentativas = 0
      await estado({ enviando: false, erro: null, ultimo: Date.now() })
    } catch (e) {
      tentativas++
      await estado({ enviando: false, erro: mensagemErro(e) })
      // tentativa automática: 5 s, 10 s, 20 s… até 5 min
      timer = setTimeout(() => sincronizar(sb), Math.min(300_000, 5000 * 2 ** (tentativas - 1)))
    }
  })().finally(() => { rodando = null })
  return rodando
}

/** Só apaga o que ainda não foi enviado, e nunca durante um envio (o registro poderia estar a caminho). */
export async function apagarPendente(id: string) {
  if (rodando) throw new Error('Aguarde o envio terminar')
  const r = await db.registros.get(id)
  if (r?.status !== 'pendente') throw new Error('Registro já enviado; peça ao administrador para corrigir')
  await db.registros.delete(id)
}
