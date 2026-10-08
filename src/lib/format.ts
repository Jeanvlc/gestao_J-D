// Formatos brasileiros, fuso America/Sao_Paulo
const TZ = 'America/Sao_Paulo'
// ponytail: Brasil sem horário de verão desde 2019; se voltar, trocar o -03:00 fixo por cálculo de offset
const OFFSET = '-03:00'

const fDataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})
const fData = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
const fHora = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const fIso = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
})

export const fmtDataHora = (iso: string | number) => fDataHora.format(new Date(iso))
export const fmtData = (iso: string | number) => fData.format(new Date(iso))
export const fmtHora = (iso: string | number) => fHora.format(new Date(iso))

export const fmtNum = (n: number | null | undefined, casas = 1) =>
  n == null || !Number.isFinite(n)
    ? '—'
    : n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

/** "1.234,5" → 1234.5; "12.5" (teclado sem vírgula) → 12.5; vazio → null; inválido → NaN */
export function parseNum(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
  return Number.isFinite(n) ? n : NaN
}

/** 'aaaa-mm-dd HH:mm' no fuso de SP */
const isoSP = (d: string | number | Date) => fIso.format(new Date(d))
/** dia (aaaa-mm-dd) em SP */
export const diaSP = (d: string | number | Date) => isoSP(d).slice(0, 10)
export const hojeSP = () => diaSP(Date.now())

/** limites de um dia de SP como timestamptz */
export const inicioDiaSP = (dia: string) => `${dia}T00:00:00${OFFSET}`
export const fimDiaSP = (dia: string) => `${dia}T23:59:59.999${OFFSET}`

/** <input type="datetime-local"> ↔ timestamptz */
export const paraInputDataHora = (iso: string) => isoSP(iso).replace(' ', 'T')
export const deInputDataHora = (v: string) => new Date(`${v}:00${OFFSET}`).toISOString()

/** Máscara de litros com vírgula fixa: digitar 12050 mostra "120,50". Guarda só os dígitos. */
export const digitosLitros = (texto: string) => texto.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7)
export const litrosDeDigitos = (d: string) => (d ? Number(d) / 100 : null)
export const mostrarLitros = (d: string) => (d ? fmtNum(Number(d) / 100, 2) : '')
