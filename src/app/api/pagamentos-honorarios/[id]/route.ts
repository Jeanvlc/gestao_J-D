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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const usuario = await getUsuarioAtual()
  const userId = usuario?.id
  const data = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const pagamento = await prisma.pagamentoHonorario.findFirst({ where: { id: params.id, userId } })
    if (!pagamento) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const status = data.status ?? pagamento.status
    const atualizado = await prisma.pagamentoHonorario.update({
      where: { id: params.id },
      data: {
        status,
        observacoes: data.observacoes ?? pagamento.observacoes,
        dataPagamento: status === 'pago'
          ? (data.dataPagamento ? new Date(data.dataPagamento) : new Date())
          : null,
      },
    })

    return NextResponse.json(atualizado)
  } catch (error) {
    console.error('Erro ao atualizar pagamento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
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

    const pagamento = await prisma.pagamentoHonorario.findFirst({ where: { id: params.id, userId } })
    if (!pagamento) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    await prisma.pagamentoHonorario.delete({ where: { id: params.id } })

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error('Erro ao deletar pagamento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
