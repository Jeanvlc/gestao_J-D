export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioAtual } from '@/lib/auth'
import { competenciaAtual, dataVencimento } from '@/lib/obrigacoesEngine'

async function conectarBanco() {
  try {
    const { prisma } = await import('@/lib/db')
    return prisma
  } catch (error) {
    console.error('Erro ao conectar:', error)
    return null
  }
}

// Gera 1 PagamentoHonorario por contrato de Honorario ativo, para a competência informada
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

    const honorarios = await prisma.honorario.findMany({
      where: { userId, ativo: true, cliente: { ativo: true } },
    })

    if (honorarios.length === 0) {
      return NextResponse.json({ criadas: 0, competencia })
    }

    const paraCriar = honorarios.map((h: { id: string; clienteId: string; valor: number; diaVencimento: number }) => ({
      honorarioId: h.id,
      clienteId: h.clienteId,
      competencia,
      valor: h.valor,
      vencimento: dataVencimento(competencia, h.diaVencimento),
      status: 'pendente',
      userId,
    }))

    const resultado = await prisma.pagamentoHonorario.createMany({
      data: paraCriar,
      skipDuplicates: true,
    })

    return NextResponse.json({ criadas: resultado.count, competencia })
  } catch (error) {
    console.error('Erro ao gerar cobranças de honorários:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
