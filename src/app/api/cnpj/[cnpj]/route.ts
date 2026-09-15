export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioAtual } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { cnpj: string } }
) {
  const usuario = await getUsuarioAtual()
  if (!usuario?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cnpjLimpo = (params.cnpj || '').replace(/\D/g, '')
  if (cnpjLimpo.length !== 14) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 })
  }

  try {
    const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!resposta.ok) {
      return NextResponse.json({ error: 'CNPJ não encontrado' }, { status: 404 })
    }

    const dados = await resposta.json()

    const telefone = dados.ddd_telefone_1
      ? String(dados.ddd_telefone_1).replace(/\D/g, '')
      : ''

    return NextResponse.json({
      nome: dados.nome_fantasia || dados.razao_social || '',
      razaoSocial: dados.razao_social || '',
      nomeFantasia: dados.nome_fantasia || '',
      email: dados.email || '',
      telefone,
      cep: dados.cep ? String(dados.cep).replace(/\D/g, '') : '',
      logradouro: dados.logradouro || '',
      numero: dados.numero || '',
      complemento: dados.complemento || '',
      bairro: dados.bairro || '',
      cidade: dados.municipio || '',
      estado: dados.uf || '',
      situacaoCadastral: dados.descricao_situacao_cadastral || '',
      atividadePrincipal: dados.cnae_fiscal_descricao || '',
      dataAbertura: dados.data_inicio_atividade || '',
    })
  } catch (error) {
    console.error('Erro ao buscar CNPJ:', error)
    return NextResponse.json({ error: 'Não foi possível consultar o CNPJ agora' }, { status: 502 })
  }
}
