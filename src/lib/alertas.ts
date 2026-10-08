import { LIMITES } from './calc'
import { fmtNum } from './format'

export type AbastAlerta = {
  id: string; maquina_id: string; data_hora: string; litros: number; horimetro: number | null; recebido_em?: string
}
export type Alerta = { id: string; texto: string }

const DIA = 24 * 3600e3

/** Lançamentos que merecem uma conferência do admin. Não bloqueia nada. */
export function alertas(abast: AbastAlerta[], nomeMaquina: (id: string) => string): Alerta[] {
  const out: Alerta[] = []
  const add = (a: AbastAlerta, texto: string) => out.push({ id: a.id, texto: `${nomeMaquina(a.maquina_id)}: ${texto}` })
  const porMaq = new Map<string, AbastAlerta[]>()
  for (const a of abast) porMaq.set(a.maquina_id, [...(porMaq.get(a.maquina_id) ?? []), a])

  for (const as of porMaq.values()) {
    as.sort((a, b) => Date.parse(a.data_hora) - Date.parse(b.data_hora))
    let maiorHorimetro: number | null = null
    const lh: { a: AbastAlerta; valor: number }[] = []
    let anterior: AbastAlerta | null = null
    for (const a of as) {
      if (Number(a.litros) > LIMITES.litros) add(a, `${fmtNum(Number(a.litros), 2)} L é muito acima do normal`)
      if (a.recebido_em) {
        const atraso = Date.parse(a.recebido_em) - Date.parse(a.data_hora)
        if (atraso < -10 * 60e3) add(a, 'data no futuro (relógio do celular errado?)')
        else if (atraso > 3 * DIA) add(a, `data ${Math.round(atraso / DIA)} dias antes do envio (relógio do celular errado?)`)
      }
      if (anterior && Number(a.litros) === Number(anterior.litros) && Date.parse(a.data_hora) - Date.parse(anterior.data_hora) < 10 * 60e3) {
        add(a, `possível lançamento repetido (${fmtNum(Number(a.litros), 2)} L duas vezes em menos de 10 min)`)
      }
      if (a.horimetro != null) {
        const h = Number(a.horimetro)
        if (maiorHorimetro != null && h < maiorHorimetro) add(a, `horímetro ${fmtNum(h)} menor que um anterior (${fmtNum(maiorHorimetro)})`)
        else if (maiorHorimetro != null && h > maiorHorimetro) lh.push({ a, valor: Number(a.litros) / (h - maiorHorimetro) })
        maiorHorimetro = Math.max(maiorHorimetro ?? h, h)
      }
      anterior = a
    }
    // consumo por hora muito acima do habitual da própria máquina
    if (lh.length >= 3) {
      const media = lh.reduce((s, x) => s + x.valor, 0) / lh.length
      for (const x of lh) if (x.valor > media * 1.8) add(x.a, `consumo de ${fmtNum(x.valor, 1)} L/h, bem acima da média da máquina (${fmtNum(media, 1)} L/h)`)
    }
  }
  return out
}
