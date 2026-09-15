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

// Lista lançamentos a partir de uma competência inicial (mês/ano), até hoje.
export async function GET(request: NextRequest) {
  const usuario = await getUsuarioAtual()
  const userId = usuario?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const competenciaInicio = searchParams.get('competenciaInicio')

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json([], { status: 200 })
    }

    const lancamentos = await prisma.lancamentoFinanceiro.findMany({
      where: {
        userId,
        ...(competenciaInicio ? { competencia: { gte: competenciaInicio } } : {}),
      },
      include: { cliente: { select: { id: true, nome: true } } },
      orderBy: { data: 'asc' },
    })

    return NextResponse.json(lancamentos)
  } catch (error) {
    console.error('Erro ao buscar lançamentos financeiros:', error)
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

  if (!data.tipo || !['entrada', 'saida'].includes(data.tipo) || !data.categoria || !valor || valor <= 0 || !data.data) {
    return NextResponse.json({ error: 'tipo, categoria, valor e data são obrigatórios' }, { status: 400 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const data_ = new Date(data.data)
    const competencia = `${data_.getFullYear()}-${String(data_.getMonth() + 1).padStart(2, '0')}`

    const lancamento = await prisma.lancamentoFinanceiro.create({
      data: {
        tipo: data.tipo,
        categoria: data.categoria,
        descricao: data.descricao || null,
        valor,
        data: data_,
        competencia,
        origem: 'manual',
        clienteId: data.clienteId || null,
        userId,
      },
    })

    return NextResponse.json(lancamento, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar lançamento financeiro:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
