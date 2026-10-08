import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { emailDoNome, PAPEIS, PIN_VALIDO } from '@/lib/usuario'

const falha = (erro: string, status = 400) => NextResponse.json({ erro }, { status })

async function souAdmin() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return false
  const { data } = await sb.from('va_perfis').select('papel, ativo').eq('user_id', user.id).maybeSingle()
  return data?.papel === 'admin' && data.ativo
}

// chave secreta: só no servidor, nunca vai para o navegador
const admin = () => createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })

export async function POST(req: Request) {
  if (!(await souAdmin())) return falha('Sem permissão', 403)
  const { nome, pin, papel } = await req.json()
  if (typeof nome !== 'string' || !nome.trim() || !PIN_VALIDO.test(pin) || !PAPEIS.includes(papel)) return falha('Dados inválidos')

  const a = admin()
  const { data, error } = await a.auth.admin.createUser({ email: emailDoNome(nome), password: pin, email_confirm: true })
  if (error) return falha(/already/i.test(error.message) ? 'Já existe um usuário com esse nome' : error.message)
  const { error: e2 } = await a.from('va_perfis').insert({ user_id: data.user.id, nome: nome.trim(), papel })
  if (e2) {
    await a.auth.admin.deleteUser(data.user.id)
    return falha(e2.code === '23505' ? 'Já existe um usuário com esse nome' : e2.message)
  }
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  if (!(await souAdmin())) return falha('Sem permissão', 403)
  const { user_id, pin, papel, ativo, tanque_id } = await req.json()
  if (typeof user_id !== 'string') return falha('Dados inválidos')
  const a = admin()
  if (pin !== undefined) {
    if (!PIN_VALIDO.test(pin)) return falha('PIN deve ter 6 dígitos')
    const { error } = await a.auth.admin.updateUserById(user_id, { password: pin })
    if (error) return falha(error.message)
  }
  const mudancas: Record<string, unknown> = {}
  if (papel !== undefined) { if (!PAPEIS.includes(papel)) return falha('Perfil inválido'); mudancas.papel = papel }
  if (ativo !== undefined) mudancas.ativo = !!ativo
  if (tanque_id !== undefined) mudancas.tanque_id = tanque_id || null
  if (Object.keys(mudancas).length) {
    const { error } = await a.from('va_perfis').update(mudancas).eq('user_id', user_id)
    if (error) return falha(error.message)
  }
  return NextResponse.json({ ok: true })
}
