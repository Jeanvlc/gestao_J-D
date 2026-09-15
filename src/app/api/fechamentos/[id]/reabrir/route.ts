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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const usuario = await getUsuarioAtual()
  const userId = usuario?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const fechamento = await prisma.fechamentoMensal.findFirst({ where: { id: params.id, userId } })
    if (!fechamento) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const atualizado = await prisma.fechamentoMensal.update({
      where: { id: params.id },
      data: {
        status: 'aberto',
        justificativa: null,
        autorizadoPor: null,
        fechadoEm: null,
      },
    })

    return NextResponse.json(atualizado)
  } catch (error) {
    console.error('Erro ao reabrir competência:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
