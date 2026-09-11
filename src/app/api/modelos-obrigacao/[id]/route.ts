export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'

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
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const modelo = await prisma.modeloObrigacao.findFirst({
      where: { id: params.id, userId },
    })

    if (!modelo) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    return NextResponse.json(modelo)
  } catch (error) {
    console.error('Erro ao buscar modelo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const modelo = await prisma.modeloObrigacao.findFirst({
      where: { id: params.id, userId },
    })

    if (!modelo) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const atualizado = await prisma.modeloObrigacao.update({
      where: { id: params.id },
      data: {
        titulo: data.titulo,
        descricao: data.descricao || null,
        tags: data.tags || [],
        diaVencimento: Number(data.diaVencimento),
        periodicidade: data.periodicidade || 'mensal',
        prioridade: data.prioridade || 'normal',
        regimeTributario: data.regimeTributario || null,
        cidade: data.cidade || null,
        ativo: data.ativo ?? true,
      },
    })

    return NextResponse.json(atualizado)
  } catch (error) {
    console.error('Erro ao atualizar modelo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const modelo = await prisma.modeloObrigacao.findFirst({
      where: { id: params.id, userId },
    })

    if (!modelo) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    await prisma.modeloObrigacao.delete({ where: { id: params.id } })

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error('Erro ao deletar modelo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
