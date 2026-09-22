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

export async function GET(request: NextRequest) {
  const usuario = await getUsuarioAtual()
  const userId = usuario?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const competencia = searchParams.get('competencia')
  const status = searchParams.get('status')

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json([], { status: 200 })
    }

    const pagamentos = await prisma.pagamentoHonorario.findMany({
      where: {
        userId,
        ...(competencia ? { competencia } : {}),
        ...(status ? { status } : {}),
      },
      include: { cliente: { select: { id: true, nome: true, razaoSocial: true } } },
      orderBy: { vencimento: 'asc' },
    })

    return NextResponse.json(pagamentos)
  } catch (error) {
    console.error('Erro ao buscar pagamentos de honorários:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
