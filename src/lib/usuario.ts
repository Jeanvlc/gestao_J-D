/** Login por nome: "José da Silva" → jose.da.silva@va-ribas.local (e-mail interno, nunca recebe mensagem) */
export const emailDoNome = (nome: string) =>
  nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') + '@va-ribas.local'

export const PIN_VALIDO = /^\d{6}$/
export const PAPEIS = ['motorista', 'operador', 'admin'] as const
