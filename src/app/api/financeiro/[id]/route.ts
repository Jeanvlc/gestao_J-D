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

export async function DELETE(
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

    const lancamento = await prisma.lancamentoFinanceiro.findFirst({ where: { id: params.id, userId } })
    if (!lancamento) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    if (lancamento.origem === 'honorario') {
      return NextResponse.json(
        { error: 'Este lançamento veio de um pagamento de honorário. Desmarque o pagamento como pago para removê-lo.' },
        { status: 409 }
      )
    }

    await prisma.lancamentoFinanceiro.delete({ where: { id: params.id } })

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error('Erro ao deletar lançamento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
