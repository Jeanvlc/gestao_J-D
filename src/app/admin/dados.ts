import { createClient } from '@/lib/supabase/client'

/** Lê a tabela inteira em páginas de 1000 (limite padrão do Supabase por requisição). */
export async function todos<T = any>(tabela: string, colunas = '*'): Promise<T[]> {
  const chave = tabela === 'va_perfis' ? 'user_id' : 'id'
  const sb = createClient()
  const out: T[] = []
  for (let i = 0; ; i += 1000) {
    const { data, error } = await sb.from(tabela).select(colunas).order(chave).range(i, i + 999)
    if (error) throw new Error(error.message)
    out.push(...(data as T[]))
    if (data.length < 1000) return out
  }
}

// ExcelJS grava Date como UTC; desloca para o horário de SP (ver OFFSET em lib/format.ts)
export const dataExcel = (iso: string) => new Date(Date.parse(iso) - 3 * 3600_000)

export async function baixarExcel(arquivo: string, abas: Record<string, object[]>) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  for (const [nome, linhas] of Object.entries(abas)) {
    const ws = wb.addWorksheet(nome.slice(0, 31))
    const cols = Object.keys(linhas[0] ?? {})
    ws.columns = cols.map((c) => ({ header: c, key: c, width: Math.max(12, c.length + 2) }))
    ws.addRows(linhas)
    ws.getRow(1).font = { bold: true }
    cols.forEach((c, i) => {
      if ((linhas[0] as any)[c] instanceof Date) ws.getColumn(i + 1).numFmt = 'dd/mm/yyyy hh:mm'
    })
  }
  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = arquivo
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
