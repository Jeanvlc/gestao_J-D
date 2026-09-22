export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioAtual } from '@/lib/auth'
import { obterTemplateChecklistTarefa, obterRoteiroSocietario } from '@/lib/configuracoes'
import { randomUUID } from 'crypto'

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

    const clienteId = request.nextUrl.searchParams.get('clienteId')
    const grupoSocietarioId = request.nextUrl.searchParams.get('grupoSocietarioId')

    const tarefas = await prisma.tarefa.findMany({
      where: {
        userId,
        ...(clienteId ? { clienteId } : {}),
        ...(grupoSocietarioId ? { grupoSocietarioId } : {}),
      },
      orderBy: [{ status: 'asc' }, { dataVencimento: 'asc' }],
      include: { clienteRef: { select: { id: true, nome: true } } },
    })

    return NextResponse.json(tarefas)
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error)
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

  if (!data.titulo) {
    return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
  }

  if (data.tipo === 'societaria' && !data.clienteId) {
    return NextResponse.json({ error: 'Abertura de empresa exige um cliente vinculado' }, { status: 400 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const template = await obterTemplateChecklistTarefa(prisma, userId)
    const checklist = template.map(item => ({ ...item, concluido: false }))

    if (data.tipo === 'societaria') {
      const roteiro = await obterRoteiroSocietario(prisma, userId)
      const etapaChave = data.etapaChave || roteiro[0]?.chave
      const etapa = roteiro.find(e => e.chave === etapaChave) || roteiro[0]

      if (!etapa) {
        return NextResponse.json({ error: 'Nenhuma etapa configurada no roteiro societário' }, { status: 400 })
      }

      const grupoSocietarioId = data.grupoSocietarioId || randomUUID()

      const tarefa = await prisma.tarefa.create({
        data: {
          titulo: data.titulo || etapa.label,
          descricao: data.descricao || null,
          dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
          status: data.status || 'pendente',
          prioridade: data.prioridade || 'normal',
          categoria: data.categoria || null,
          checklist: JSON.parse(JSON.stringify(checklist)),
          tipo: 'societaria',
          etapaChave: etapa.chave,
          grupoSocietarioId,
          clienteId: data.clienteId,
          userId,
        },
      })

      return NextResponse.json(tarefa, { status: 201 })
    }

    const tarefa = await prisma.tarefa.create({
      data: {
        titulo: data.titulo,
        descricao: data.descricao || null,
        dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
        status: data.status || 'pendente',
        prioridade: data.prioridade || 'normal',
        categoria: data.categoria || null,
        checklist: JSON.parse(JSON.stringify(checklist)),
        clienteId: data.clienteId || null,
        userId,
      },
    })

    return NextResponse.json(tarefa, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar tarefa:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
