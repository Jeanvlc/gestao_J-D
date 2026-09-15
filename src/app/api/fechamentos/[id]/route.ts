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

export async function GET(
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

    const fechamento = await prisma.fechamentoMensal.findFirst({
      where: { id: params.id, userId },
      include: { cliente: { select: { id: true, nome: true } } },
    })

    if (!fechamento) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const obrigacoes = await prisma.obrigacao.findMany({
      where: { userId, clienteId: fechamento.clienteId, competencia: fechamento.competencia },
      select: { id: true, titulo: true, status: true, vencimento: true },
      orderBy: { vencimento: 'asc' },
    })

    return NextResponse.json({ ...fechamento, obrigacoes })
  } catch (error) {
    console.error('Erro ao buscar fechamento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Atualiza o checklist (marca/desmarca itens). Não fecha a competência.
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

  if (!Array.isArray(data.itens)) {
    return NextResponse.json({ error: 'itens é obrigatório' }, { status: 400 })
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

    if (fechamento.status !== 'aberto') {
      return NextResponse.json({ error: 'Reabra a competência antes de editar o checklist' }, { status: 409 })
    }

    const atualizado = await prisma.fechamentoMensal.update({
      where: { id: params.id },
      data: { itens: data.itens },
    })

    return NextResponse.json(atualizado)
  } catch (error) {
    console.error('Erro ao atualizar checklist:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
