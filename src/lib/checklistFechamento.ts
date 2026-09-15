export interface ItemChecklist {
  chave: string
  label: string
  critico: boolean
  concluido: boolean
}

// Checklist padrão de fechamento mensal. Itens críticos bloqueiam o fechamento
// da competência a menos que alguém justifique e autorize a exceção.
export const ITENS_PADRAO: Omit<ItemChecklist, 'concluido'>[] = [
  { chave: 'documentos_recebidos', label: 'Documentos recebidos', critico: false },
  { chave: 'notas_conferidas', label: 'Notas fiscais conferidas', critico: true },
  { chave: 'xml_importados', label: 'XML importados', critico: false },
  { chave: 'folha_recebida', label: 'Folha recebida', critico: false },
  { chave: 'folha_conferida', label: 'Folha conferida', critico: true },
  { chave: 'tributos_calculados', label: 'Tributos calculados', critico: true },
  { chave: 'guias_conferidas', label: 'Guias conferidas', critico: true },
  { chave: 'obrigacoes_transmitidas', label: 'Obrigações transmitidas', critico: true },
  { chave: 'recibos_arquivados', label: 'Recibos arquivados', critico: false },
  { chave: 'cliente_comunicado', label: 'Cliente comunicado', critico: false },
]

export function criarChecklistPadrao(): ItemChecklist[] {
  return ITENS_PADRAO.map(item => ({ ...item, concluido: false }))
}

export function pendenciasCriticas(itens: ItemChecklist[]): ItemChecklist[] {
  return itens.filter(item => item.critico && !item.concluido)
}
