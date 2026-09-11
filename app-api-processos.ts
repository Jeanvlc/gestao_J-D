// src/app/api/processos/route.ts
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - Listar todos os processos do usuário
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

// POST - Criar novo processo
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const data = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

// PUT - Atualizar processo
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id, ...data } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

// DELETE - Deletar processo
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
