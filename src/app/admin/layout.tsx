import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MenuAdmin } from './menu'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { data: perfil } = user
    ? await sb.from('va_perfis').select('papel, ativo').eq('user_id', user.id).maybeSingle()
    : { data: null }
  if (perfil?.papel !== 'admin' || !perfil.ativo) redirect('/')

  return (
    <div className="min-h-screen">
      <header className="bg-mata text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-display text-xl font-bold">V. A. Ribas</span>
          <MenuAdmin />
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  )
}
