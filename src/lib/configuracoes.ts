import { ITENS_PADRAO } from './checklistFechamento'

export const CHAVE_CHECKLIST_FECHAMENTO = 'checklist_fechamento'
export const CHAVE_CHECKLIST_TAREFA = 'checklist_tarefa'

export interface TemplateItemFechamento {
  chave: string
  label: string
  critico: boolean
}

export interface TemplateItemTarefa {
  chave: string
  label: string
}

export const CHECKLIST_TAREFA_PADRAO: TemplateItemTarefa[] = [
  { chave: 'levantar_informacoes', label: 'Levantar informações' },
  { chave: 'executar', label: 'Executar' },
  { chave: 'revisar', label: 'Revisar' },
  { chave: 'entregar_comunicar', label: 'Entregar / comunicar' },
]

export async function obterTemplateChecklistFechamento(prisma: any, userId: string): Promise<TemplateItemFechamento[]> {
  const config = await prisma.configuracao.findUnique({
    where: { userId_chave: { userId, chave: CHAVE_CHECKLIST_FECHAMENTO } },
  })
  if (config?.valor && Array.isArray(config.valor) && config.valor.length > 0) {
    return config.valor as TemplateItemFechamento[]
  }
  return ITENS_PADRAO
}

export async function obterTemplateChecklistTarefa(prisma: any, userId: string): Promise<TemplateItemTarefa[]> {
  const config = await prisma.configuracao.findUnique({
    where: { userId_chave: { userId, chave: CHAVE_CHECKLIST_TAREFA } },
  })
  if (config?.valor && Array.isArray(config.valor)) {
    return config.valor as TemplateItemTarefa[]
  }
  return CHECKLIST_TAREFA_PADRAO
}
