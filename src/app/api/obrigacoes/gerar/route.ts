export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioAtual } from '@/lib/auth'
import { competenciaAtual, dataVencimento, modeloAplicavel, competenciaAntesDoClienteDesde } from '@/lib/obrigacoesEngine'

async function conectarBanco() {
  try {
    const { prisma } = await import('@/lib/db')
    return prisma
  } catch (error) {
    console.error('Erro ao conectar:', error)
    return null
  }
}

// Gera 1 Obrigacao por Cliente ativo x ModeloObrigacao ativo aplicável
// (regime/estado/cidade/funcionários/ICMS/retenções do modelo batendo com o cliente),
// para a competência informada.
export async function POST(request: NextRequest) {
  const usuario = await getUsuarioAtual()
  const userId = usuario?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let competencias = [competenciaAtual()]
  try {
    const body = await request.json().catch(() => ({}))
    if (Array.isArray(body?.competencias) && body.competencias.length > 0) {
      competencias = body.competencias.filter((c: unknown) => typeof c === 'string' && /^\d{4}-\d{2}$/.test(c))
    } else if (body?.competencia && /^\d{4}-\d{2}$/.test(body.competencia)) {
      competencias = [body.competencia]
    }
  } catch {
    // sem body, usa competência atual
  }

  if (competencias.length === 0) {
    return NextResponse.json({ error: 'Nenhuma competência válida informada' }, { status: 400 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const [clientes, modelos] = await Promise.all([
      prisma.cliente.findMany({ where: { userId, ativo: true } }),
      prisma.modeloObrigacao.findMany({ where: { userId, ativo: true } }),
    ])

    const paraCriar: {
      titulo: string
      descricao: string | null
      vencimento: Date
      dataEnvioCliente: Date | null
      periodicidade: string
      prioridade: string
      cliente: string
      tags: string[]
      clienteId: string
      modeloId: string
      competencia: string
      userId: string
    }[] = []

    for (const competencia of competencias) {
      for (const cliente of clientes) {
        if (competenciaAntesDoClienteDesde(competencia, cliente.clienteDesde)) continue
        for (const modelo of modelos) {
          if (!modeloAplicavel(modelo, cliente)) continue

          paraCriar.push({
            titulo: modelo.titulo,
            descricao: modelo.descricao,
            vencimento: dataVencimento(competencia, modelo.diaVencimento),
            dataEnvioCliente: modelo.diaEnvioCliente ? dataVencimento(competencia, modelo.diaEnvioCliente) : null,
            periodicidade: modelo.periodicidade,
            prioridade: modelo.prioridade,
            cliente: cliente.razaoSocial || cliente.nome,
            tags: modelo.tags,
            clienteId: cliente.id,
            modeloId: modelo.id,
            competencia,
            userId,
          })
        }
      }
    }

    if (paraCriar.length === 0) {
      return NextResponse.json({ criadas: 0, competencias })
    }

    // O índice único [modeloId, clienteId, competencia] garante que nenhuma
    // obrigação seja duplicada, mesmo gerando a mesma competência mais de uma vez.
    const resultado = await prisma.obrigacao.createMany({
      data: paraCriar,
      skipDuplicates: true,
    })

    return NextResponse.json({ criadas: resultado.count, competencias })
  } catch (error) {
    console.error('Erro ao gerar obrigações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
