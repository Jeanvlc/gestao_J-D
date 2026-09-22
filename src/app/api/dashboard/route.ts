export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioAtual } from '@/lib/auth'
import { competenciaAtual } from '@/lib/obrigacoesEngine'
import { nomeCliente } from '@/lib/clientes'

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
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const competencia = competenciaAtual()

    const [clientesAtivos, pagamentosMes, lancamentosMes, tarefas] = await Promise.all([
      prisma.cliente.findMany({
        where: { userId, ativo: true },
        select: { regimeTributario: true },
      }),
      prisma.pagamentoHonorario.findMany({
        where: { userId, competencia },
      }),
      prisma.lancamentoFinanceiro.findMany({
        where: { userId, competencia },
      }),
      prisma.tarefa.findMany({
        where: { userId, status: { not: 'concluida' } },
        include: { clienteRef: { select: { id: true, nome: true, razaoSocial: true } } },
        orderBy: { dataVencimento: 'asc' },
      }),
    ])

    const clientesPorRegime: Record<string, number> = {}
    for (const c of clientesAtivos) {
      clientesPorRegime[c.regimeTributario] = (clientesPorRegime[c.regimeTributario] || 0) + 1
    }

    const honorariosAReceber = pagamentosMes
      .filter(p => p.status !== 'pago')
      .reduce((soma, p) => soma + p.valor, 0)
    const honorariosRecebidos = pagamentosMes
      .filter(p => p.status === 'pago')
      .reduce((soma, p) => soma + p.valor, 0)

    const entradas = lancamentosMes
      .filter(l => l.tipo === 'entrada')
      .reduce((soma, l) => soma + l.valor, 0)
    const saidas = lancamentosMes
      .filter(l => l.tipo === 'saida')
      .reduce((soma, l) => soma + l.valor, 0)

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const tarefasAtrasadas = tarefas.filter(t => t.dataVencimento && new Date(t.dataVencimento) < hoje)
    const tarefasPendentes = tarefas.filter(t => t.status === 'pendente')

    const gruposSocietarios = new Map<string, { clienteNome: string | null; etapaAtual: string | null; tarefaId: string }>()
    for (const t of tarefas) {
      if (t.tipo === 'societaria' && t.grupoSocietarioId && !gruposSocietarios.has(t.grupoSocietarioId)) {
        gruposSocietarios.set(t.grupoSocietarioId, {
          clienteNome: t.clienteRef ? nomeCliente(t.clienteRef) : null,
          etapaAtual: t.titulo,
          tarefaId: t.id,
        })
      }
    }

    return NextResponse.json({
      competencia,
      clientesPorRegime,
      totalClientesAtivos: clientesAtivos.length,
      financeiro: {
        honorariosAReceber,
        honorariosRecebidos,
        entradas,
        saidas,
      },
      tarefas: {
        totalPendentes: tarefasPendentes.length,
        totalAtrasadas: tarefasAtrasadas.length,
        societariasEmAndamento: Array.from(gruposSocietarios.values()),
      },
    })
  } catch (error) {
    console.error('Erro ao montar dashboard:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
