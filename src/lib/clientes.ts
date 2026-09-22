// Nome de exibição do cliente: prioriza razão social sobre nome fantasia.
export function nomeCliente(c: { nome: string; razaoSocial?: string | null } | null | undefined) {
  return c?.razaoSocial || c?.nome || ''
}
