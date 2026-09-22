export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioAtual } from '@/lib/auth'
import {
  obterTemplateChecklistFechamento,
  obterTemplateChecklistTarefa,
  obterRoteiroSocietario,
  CHAVE_CHECKLIST_FECHAMENTO,
  CHAVE_CHECKLIST_TAREFA,
  CHAVE_ROTEIRO_SOCIETARIO,
} from '@/lib/configuracoes'

async function conectarBanco() {
  try {
    const { prisma } = await import('@/lib/db')
    return prisma
  } catch (error) {
    console.error('Erro ao conectar:', error)
    return null
  }
}

const CHAVES_VALIDAS = [CHAVE_CHECKLIST_FECHAMENTO, CHAVE_CHECKLIST_TAREFA, CHAVE_ROTEIRO_SOCIETARIO]

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

    const [checklistFechamento, checklistTarefa, roteiroSocietario] = await Promise.all([
      obterTemplateChecklistFechamento(prisma, userId),
      obterTemplateChecklistTarefa(prisma, userId),
      obterRoteiroSocietario(prisma, userId),
    ])

    return NextResponse.json({ checklistFechamento, checklistTarefa, roteiroSocietario })
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Substitui o template salvo para uma chave (checklist_fechamento ou checklist_tarefa).
export async function PUT(request: NextRequest) {
  const usuario = await getUsuarioAtual()
  const userId = usuario?.id
  const data = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!CHAVES_VALIDAS.includes(data.chave) || !Array.isArray(data.valor)) {
    return NextResponse.json({ error: 'chave/valor inválidos' }, { status: 400 })
  }

  try {
    const prisma = await conectarBanco()
    if (!prisma) {
      return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
    }

    const config = await prisma.configuracao.upsert({
      where: { userId_chave: { userId, chave: data.chave } },
      update: { valor: data.valor },
      create: { userId, chave: data.chave, valor: data.valor },
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('Erro ao salvar configuração:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
