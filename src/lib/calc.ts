import { fmtNum } from './format'

export type AbastCalc = { data_hora: string; litros: number; horimetro?: number | null; km?: number | null }
export type MovCalc = { data_hora: string; litros: number; tipo: 'entrada' | 'medicao' }

const soma = (xs: { litros: number }[]) => xs.reduce((s, x) => s + Number(x.litros), 0)
const arred = (n: number) => Math.round(n * 100) / 100

/** saldo = inicial + entradas − abastecimentos, de `desde` até `ate` (inclusive). Igual a va_saldo_ate no SQL. */
export function saldo(inicial: number, desde: string, movs: MovCalc[], abast: AbastCalc[], ate?: string): number {
  const t0 = Date.parse(desde)
  const t1 = ate ? Date.parse(ate) : Infinity
  const dentro = (d: string) => { const t = Date.parse(d); return t >= t0 && t <= t1 }
  return arred(
    Number(inicial) +
      soma(movs.filter((m) => m.tipo === 'entrada' && dentro(m.data_hora))) -
      soma(abast.filter((a) => dentro(a.data_hora)))
  )
}

/** medição física − saldo calculado no momento da medição (negativo = falta diesel) */
export const diferencaMedicao = (medicao: MovCalc, inicial: number, desde: string, movs: MovCalc[], abast: AbastCalc[]) =>
  arred(Number(medicao.litros) - saldo(inicial, desde, movs, abast, medicao.data_hora))

/**
 * Consumo pelo método "tanque cheio": o diesel de cada abastecimento repõe o que foi gasto desde o anterior.
 * Leitura = última − primeira leitura; litros = tudo abastecido depois do primeiro com leitura até o último.
 * Supõe que a máquina é completada a cada abastecimento.
 */
function consumo(abast: AbastCalc[], campo: 'horimetro' | 'km') {
  const com = abast.filter((a) => a[campo] != null).sort((a, b) => Date.parse(a.data_hora) - Date.parse(b.data_hora))
  if (com.length < 2) return null
  const ini = Date.parse(com[0].data_hora)
  const fim = Date.parse(com[com.length - 1].data_hora)
  const delta = Number(com[com.length - 1][campo]) - Number(com[0][campo])
  const litros = soma(abast.filter((a) => { const t = Date.parse(a.data_hora); return t > ini && t <= fim }))
  return { delta, litros }
}

/** L/h = litros ÷ diferença de horímetro */
export function litrosPorHora(abast: AbastCalc[]): number | null {
  const c = consumo(abast, 'horimetro')
  return c && c.delta > 0 ? c.litros / c.delta : null
}

export function kmPorLitro(abast: AbastCalc[]): number | null {
  const c = consumo(abast, 'km')
  return c && c.litros > 0 && c.delta > 0 ? c.delta / c.litros : null
}

// ponytail: limites fixos para "valor fora do normal"; se der alarme falso, criar limite por tipo de máquina
export const LIMITES = { horimetro: 24, km: 1500, litros: 1000 }

export type Validacao = { erro?: string; aviso?: string }

export function validarLeitura(campo: 'horimetro' | 'km', novo: number | null, ultimo: number | null): Validacao {
  const nome = campo === 'horimetro' ? 'Horímetro' : 'Km'
  if (novo == null) return {}
  if (Number.isNaN(novo) || novo < 0) return { erro: `${nome} inválido` }
  if (ultimo == null) return {}
  if (novo < ultimo) return { erro: `${nome} menor que o último (${fmtNum(ultimo)})` }
  if (novo - ultimo > LIMITES[campo]) return { aviso: `${nome} subiu ${fmtNum(novo - ultimo)} desde o último. Confira.` }
  return {}
}

export function validarLitros(litros: number | null): Validacao {
  if (litros == null || Number.isNaN(litros) || litros <= 0) return { erro: 'Informe os litros' }
  if (litros > LIMITES.litros) return { aviso: `${fmtNum(litros)} L é muito acima do normal. Confira.` }
  return {}
}

/** maior leitura entre a do servidor e as gravadas no aparelho */
export function ultimaLeitura(servidor: number | null | undefined, locais: (number | null | undefined)[]): number | null {
  const xs = [servidor, ...locais].filter((x): x is number => x != null).map(Number)
  return xs.length ? Math.max(...xs) : null
}

/**
 * Comboio só abastece máquinas dos centros de custo dele. Sem centro vinculado, atende todas.
 * `centros` pode vir undefined no cache de aparelhos que ainda não baixaram depois da versão 1.1.0.
 */
export function maquinasDoTanque<M extends { centro_custo_id: string | null }>(maquinas: M[], centros: string[] | undefined): M[] {
  return centros?.length ? maquinas.filter((m) => m.centro_custo_id != null && centros.includes(m.centro_custo_id)) : maquinas
}
