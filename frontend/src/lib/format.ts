// Fuso fixo: o HTML é gerado no servidor (container em UTC), e o time trabalha no horário de Brasília
const DATE_TIME = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}
