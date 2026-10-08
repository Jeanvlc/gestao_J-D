import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { data: perfil } = user
    ? await sb.from('va_perfis').select('papel, ativo').eq('user_id', user.id).maybeSingle()
    : { data: null }
  if (perfil?.papel !== 'admin' || !perfil.ativo) redirect('/')

  return (
    <div className="mx-auto max-w-6xl p-4">
      <nav className="mb-4 flex flex-wrap gap-4 border-b pb-3 font-medium">
        <span className="font-bold text-green-800">V. A. Ribas</span>
        <a href="/admin" className="underline">Painel</a>
        <a href="/admin/maquinas" className="underline">Máquinas e tanques</a>
        <a href="/admin/usuarios" className="underline">Usuários</a>
        <a href="/" className="underline">App do campo</a>
      </nav>
      {children}
    </div>
  )
}
