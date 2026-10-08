import Dexie, { type Table } from 'dexie'

// Fase 2: acrescentar 'va_producoes' aqui; fila e envio já são genéricos por tabela.
export type Tabela = 'va_abastecimentos' | 'va_tanque_movimentos'

export type Abastecimento = {
  id: string; user_id: string; tanque_id: string; maquina_id: string; data_hora: string
  litros: number; horimetro: number | null; km: number | null; observacao: string | null; criado_offline: boolean
}
export type Movimento = {
  id: string; user_id: string; tanque_id: string; tipo: 'entrada' | 'medicao'; litros: number
  nota_fiscal: string | null; data_hora: string; criado_offline: boolean
}

/** Tudo é gravado aqui primeiro; `status` vira 'enviado' só depois que o servidor confirmou. */
export type Registro = {
  id: string
  tabela: Tabela
  status: 'pendente' | 'enviado'
  payload: Abastecimento | Movimento
  data_hora: string
  enviado_em?: number
}

export type Maquina = { id: string; codigo: string; nome: string; tipo: string | null }
export type Tanque = { id: string; nome: string }
export type Leitura = { maquina_id: string; horimetro: number | null; km: number | null }
export type Saldo = {
  tanque_id: string; saldo: number
  medicao_litros: number | null; medicao_data: string | null; medicao_diferenca: number | null
}
export type EstadoSync = { enviando: boolean; erro: string | null; ultimo: number | null }

class BancoLocal extends Dexie {
  registros!: Table<Registro, string>
  maquinas!: Table<Maquina, string>
  tanques!: Table<Tanque, string>
  leituras!: Table<Leitura, string>
  saldos!: Table<Saldo, string>
  meta!: Table<{ chave: string; valor: any }, string>

  constructor() {
    super('va-campo')
    this.version(1).stores({
      registros: 'id, status, tabela, data_hora',
      maquinas: 'id',
      tanques: 'id',
      leituras: 'maquina_id',
      saldos: 'tanque_id',
      meta: 'chave',
    })
  }
}

export const db = new BancoLocal()

export async function salvarLocal(tabela: Tabela, payload: Abastecimento | Movimento) {
  await db.registros.add({ id: payload.id, tabela, status: 'pendente', payload, data_hora: payload.data_hora })
}

// Perfil de quem está logado no aparelho (lido sem rede)
export type Perfil = { id: string; nome: string; papel: 'motorista' | 'operador' | 'admin' }
const CHAVE_PERFIL = 'va-perfil'
export function lerPerfil(): Perfil | null {
  try { return JSON.parse(localStorage.getItem(CHAVE_PERFIL) ?? 'null') } catch { return null }
}
export const gravarPerfil = (p: Perfil | null) =>
  p ? localStorage.setItem(CHAVE_PERFIL, JSON.stringify(p)) : localStorage.removeItem(CHAVE_PERFIL)
