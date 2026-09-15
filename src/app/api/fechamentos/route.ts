export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioAtual } from '@/lib/auth'
import { criarChecklistPadrao } from '@/lib/checklistFechamento'

async function conectarBanco() {
  try {
    const { prisma } = await import('@/lib/db')
    return prisma
  } catch (error) {
    console.error('Erro ao conectar:', error)
    return null
  }
}

function competenciaAtual() {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
}

// Lista o fechamento de cada cliente ativo para a competência informada,
// criando um checklist em branco para quem ainda não tem.
export async function GET(request: NextRequest) {
  const usuario = await getUsuarioAtual()
  const userId = usuario?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const competencia = searchParams.get('competencia') || competenciaAtual()

  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    return NextResponse.json({ error: 'Competência inválida' }, { status: 400 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json([], { status: 200 })
    }

    const clientes = await prisma.cliente.findMany({
      where: { userId, ativo: true },
      orderBy: { nome: 'asc' },
    })

    const existentes = await prisma.fechamentoMensal.findMany({
      where: { userId, competencia, clienteId: { in: clientes.map((c: { id: string }) => c.id) } },
    })
    const porCliente = new Map(existentes.map((f: { clienteId: string }) => [f.clienteId, f]))

    const faltantes = clientes.filter((c: { id: string }) => !porCliente.has(c.id))
    if (faltantes.length > 0) {
      await prisma.fechamentoMensal.createMany({
        data: faltantes.map((c: { id: string }) => ({
          clienteId: c.id,
          competencia,
          status: 'aberto',
          itens: JSON.parse(JSON.stringify(criarChecklistPadrao())),
          userId,
        })),
        skipDuplicates: true,
      })
    }

    const fechamentos = await prisma.fechamentoMensal.findMany({
      where: { userId, competencia },
      include: { cliente: { select: { id: true, nome: true } } },
      orderBy: { cliente: { nome: 'asc' } },
    })

    return NextResponse.json(fechamentos)
  } catch (error) {
    console.error('Erro ao buscar fechamentos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
