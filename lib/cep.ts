// Brazilian postal code (CEP) lookup via ViaCEP: fills street, district, city and state.
export interface EnderecoCep { street: string; district: string; city: string; state: string }

export const soDigitos = (v: string) => (v || '').replace(/\D/g, '');
export const formatarCep = (v: string) => { const d = soDigitos(v).slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };

export async function buscarCep(cep: string): Promise<EnderecoCep | null> {
  const d = soDigitos(cep);
  if (d.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    const j = await r.json();
    if (!j || j.erro) return null;
    return { street: j.logradouro || '', district: j.bairro || '', city: j.localidade || '', state: j.uf || '' };
  } catch { return null; }
}

// "Rua das Palmeiras, 120, apto 302 - Praia do Morro, Guarapari/ES, 29216-010" (good for Google Maps too)
export function enderecoEmTexto(a: { street?: string; number?: string; complement?: string; district?: string; city?: string; state?: string; cep?: string }) {
  const rua = [a.street, a.number].filter(Boolean).join(', ') + (a.complement ? `, ${a.complement}` : '');
  const cidade = [a.city, a.state].filter(Boolean).join('/');
  return [rua, a.district, cidade, a.cep ? formatarCep(a.cep) : ''].filter(s => s && s.trim()).join(' - ');
}
