export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioAtual } from '@/lib/auth'

async function conectarBanco() {
  try {
    const { prisma } = await import('@/lib/db')
    return prisma
  } catch (error) {
    console.error('Erro ao conectar:', error)
    return null
  }
}

function competenciaAtual() {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}`
}

function dataVencimento(competencia: string, diaVencimento: number) {
  const [anoStr, mesStr] = competencia.split('-')
  const ano = Number(anoStr)
  const mes = Number(mesStr) // 1-12
  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate()
  const dia = Math.min(diaVencimento, ultimoDiaDoMes)
  return new Date(ano, mes - 1, dia)
}

// Gera 1 Obrigacao por Cliente ativo x ModeloObrigacao ativo aplicável
// (regime/cidade do modelo batendo com o cliente), para a competência informada.
export async function POST(request: NextRequest) {
  const usuario = await getUsuarioAtual()
  const userId = usuario?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let competencia = competenciaAtual()
  try {
    const body = await request.json().catch(() => ({}))
    if (body?.competencia && /^\d{4}-\d{2}$/.test(body.competencia)) {
      competencia = body.competencia
    }
  } catch {
    // sem body, usa competência atual
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
      periodicidade: string
      prioridade: string
      cliente: string
      tags: string[]
      clienteId: string
      modeloId: string
      competencia: string
      userId: string
    }[] = []

    for (const cliente of clientes) {
      for (const modelo of modelos) {
        const regimeBate = !modelo.regimeTributario || modelo.regimeTributario === cliente.regimeTributario
        const cidadeBate = !modelo.cidade || modelo.cidade === cliente.cidade

        if (!regimeBate || !cidadeBate) continue

        paraCriar.push({
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
        })
      }
    }

    if (paraCriar.length === 0) {
      return NextResponse.json({ criadas: 0, competencia })
    }

    const resultado = await prisma.obrigacao.createMany({
      data: paraCriar,
      skipDuplicates: true,
    })

    return NextResponse.json({ criadas: resultado.count, competencia })
  } catch (error) {
    console.error('Erro ao gerar obrigações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
