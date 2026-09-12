export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioAtual } from '@/lib/auth'

// Função auxiliar para conectar
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

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json([], { status: 200 })
    }

    const processos = await prisma.processo.findMany({
      where: { userId },
      include: {
        etapas: {
          orderBy: { ordem: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(processos)
  } catch (error) {
    console.error('Erro ao buscar processos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const processo = await prisma.processo.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        descricaoDetalhada: data.descricaoDetalhada,
        responsavel: data.responsavel,
        frequencia: data.frequencia,
        tempoMedio: data.tempoMedio,
        userId,
        etapas: {
          create: data.etapas?.map((e: any, idx: number) => ({
            titulo: e.titulo,
            descricao: e.descricao,
            ordem: idx + 1
          })) || []
        }
      },
      include: { etapas: { orderBy: { ordem: 'asc' } } }
    })

    return NextResponse.json(processo, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar processo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const usuario = await getUsuarioAtual()
  const userId = usuario?.id
  const { id, ...data } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const processo = await prisma.processo.findFirst({
      where: { id, userId }
    })

    if (!processo) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const atualizado = await prisma.processo.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao,
        descricaoDetalhada: data.descricaoDetalhada,
        responsavel: data.responsavel,
        frequencia: data.frequencia,
        tempoMedio: data.tempoMedio,
        status: data.status
      },
      include: { etapas: { orderBy: { ordem: 'asc' } } }
    })

    return NextResponse.json(atualizado)
  } catch (error) {
    console.error('Erro ao atualizar processo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const usuario = await getUsuarioAtual()
  const userId = usuario?.id
  const { id } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const processo = await prisma.processo.findFirst({
      where: { id, userId }
    })

    if (!processo) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    await prisma.processo.delete({ where: { id } })

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error('Erro ao deletar processo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}