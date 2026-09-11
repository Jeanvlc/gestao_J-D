// src/app/api/obrigacoes/route.ts
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - Listar todas as obrigações do usuário
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const obrigacoes = await prisma.obrigacao.findMany({
      where: { userId },
      orderBy: [
        { status: 'asc' },
        { vencimento: 'asc' }
      ]
    })

    return NextResponse.json(obrigacoes)
  } catch (error) {
    console.error('Erro ao buscar obrigações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar nova obrigação
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const data = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const obrigacao = await prisma.obrigacao.create({
      data: {
        ...data,
        userId,
        vencimento: new Date(data.vencimento)
      }
    })

    return NextResponse.json(obrigacao, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar obrigação:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT - Atualizar obrigação
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id, ...data } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar se a obrigação pertence ao usuário
    const obrigacao = await prisma.obrigacao.findFirst({
      where: { id, userId }
    })

    if (!obrigacao) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const atualizada = await prisma.obrigacao.update({
      where: { id },
      data: {
        ...data,
        ...(data.vencimento && { vencimento: new Date(data.vencimento) })
      }
    })

    return NextResponse.json(atualizada)
  } catch (error) {
    console.error('Erro ao atualizar obrigação:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Deletar obrigação
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar se pertence ao usuário
    const obrigacao = await prisma.obrigacao.findFirst({
      where: { id, userId }
    })

    if (!obrigacao) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    await prisma.obrigacao.delete({ where: { id } })

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error('Erro ao deletar obrigação:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
