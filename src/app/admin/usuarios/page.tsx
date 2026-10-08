'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PAPEIS, PIN_VALIDO } from '@/lib/usuario'

type Perfil = { user_id: string; nome: string; papel: string; ativo: boolean }

const api = async (method: 'POST' | 'PATCH', corpo: object) => {
  const r = await fetch('/api/admin/usuarios', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erro ?? 'Falha')
}

export default function Usuarios() {
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [nome, setNome] = useState('')
  const [pin, setPin] = useState('')
  const [papel, setPapel] = useState<string>('motorista')
  const [msg, setMsg] = useState('')

  const carregar = () => createClient().from('va_perfis').select('user_id, nome, papel, ativo').order('nome').then(({ data }) => setPerfis(data ?? []))
  useEffect(() => { carregar() }, [])

  const rodar = async (f: () => Promise<void>, ok: string) => {
    setMsg('')
    try { await f(); setMsg(ok); carregar() } catch (e) { setMsg('Erro: ' + (e as Error).message) }
  }

  function criar() {
    if (!nome.trim() || !PIN_VALIDO.test(pin)) return setMsg('Erro: informe o nome e um PIN de 6 dígitos')
    rodar(() => api('POST', { nome, pin, papel }), `${nome} criado`).then(() => { setNome(''); setPin('') })
  }

  function trocarPin(p: Perfil) {
    const novo = prompt(`Novo PIN de 6 dígitos para ${p.nome}:`)
    if (novo == null) return
    if (!PIN_VALIDO.test(novo)) return setMsg('Erro: o PIN deve ter 6 dígitos')
    rodar(() => api('PATCH', { user_id: p.user_id, pin: novo }), `PIN de ${p.nome} alterado`)
  }

  return (
    <div className="space-y-6">
      <section className="cartao flex flex-wrap items-end gap-3">
        <label className="text-sm">Nome<br /><input className="campo py-2 text-base" value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label className="text-sm">PIN (6 dígitos)<br /><input className="campo py-2 text-base" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} /></label>
        <label className="text-sm">Perfil<br />
          <select className="campo py-2 text-base" value={papel} onChange={(e) => setPapel(e.target.value)}>
            {PAPEIS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <button className="btn py-2" onClick={criar}>Criar usuário</button>
      </section>
      {msg && <p className={`rounded p-2 ${msg.startsWith('Erro') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{msg}</p>}
      <table className="tabela">
        <thead><tr><th>Nome</th><th>Perfil</th><th>Ativo</th><th /></tr></thead>
        <tbody>
          {perfis.map((p) => (
            <tr key={p.user_id} className={p.ativo ? '' : 'text-gray-400'}>
              <td>{p.nome}</td>
              <td>
                <select value={p.papel} onChange={(e) => rodar(() => api('PATCH', { user_id: p.user_id, papel: e.target.value }), 'Perfil alterado')}>
                  {PAPEIS.map((x) => <option key={x}>{x}</option>)}
                </select>
              </td>
              <td><input type="checkbox" checked={p.ativo} onChange={(e) => rodar(() => api('PATCH', { user_id: p.user_id, ativo: e.target.checked }), 'Alterado')} /></td>
              <td><button className="underline" onClick={() => trocarPin(p)}>Trocar PIN</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500">O usuário entra com o nome exatamente como cadastrado (maiúsculas e acentos não importam). Usuário desativado não consegue entrar nem enviar.</p>
    </div>
  )
}
