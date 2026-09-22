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

    const honorarios = await prisma.honorario.findMany({
      where: { userId },
      include: { cliente: { select: { id: true, nome: true, razaoSocial: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(honorarios)
  } catch (error) {
    console.error('Erro ao buscar honorários:', error)
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

  const valor = Number(data.valor)
  const diaVencimento = Number(data.diaVencimento)

  if (!data.clienteId || !valor || valor <= 0 || !diaVencimento || diaVencimento < 1 || diaVencimento > 31) {
    return NextResponse.json({ error: 'Cliente, valor e dia de vencimento válidos são obrigatórios' }, { status: 400 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const cliente = await prisma.cliente.findFirst({ where: { id: data.clienteId, userId } })
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const honorario = await prisma.honorario.create({
      data: {
        clienteId: data.clienteId,
        descricao: data.descricao || null,
        valor,
        diaVencimento,
        ativo: data.ativo ?? true,
        userId,
      },
    })

    return NextResponse.json(honorario, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar honorário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
