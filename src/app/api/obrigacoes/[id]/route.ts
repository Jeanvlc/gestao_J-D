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

    const obrigacao = await prisma.obrigacao.findFirst({
      where: { id: params.id, userId },
    })

    if (!obrigacao) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    return NextResponse.json(obrigacao)
  } catch (error) {
    console.error('Erro ao buscar obrigação:', error)
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

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const obrigacao = await prisma.obrigacao.findFirst({
      where: { id: params.id, userId },
    })

    if (!obrigacao) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const atualizada = await prisma.obrigacao.update({
      where: { id: params.id },
      data: {
        ...data,
        ...(data.vencimento && { vencimento: new Date(data.vencimento) }),
        ...(data.dataAtendimento && { dataAtendimento: new Date(data.dataAtendimento) }),
      },
    })

    if (data.status === 'concluida' && obrigacao.status !== 'concluida' && atualizada.modeloId && atualizada.clienteId) {
      try {
        const { competenciaAtual, dataVencimento } = await import('@/lib/obrigacoesEngine')
        const modelo = await prisma.modeloObrigacao.findFirst({
          where: { id: atualizada.modeloId, userId },
        })

        if (modelo?.proximoModeloId) {
          const proximoModelo = await prisma.modeloObrigacao.findFirst({
            where: { id: modelo.proximoModeloId, userId },
          })

          if (proximoModelo) {
            const competencia = competenciaAtual()
            await prisma.obrigacao.create({
              data: {
                titulo: proximoModelo.titulo,
                descricao: proximoModelo.descricao,
                vencimento: dataVencimento(competencia, proximoModelo.diaVencimento),
                periodicidade: proximoModelo.periodicidade,
                prioridade: proximoModelo.prioridade,
                cliente: atualizada.cliente,
                tags: proximoModelo.tags,
                clienteId: atualizada.clienteId,
                modeloId: proximoModelo.id,
                competencia,
                userId,
              },
            })
          }
        }
      } catch (err) {
        console.error('Erro ao gerar obrigação sucessora:', err)
      }
    }

    return NextResponse.json(atualizada)
  } catch (error) {
    console.error('Erro ao atualizar obrigação:', error)
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

    const obrigacao = await prisma.obrigacao.findFirst({
      where: { id: params.id, userId },
    })

    if (!obrigacao) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    await prisma.obrigacao.delete({ where: { id: params.id } })

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error('Erro ao deletar obrigação:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
