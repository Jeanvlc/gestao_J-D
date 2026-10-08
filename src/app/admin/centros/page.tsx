'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Crud } from '../crud'

type Item = { id: string; nome: string }

export default function Centros() {
  const sb = createClient()
  const [centros, setCentros] = useState<Item[]>([])
  const [tanques, setTanques] = useState<Item[]>([])
  const [vinculos, setVinculos] = useState<Set<string>>(new Set())
  const [erro, setErro] = useState('')

  const chave = (t: string, c: string) => `${t}|${c}`
  const carregar = async () => {
    const [c, t, v] = await Promise.all([
      sb.from('va_centros_custo').select('id, nome').eq('ativo', true).order('nome'),
      sb.from('va_tanques').select('id, nome').eq('ativo', true).order('nome'),
      sb.from('va_tanque_centros').select('tanque_id, centro_custo_id'),
    ])
    setCentros(c.data ?? []); setTanques(t.data ?? [])
    setVinculos(new Set((v.data ?? []).map((x) => chave(x.tanque_id, x.centro_custo_id))))
  }
  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function alternar(tanque_id: string, centro_custo_id: string) {
    setErro('')
    const tem = vinculos.has(chave(tanque_id, centro_custo_id))
    const { error } = tem
      ? await sb.from('va_tanque_centros').delete().eq('tanque_id', tanque_id).eq('centro_custo_id', centro_custo_id)
      : await sb.from('va_tanque_centros').insert({ tanque_id, centro_custo_id })
    if (error) return setErro(error.message)
    carregar()
  }

  return (
    <div className="space-y-6">
      <Crud titulo="Centros de custo" item="centro de custo" tabela="va_centros_custo" campos={[{ k: 'nome', rotulo: 'Nome' }]} ordem="nome" aoMudar={carregar} />

      <section className="cartao">
        <h2 className="font-display text-2xl font-bold text-mata-escuro">Quem abastece o quê</h2>
        <p className="mb-4 mt-1 text-tinta/65">
          Marque os centros de custo que cada comboio atende. O motorista só vê as máquinas desses centros.
          Comboio sem nenhum centro marcado vê todas as máquinas.
        </p>
        {erro && <p role="alert" className="mb-3 rounded-xl bg-alerta-claro px-4 py-2 text-alerta">{erro}</p>}
        {!centros.length || !tanques.length ? (
          <p className="text-tinta/55">Cadastre pelo menos um centro de custo e um comboio.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead><tr><th>Comboio</th>{centros.map((c) => <th key={c.id} className="text-center">{c.nome}</th>)}</tr></thead>
              <tbody>
                {tanques.map((t) => (
                  <tr key={t.id}>
                    <td className="font-semibold">{t.nome}</td>
                    {centros.map((c) => (
                      <td key={c.id} className="text-center">
                        <input type="checkbox" className="h-6 w-6 accent-[#1E4D3A]" aria-label={`${t.nome} atende ${c.nome}`}
                          checked={vinculos.has(chave(t.id, c.id))} onChange={() => alternar(t.id, c.id)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
