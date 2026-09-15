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

    const honorario = await prisma.honorario.findFirst({
      where: { id: params.id, userId },
      include: {
        cliente: { select: { id: true, nome: true } },
        pagamentos: { orderBy: { competencia: 'desc' } },
      },
    })

    if (!honorario) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    return NextResponse.json(honorario)
  } catch (error) {
    console.error('Erro ao buscar honorário:', error)
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

  const valor = Number(data.valor)
  const diaVencimento = Number(data.diaVencimento)

  if (!valor || valor <= 0 || !diaVencimento || diaVencimento < 1 || diaVencimento > 31) {
    return NextResponse.json({ error: 'Valor e dia de vencimento válidos são obrigatórios' }, { status: 400 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const honorario = await prisma.honorario.findFirst({ where: { id: params.id, userId } })
    if (!honorario) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const atualizado = await prisma.honorario.update({
      where: { id: params.id },
      data: {
        descricao: data.descricao || null,
        valor,
        diaVencimento,
        ativo: data.ativo ?? true,
      },
    })

    return NextResponse.json(atualizado)
  } catch (error) {
    console.error('Erro ao atualizar honorário:', error)
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

    const honorario = await prisma.honorario.findFirst({ where: { id: params.id, userId } })
    if (!honorario) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    await prisma.honorario.delete({ where: { id: params.id } })

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error('Erro ao deletar honorário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
