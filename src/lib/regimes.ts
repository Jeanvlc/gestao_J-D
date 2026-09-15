export const REGIMES_TRIBUTARIOS = [
  { value: 'simples_nacional', label: 'Simples Nacional' },
  { value: 'lucro_presumido', label: 'Lucro Presumido' },
  { value: 'lucro_real', label: 'Lucro Real' },
  { value: 'mei', label: 'MEI' },
  { value: 'pessoa_fisica', label: 'Pessoa Física' },
  { value: 'produtor_rural', label: 'Produtor Rural' },
]

export const REGIME_LABELS: Record<string, string> = Object.fromEntries(
  REGIMES_TRIBUTARIOS.map(r => [r.value, r.label])
)
