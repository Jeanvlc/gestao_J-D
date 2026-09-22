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

    const tarefa = await prisma.tarefa.findFirst({
      where: { id: params.id, userId },
      include: { clienteRef: { select: { id: true, nome: true } } },
    })
    if (!tarefa) {
      return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
    }

    return NextResponse.json(tarefa)
  } catch (error) {
    console.error('Erro ao buscar tarefa:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
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

    const tarefa = await prisma.tarefa.findFirst({ where: { id: params.id, userId } })
    if (!tarefa) {
      return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
    }

    const atualizada = await prisma.tarefa.update({
      where: { id: params.id },
      data: {
        titulo: data.titulo ?? tarefa.titulo,
        descricao: data.descricao ?? tarefa.descricao,
        dataVencimento: data.dataVencimento !== undefined
          ? (data.dataVencimento ? new Date(data.dataVencimento) : null)
          : tarefa.dataVencimento,
        status: data.status ?? tarefa.status,
        prioridade: data.prioridade ?? tarefa.prioridade,
        categoria: data.categoria !== undefined ? data.categoria : tarefa.categoria,
        checklist: data.checklist !== undefined ? data.checklist : (tarefa.checklist as any),
        clienteId: data.clienteId !== undefined ? data.clienteId : tarefa.clienteId,
      },
      include: { clienteRef: { select: { id: true, nome: true } } },
    })

    return NextResponse.json(atualizada)
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error)
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

    const tarefa = await prisma.tarefa.findFirst({ where: { id: params.id, userId } })
    if (!tarefa) {
      return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
    }

    await prisma.tarefa.delete({ where: { id: params.id } })

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error('Erro ao deletar tarefa:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
