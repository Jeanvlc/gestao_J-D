export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'

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
  const userId = request.headers.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json([], { status: 200 })
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
    console.error('Erro ao buscar obrigacoes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const data = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
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

export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const { id, ...data } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

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

export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const { id } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

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