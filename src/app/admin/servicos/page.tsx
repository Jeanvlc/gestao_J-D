'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Crud, type Campo } from '../crud'

export default function Servicos() {
  const [centros, setCentros] = useState<{ valor: string; rotulo: string }[] | null>(null)
  useEffect(() => {
    createClient().from('va_centros_custo').select('id, nome').order('nome')
      .then(({ data }) => setCentros((data ?? []).map((c) => ({ valor: c.id, rotulo: c.nome }))))
  }, [])
  if (!centros) return null
  const locais: Campo[] = [{ k: 'nome', rotulo: 'Talhão / local' }, { k: 'centro_custo_id', rotulo: 'Centro de custo', tipo: 'opcao', opcoes: centros }]
  return (
    <div className="space-y-6">
      <Crud titulo="Tipos de serviço" item="serviço" tabela="va_servicos" campos={[{ k: 'nome', rotulo: 'Serviço' }]} ordem="nome" />
      <Crud titulo="Talhões" item="talhão" tabela="va_locais" campos={locais} ordem="nome" />
      <Crud titulo="Motivos de parada" item="motivo" tabela="va_motivos_parada" campos={[{ k: 'nome', rotulo: 'Motivo' }]} ordem="nome" />
    </div>
  )
}
