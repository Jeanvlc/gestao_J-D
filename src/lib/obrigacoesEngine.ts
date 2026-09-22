// Motor de regras: decide quais ModeloObrigacao se aplicam a um Cliente
// e gera/recalcula as Obrigacao correspondentes.

type ClienteCriterios = {
  regimeTributario: string
  cidade: string | null
  estado: string | null
  possuiFuncionarios: boolean
  possuiIcms: boolean
  possuiRetencoes: boolean
}

type ModeloCriterios = {
  regimesTributarios: string[]
  cidade: string | null
  estado: string | null
  requerFuncionarios: boolean | null
  requerIcms: boolean | null
  requerRetencoes: boolean | null
}

export function modeloAplicavel(modelo: ModeloCriterios, cliente: ClienteCriterios): boolean {
  const regimeBate = !modelo.regimesTributarios || modelo.regimesTributarios.length === 0 || modelo.regimesTributarios.includes(cliente.regimeTributario)
  const estadoBate = !modelo.estado || modelo.estado === cliente.estado
  const cidadeBate = !modelo.cidade || modelo.cidade === cliente.cidade
  const funcionariosBate = modelo.requerFuncionarios === null || modelo.requerFuncionarios === undefined || modelo.requerFuncionarios === cliente.possuiFuncionarios
  const icmsBate = modelo.requerIcms === null || modelo.requerIcms === undefined || modelo.requerIcms === cliente.possuiIcms
  const retencoesBate = modelo.requerRetencoes === null || modelo.requerRetencoes === undefined || modelo.requerRetencoes === cliente.possuiRetencoes

  return regimeBate && estadoBate && cidadeBate && funcionariosBate && icmsBate && retencoesBate
}

export function competenciaAtual(): string {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}`
}

export function dataVencimento(competencia: string, diaVencimento: number): Date {
  const [anoStr, mesStr] = competencia.split('-')
  const ano = Number(anoStr)
  const mes = Number(mesStr) // 1-12
  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate()
  const dia = Math.min(diaVencimento, ultimoDiaDoMes)
  return new Date(ano, mes - 1, dia)
}

// Compara a competência (YYYY-MM) com a data em que o cliente passou a ser atendido
// pelo escritório: se a competência for anterior a esse mês, não deve gerar obrigação.
export function competenciaAntesDoClienteDesde(competencia: string, clienteDesde: Date | null): boolean {
  if (!clienteDesde) return false
  const [anoStr, mesStr] = competencia.split('-')
  const competenciaData = new Date(Number(anoStr), Number(mesStr) - 1, 1)
  const desdeData = new Date(clienteDesde.getFullYear(), clienteDesde.getMonth(), 1)
  return competenciaData < desdeData
}

// Recalcula as obrigações auto-geradas (por modelo) de UM cliente para a competência atual:
// - remove as que ainda estão pendentes e cujo modelo não se aplica mais (ex: mudou de regime)
// - cria as que passaram a se aplicar e ainda não existem para essa competência
// Nunca mexe em obrigações já em andamento/concluídas, nem em obrigações manuais (sem modeloId).
export async function recalcularObrigacoesCliente(prisma: any, userId: string, clienteId: string) {
  const competencia = competenciaAtual()

  const [cliente, modelos] = await Promise.all([
    prisma.cliente.findFirst({ where: { id: clienteId, userId } }),
    prisma.modeloObrigacao.findMany({ where: { userId, ativo: true } }),
  ])

  if (!cliente || !cliente.ativo) {
    return { removidas: 0, criadas: 0, competencia }
  }

  if (competenciaAntesDoClienteDesde(competencia, cliente.clienteDesde)) {
    return { removidas: 0, criadas: 0, competencia }
  }

  const modelosAplicaveis = modelos.filter((modelo: ModeloCriterios) => modeloAplicavel(modelo, cliente))
  const idsAplicaveis = new Set(modelosAplicaveis.map((m: { id: string }) => m.id))

  const geradasAtuais = await prisma.obrigacao.findMany({
    where: {
      userId,
      clienteId,
      competencia,
      status: 'pendente',
      modeloId: { not: null },
    },
  })

  const idsParaRemover = geradasAtuais
    .filter((o: { modeloId: string | null }) => o.modeloId && !idsAplicaveis.has(o.modeloId))
    .map((o: { id: string }) => o.id)

  if (idsParaRemover.length > 0) {
    await prisma.obrigacao.deleteMany({ where: { id: { in: idsParaRemover } } })
  }

  const idsJaExistentes = new Set(
    geradasAtuais
      .filter((o: { modeloId: string | null }) => o.modeloId)
      .map((o: { modeloId: string }) => o.modeloId)
  )

  const paraCriar = modelosAplicaveis
    .filter((modelo: { id: string }) => !idsJaExistentes.has(modelo.id))
    .map((modelo: any) => ({
      titulo: modelo.titulo,
      descricao: modelo.descricao,
      vencimento: dataVencimento(competencia, modelo.diaVencimento),
      periodicidade: modelo.periodicidade,
      prioridade: modelo.prioridade,
      cliente: cliente.nome,
      tags: modelo.tags,
      clienteId: cliente.id,
      modeloId: modelo.id,
      competencia,
      userId,
    }))

  let criadas = 0
  if (paraCriar.length > 0) {
    const resultado = await prisma.obrigacao.createMany({ data: paraCriar, skipDuplicates: true })
    criadas = resultado.count
  }

  return { removidas: idsParaRemover.length, criadas, competencia }
}
