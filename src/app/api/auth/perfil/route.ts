// src/app/api/auth/perfil/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUsuarioAtual } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const usuario = await getUsuarioAtual()
  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { nome } = await request.json()

  const perfil = await prisma.user.upsert({
    where: { id: usuario.id },
    update: {},
    create: {
      id: usuario.id,
      email: usuario.email!,
      nome: nome || usuario.email!,
      senha: 'gerenciado-pelo-supabase-auth',
    },
  })

  return NextResponse.json(perfil)
}
