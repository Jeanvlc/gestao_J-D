import { describe, expect, it } from 'vitest'
import { parseDuracao, validarHectares, validarMinutos, fmtDuracao, diferencaMedicao, kmPorLitro, litrosPorHora, maquinasDoTanque, saldo, ultimaLeitura, validarLeitura, validarLitros } from '../src/lib/calc'
import { parseNum, diaSP, digitosLitros, litrosDeDigitos, mostrarLitros } from '../src/lib/format'

const t = (h: number) => new Date(Date.UTC(2026, 9, 1, h)).toISOString()

describe('saldo do tanque', () => {
  const movs = [
    { tipo: 'entrada' as const, litros: 3000, data_hora: t(10) },
    { tipo: 'medicao' as const, litros: 6750, data_hora: t(20) }, // medição não entra no saldo
    { tipo: 'entrada' as const, litros: 999, data_hora: t(1) }, // antes do saldo inicial: ignorada
  ]
  const abast = [{ litros: 700, data_hora: t(12) }, { litros: 500, data_hora: t(15) }, { litros: 100, data_hora: t(22) }]

  it('inicial + entradas − abastecimentos', () => {
    expect(saldo(5000, t(5), movs, abast)).toBe(5000 + 3000 - 1300)
  })
  it('até uma data', () => {
    expect(saldo(5000, t(5), movs, abast, t(15))).toBe(6800)
  })
  it('diferença da medição usa o saldo do momento da medição', () => {
    expect(diferencaMedicao(movs[1], 5000, t(5), movs, abast)).toBe(-50)
  })
  it('sem erro de ponto flutuante', () => {
    expect(saldo(0.1, t(0), [], [{ litros: 0.2, data_hora: t(1) }])).toBe(-0.1)
  })
})

describe('consumo', () => {
  const a = [
    { data_hora: t(8), litros: 200, horimetro: 1000, km: 50000 }, // primeiro: só referência
    { data_hora: t(12), litros: 40, horimetro: null, km: null }, // sem leitura, mas o diesel conta
    { data_hora: t(18), litros: 80, horimetro: 1010, km: 50600 },
  ]
  it('L/h = litros depois do 1º ÷ diferença de horímetro', () => {
    expect(litrosPorHora(a)).toBe(12)
  })
  it('km/L', () => {
    expect(kmPorLitro(a)).toBe(5)
  })
  it('null com menos de 2 leituras ou diferença zero', () => {
    expect(litrosPorHora(a.slice(0, 2))).toBeNull()
    expect(litrosPorHora([a[0], { ...a[2], horimetro: 1000 }])).toBeNull()
  })
})

describe('validação', () => {
  it('bloqueia horímetro/km menor que o último', () => {
    expect(validarLeitura('horimetro', 999, 1000).erro).toBeTruthy()
    expect(validarLeitura('km', 49_999, 50_000).erro).toBeTruthy()
  })
  it('avisa salto fora do normal', () => {
    expect(validarLeitura('horimetro', 1100, 1000).aviso).toBeTruthy()
    expect(validarLeitura('horimetro', 1008, 1000)).toEqual({})
  })
  it('sem última leitura ou campo vazio passa', () => {
    expect(validarLeitura('km', 10, null)).toEqual({})
    expect(validarLeitura('km', null, 10)).toEqual({})
  })
  it('litros', () => {
    expect(validarLitros(null).erro).toBeTruthy()
    expect(validarLitros(0).erro).toBeTruthy()
    expect(validarLitros(5000).aviso).toBeTruthy()
  })
  it('última leitura considera o aparelho', () => {
    expect(ultimaLeitura(1000, [1005, null])).toBe(1005)
    expect(ultimaLeitura(null, [])).toBeNull()
  })
})

describe('formato BR', () => {
  it('parseNum', () => {
    expect(parseNum('1.234,5')).toBe(1234.5)
    expect(parseNum('12,5')).toBe(12.5)
    expect(parseNum('12.5')).toBe(12.5)
    expect(parseNum('')).toBeNull()
    expect(parseNum('abc')).toBeNaN()
  })
  it('dia em SP (02:00 UTC ainda é o dia anterior)', () => {
    expect(diaSP('2026-10-02T02:00:00Z')).toBe('2026-10-01')
  })
})

