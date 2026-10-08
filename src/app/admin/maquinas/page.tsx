'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Crud, type Campo } from '../crud'

const TANQUES: Campo[] = [
  { k: 'nome', rotulo: 'Nome' }, { k: 'saldo_inicial', rotulo: 'Saldo inicial (L)', tipo: 'num' },
  { k: 'data_saldo_inicial', rotulo: 'Data do saldo inicial', tipo: 'datahora' },
]

export default function Cadastros() {
  const [centros, setCentros] = useState<{ valor: string; rotulo: string }[] | null>(null)
  useEffect(() => {
    createClient().from('va_centros_custo').select('id, nome').order('nome')
      .then(({ data }) => setCentros((data ?? []).map((c) => ({ valor: c.id, rotulo: c.nome }))))
  }, [])
  if (!centros) return null

  const maquinas: Campo[] = [
    { k: 'codigo', rotulo: 'Prefixo' }, { k: 'nome', rotulo: 'Nome da máquina' },
    { k: 'centro_custo_id', rotulo: 'Centro de custo', tipo: 'opcao', opcoes: centros },
  ]
  return (
    <div className="space-y-6">
      <Crud titulo="Máquinas" item="máquina" tabela="va_maquinas" campos={maquinas} ordem="codigo" />
      <Crud titulo="Comboios (tanques)" item="comboio" tabela="va_tanques" campos={TANQUES} ordem="nome" />
    </div>
  )
}
