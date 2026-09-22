'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileCog,
  Wallet,
  Landmark,
  ListChecks,
  Settings,
  Plus,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const ITENS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/modelos-obrigacao', label: 'Modelos de Obrigação', icon: FileCog },
  { href: '/tarefas', label: 'Tarefas', icon: ListChecks },
  { href: '/honorarios', label: 'Honorários', icon: Wallet },
  { href: '/financeiro', label: 'Financeiro do Escritório', icon: Landmark },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const sair = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-green-100 min-h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-green-100">
        <p className="text-green-700 font-bold text-lg">MacContab</p>
        <p className="text-slate-400 text-xs">Gestão Contábil</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {ITENS.map(item => {
          const ativo = pathname === item.href || pathname?.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition ${
                ativo
                  ? 'bg-green-600 text-white'
                  : 'text-slate-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}

        <Link
          href="/obrigacoes/novo"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition text-slate-600 hover:bg-green-50 hover:text-green-700 mt-4 border border-dashed border-green-200"
        >
          <Plus className="w-5 h-5" />
          Nova Obrigação
        </Link>
      </nav>

      <div className="px-3 py-4 border-t border-green-100">
        <button
          onClick={sair}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition text-slate-600 hover:bg-green-50 hover:text-green-700"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  )
}
