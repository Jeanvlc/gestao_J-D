export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioAtual } from '@/lib/auth'
import { pendenciasCriticas, type ItemChecklist } from '@/lib/checklistFechamento'

async function conectarBanco() {
  try {
    const { prisma } = await import('@/lib/db')
    return prisma
  } catch (error) {
    console.error('Erro ao conectar:', error)
    return null
  }
}

// Fecha a competência. Se houver pendência crítica, exige justificativa + autorizadoPor.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const usuario = await getUsuarioAtual()
  const userId = usuario?.id
  const data = await request.json().catch(() => ({}))

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const fechamento = await prisma.fechamentoMensal.findFirst({ where: { id: params.id, userId } })
    if (!fechamento) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const itens = fechamento.itens as unknown as ItemChecklist[]
    const pendencias = pendenciasCriticas(itens)

    const justificativa = (data.justificativa || '').trim()
    const autorizadoPor = (data.autorizadoPor || '').trim()

    if (pendencias.length > 0 && (!justificativa || !autorizadoPor)) {
      return NextResponse.json(
        {
          error: 'Existem pendências críticas. Informe justificativa e quem autoriza para fechar mesmo assim.',
          pendencias: pendencias.map(p => p.label),
        },
        { status: 409 }
      )
    }

    const atualizado = await prisma.fechamentoMensal.update({
      where: { id: params.id },
      data: {
        status: pendencias.length > 0 ? 'concluido_com_pendencia' : 'concluido',
        justificativa: pendencias.length > 0 ? justificativa : null,
        autorizadoPor: pendencias.length > 0 ? autorizadoPor : null,
        fechadoEm: new Date(),
      },
    })

    return NextResponse.json(atualizado)
  } catch (error) {
    console.error('Erro ao fechar competência:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
