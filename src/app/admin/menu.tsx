'use client'
import { usePathname } from 'next/navigation'

const ITENS = [
  ['/admin', 'Painel'], ['/admin/lancamentos', 'Abastecimentos'], ['/admin/producao', 'Produção'], ['/admin/servicos', 'Serviços e talhões'], ['/admin/maquinas', 'Máquinas e comboios'], ['/admin/centros', 'Centros de custo'],
  ['/admin/usuarios', 'Usuários'], ['/', 'App do campo'],
] as const

export function MenuAdmin() {
  const atual = usePathname()
  return (
    <nav className="flex flex-wrap gap-1">
      {ITENS.map(([href, rotulo]) => (
        <a key={href} href={href} aria-current={atual === href ? 'page' : undefined}
          className={`rounded-lg px-3 py-1.5 font-semibold ${atual === href ? 'bg-white text-mata' : 'text-white/85 hover:bg-mata-escuro'}`}>
          {rotulo}
        </a>
      ))}
    </nav>
  )
}
