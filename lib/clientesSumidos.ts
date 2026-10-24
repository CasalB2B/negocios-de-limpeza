export interface ClienteSumido {
  nome: string;
  telefone: string | null;
  ultimoServico: string; // DD/MM/YYYY
  diasSumido: number;
}

export function getClientesSumidos(services: any[], minDays = 30): ClienteSumido[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const latestByClient = new Map<string, { date: Date; telefone: string | null }>();

  for (const s of services) {
    if (!['COMPLETED', 'CONFIRMED', 'SCHEDULED', 'WAITING_SIGNAL'].includes(s.status)) continue;
    const nome = s.clientName || s.client_name;
    if (!nome) continue;
    const tel = s.clientPhone || s.client_phone || null;
    const parts = (s.date || '').split('/');
    if (parts.length !== 3) continue;
    const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    const existing = latestByClient.get(nome);
    if (!existing || d > existing.date) {
      latestByClient.set(nome, { date: d, telefone: tel });
    }
  }

  const results: ClienteSumido[] = [];
  for (const [nome, { date, telefone }] of latestByClient) {
    const diff = Math.floor((today.getTime() - date.getTime()) / 86400000);
    if (diff >= minDays) {
      results.push({
        nome,
        telefone,
        ultimoServico: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`,
        diasSumido: diff,
      });
    }
  }
  return results.sort((a, b) => b.diasSumido - a.diasSumido);
}
