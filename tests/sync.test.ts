import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, salvarLocal, type Abastecimento, type Movimento } from '../src/lib/db'
import { apagarPendente, enviarPendentes, type Cliente } from '../src/lib/sync'

/** Servidor falso com a semântica do Postgres: PK por id, ON CONFLICT DO NOTHING */
function servidorFalso() {
  const tabelas = new Map<string, Map<string, object>>()
  const falhar = new Set<string>()
  let requisicoes = 0
  const cliente: Cliente = {
    from: (tabela) => ({
      upsert: async (linhas: any[], o) => {
        requisicoes++
        expect(o).toEqual({ onConflict: 'id', ignoreDuplicates: true })
        if (falhar.has(tabela)) return { error: { message: 'sem sinal' } }
        const t = tabelas.get(tabela) ?? new Map()
        for (const l of linhas) if (!t.has(l.id)) t.set(l.id, l)
        tabelas.set(tabela, t)
        return { error: null }
      },
      select: () => ({ eq: async () => ({ data: [], error: null }) }),
    }),
    rpc: async () => ({ data: [], error: null }),
  }
  return { cliente, falhar, total: (t: string) => tabelas.get(t)?.size ?? 0, requisicoes: () => requisicoes }
}

const abast = (id: string): Abastecimento => ({
  id, user_id: 'u1', tanque_id: 't1', maquina_id: 'm1', data_hora: new Date().toISOString(),
  litros: 100, horimetro: null, km: null, observacao: null, criado_offline: true,
})
const mov = (id: string): Movimento => ({
  id, user_id: 'u1', tanque_id: 't1', tipo: 'entrada', litros: 5000, nota_fiscal: '123',
  data_hora: new Date().toISOString(), criado_offline: true,
})
const status = async () => Object.fromEntries((await db.registros.toArray()).map((r) => [r.id, r.status]))

beforeEach(async () => { await db.registros.clear() })

describe('sincronização idempotente', () => {
  it('falha no meio não perde nada e reenvio não duplica', async () => {
    const s = servidorFalso()
    await salvarLocal('va_abastecimentos', abast('a1'))
    await salvarLocal('va_abastecimentos', abast('a2'))
    await salvarLocal('va_tanque_movimentos', mov('m1'))

    s.falhar.add('va_tanque_movimentos')
    await expect(enviarPendentes(s.cliente)).rejects.toThrow('sem sinal')
    expect(await status()).toEqual({ a1: 'enviado', a2: 'enviado', m1: 'pendente' })

    // resposta perdida: servidor gravou, mas o celular não soube → a1 volta a pendente
    await db.registros.update('a1', { status: 'pendente' })
    s.falhar.clear()
    await enviarPendentes(s.cliente)

    expect(await status()).toEqual({ a1: 'enviado', a2: 'enviado', m1: 'enviado' })
    expect(s.total('va_abastecimentos')).toBe(2)
    expect(s.total('va_tanque_movimentos')).toBe(1)
  })

  it('sem pendentes não faz requisição', async () => {
    const s = servidorFalso()
    expect(await enviarPendentes(s.cliente)).toBe(0)
    expect(s.requisicoes()).toBe(0)
  })

  it('só apaga registro pendente', async () => {
    const s = servidorFalso()
    await salvarLocal('va_abastecimentos', abast('a1'))
    await salvarLocal('va_abastecimentos', abast('a2'))
    await apagarPendente('a1')
    await enviarPendentes(s.cliente)
    await expect(apagarPendente('a2')).rejects.toThrow()
    expect(await status()).toEqual({ a2: 'enviado' })
  })
})