describe('centro de custo', () => {
  const ms = [{ id: 'a', centro_custo_id: 'c1' }, { id: 'b', centro_custo_id: 'c2' }, { id: 'c', centro_custo_id: null }]
  it('comboio vê só máquinas dos seus centros', () => {
    expect(maquinasDoTanque(ms, ['c1']).map((m) => m.id)).toEqual(['a'])
    expect(maquinasDoTanque(ms, ['c1', 'c2']).map((m) => m.id)).toEqual(['a', 'b'])
  })
  it('comboio sem centro vinculado vê todas', () => {
    expect(maquinasDoTanque(ms, [])).toHaveLength(3)
    expect(maquinasDoTanque(ms, undefined)).toHaveLength(3) // cache antigo, antes de baixar de novo
  })
})

describe('máscara de litros', () => {
  it('vírgula automática', () => {
    expect(mostrarLitros(digitosLitros('12050'))).toBe('120,50')
    expect(mostrarLitros(digitosLitros('5'))).toBe('0,05')
    expect(mostrarLitros(digitosLitros('1234567'))).toBe('12.345,67')
  })
  it('apagar remove o último dígito', () => {
    expect(digitosLitros('120,5')).toBe('1205')
    expect(litrosDeDigitos(digitosLitros('0,0'))).toBeNull()
  })
})

import { alertas } from '../src/lib/alertas'
describe('alertas', () => {
  const nome = (id: string) => id
  const a = (id: string, h: number, litros: number, horimetro: number | null, extra = {}) =>
    ({ id, maquina_id: 'm1', data_hora: t(h), litros, horimetro, ...extra })
  it('lançamento normal não gera alerta', () => {
    expect(alertas([a('1', 1, 100, 1000), a('2', 5, 80, 1010)], nome)).toEqual([])
  })
  it('litros altos, horímetro que voltou e repetido', () => {
    const r = alertas([a('1', 1, 100, 1000), a('2', 5, 1500, 990), a('3', 5.05, 1500, null)], nome).map((x) => x.id)
    expect(r).toContain('2'); expect(r).toContain('3')
  })
  it('data no futuro ou muito antiga em relação ao envio', () => {
    expect(alertas([a('1', 10, 50, null, { recebido_em: t(1) })], nome)).toHaveLength(1)
    expect(alertas([a('1', 1, 50, null, { recebido_em: t(24 * 5) })], nome)).toHaveLength(1)
    expect(alertas([a('1', 1, 50, null, { recebido_em: t(2) })], nome)).toEqual([])
  })
  it('consumo por hora muito acima da média da máquina', () => {
    const base = [a('1', 1, 0.01, 1000), a('2', 2, 100, 1010), a('3', 3, 100, 1020), a('4', 4, 100, 1030), a('5', 5, 800, 1040)]
    expect(alertas(base, nome).map((x) => x.id)).toEqual(['5'])
  })
})

describe('produção', () => {
  it('duração em vários formatos', () => {
    expect(parseDuracao('1:30')).toBe(90)
    expect(parseDuracao('1,5')).toBe(90)
    expect(parseDuracao('2h')).toBe(120)
    expect(parseDuracao('45 min')).toBe(45)
    expect(parseDuracao('')).toBeNull()
    expect(parseDuracao('abc')).toBeNull()
    expect(fmtDuracao(95)).toBe('1h35')
  })
  it('validações', () => {
    expect(validarHectares(0).erro).toBeTruthy()
    expect(validarHectares(120).aviso).toBeTruthy()
    expect(validarHectares(12.5)).toEqual({})
    expect(validarMinutos(null).erro).toBeTruthy()
    expect(validarMinutos(2000).erro).toBeTruthy()
    expect(validarMinutos(700).aviso).toBeTruthy()
  })
})
