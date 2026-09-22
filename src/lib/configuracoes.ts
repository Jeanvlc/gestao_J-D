import { ITENS_PADRAO } from './checklistFechamento'

export const CHAVE_CHECKLIST_FECHAMENTO = 'checklist_fechamento'
export const CHAVE_CHECKLIST_TAREFA = 'checklist_tarefa'
export const CHAVE_ROTEIRO_SOCIETARIO = 'checklist_societario'

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

export interface EtapaRoteiroSocietario {
  chave: string
  label: string
}

export const ROTEIRO_SOCIETARIO_PADRAO: EtapaRoteiroSocietario[] = [
  { chave: 'consulta_viabilidade', label: 'Consulta de viabilidade' },
  { chave: 'elaboracao_contrato_social', label: 'Elaboração do contrato social' },
  { chave: 'registro_junta_comercial', label: 'Registro na Junta Comercial' },
  { chave: 'inscricao_cnpj_receita', label: 'Inscrição CNPJ na Receita Federal' },
  { chave: 'inscricao_estadual', label: 'Inscrição Estadual' },
  { chave: 'alvara_funcionamento', label: 'Alvará de Funcionamento' },
  { chave: 'inscricao_municipal', label: 'Inscrição Municipal' },
  { chave: 'abertura_conta_pj', label: 'Abertura de conta PJ' },
  { chave: 'enquadramento_tributario', label: 'Enquadramento tributário' },
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

export async function obterRoteiroSocietario(prisma: any, userId: string): Promise<EtapaRoteiroSocietario[]> {
  const config = await prisma.configuracao.findUnique({
    where: { userId_chave: { userId, chave: CHAVE_ROTEIRO_SOCIETARIO } },
  })
  if (config?.valor && Array.isArray(config.valor) && config.valor.length > 0) {
    return config.valor as EtapaRoteiroSocietario[]
  }
  return ROTEIRO_SOCIETARIO_PADRAO
}
