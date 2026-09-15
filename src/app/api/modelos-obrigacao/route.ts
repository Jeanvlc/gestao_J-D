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

    const modelos = await prisma.modeloObrigacao.findMany({
      where: { userId },
      orderBy: { titulo: 'asc' },
    })

    return NextResponse.json(modelos)
  } catch (error) {
    console.error('Erro ao buscar modelos:', error)
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

  if (!data.titulo || !data.diaVencimento) {
    return NextResponse.json({ error: 'Título e dia de vencimento são obrigatórios' }, { status: 400 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const modelo = await prisma.modeloObrigacao.create({
      data: {
        titulo: data.titulo,
        descricao: data.descricao || null,
        tags: data.tags || [],
        diaVencimento: Number(data.diaVencimento),
        periodicidade: data.periodicidade || 'mensal',
        prioridade: data.prioridade || 'normal',
        regimeTributario: data.regimeTributario || null,
        estado: data.estado || null,
        cidade: data.cidade || null,
        requerFuncionarios: data.requerFuncionarios ?? null,
        requerIcms: data.requerIcms ?? null,
        requerRetencoes: data.requerRetencoes ?? null,
        ativo: data.ativo ?? true,
        userId,
      },
    })

    return NextResponse.json(modelo, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar modelo:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
