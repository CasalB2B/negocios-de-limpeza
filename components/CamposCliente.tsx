import React from 'react';

// Client registration data, same layout in "Novo cliente" and "Editar informações":
// name, phone with country, e-mail, CPF/CNPJ, birthday (with age), sex, client type, blocked, description.

export interface DadosCliente {
  name: string; ddi: string; phone: string; email: string;
  tipoDocumento: 'CPF' | 'CNPJ'; documento: string;
  nascimento: string; sexo: string; type: string; bloqueado: boolean; descricao: string;
}

export const CLIENTE_VAZIO: DadosCliente = {
  name: '', ddi: '55', phone: '', email: '', tipoDocumento: 'CPF', documento: '',
  nascimento: '', sexo: '', type: 'NOVO', bloqueado: false, descricao: '',
};

export const PAISES = [
  { ddi: '55', bandeira: '🇧🇷', nome: 'Brasil' },
  { ddi: '1', bandeira: '🇺🇸', nome: 'Estados Unidos' },
  { ddi: '351', bandeira: '🇵🇹', nome: 'Portugal' },
  { ddi: '54', bandeira: '🇦🇷', nome: 'Argentina' },
  { ddi: '595', bandeira: '🇵🇾', nome: 'Paraguai' },
  { ddi: '598', bandeira: '🇺🇾', nome: 'Uruguai' },
  { ddi: '56', bandeira: '🇨🇱', nome: 'Chile' },
  { ddi: '34', bandeira: '🇪🇸', nome: 'Espanha' },
  { ddi: '39', bandeira: '🇮🇹', nome: 'Itália' },
  { ddi: '44', bandeira: '🇬🇧', nome: 'Reino Unido' },
  { ddi: '49', bandeira: '🇩🇪', nome: 'Alemanha' },
  { ddi: '33', bandeira: '🇫🇷', nome: 'França' },
];

const dig = (v: string) => (v || '').replace(/\D/g, '');

export const mascaraTelefone = (v: string, ddi: string) => {
  const d = dig(v).slice(0, ddi === '55' ? 11 : 15);
  if (ddi !== '55') return d;
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export const mascaraDocumento = (v: string, tipo: string) => {
  const d = dig(v);
  if (tipo === 'CNPJ') {
    const c = d.slice(0, 14);
    return c.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  const c = d.slice(0, 11);
  return c.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

// Check digits, so a typo in the CPF/CNPJ is caught before the invoice.
export function documentoValido(v: string, tipo: string): boolean {
  const d = dig(v);
  if (tipo === 'CNPJ') {
    if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
    const calc = (n: number) => {
      const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const s = pesos.reduce((t, p, i) => t + Number(d[i]) * p, 0);
      const r = s % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
  }
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export const idade = (nascimento: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento || '')) return null;
  const [a, m, d] = nascimento.split('-').map(Number);
  const hoje = new Date();
  let i = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) i--;
  return i >= 0 && i < 130 ? i : null;
};

// Phone as stored: Brazilian numbers without country code (as before), foreign ones with +code.
export const telefoneParaSalvar = (phone: string, ddi: string) => {
  const d = dig(phone);
  if (!d) return '';
  return ddi === '55' ? mascaraTelefone(d, '55') : `+${ddi} ${d}`;
};
export const telefoneParaEditar = (phone: string, ddi: string) => {
  const d = dig(phone);
  return ddi !== '55' && d.startsWith(ddi) ? d.slice(ddi.length) : mascaraTelefone(d, ddi || '55');
};

const campo = 'w-full p-3.5 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary';
const rotulo = 'block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5';

export const CamposCliente: React.FC<{
  valor: DadosCliente; onChange: (patch: Partial<DadosCliente>) => void;
  tipos: { value: string; label: string; hint?: string }[];
}> = ({ valor, onChange, tipos }) => {
  const anos = idade(valor.nascimento);
  const docDigitos = dig(valor.documento);
  const docCompleto = valor.tipoDocumento === 'CNPJ' ? docDigitos.length === 14 : docDigitos.length === 11;
  const docInvalido = docCompleto && !documentoValido(valor.documento, valor.tipoDocumento);
  const pais = PAISES.find(p => p.ddi === valor.ddi) || PAISES[0];

  return (
    <div className="space-y-3">
      <div>
        <label className={rotulo}>Nome *</label>
        <input className={campo} placeholder="Ex: Maria da Silva" value={valor.name} onChange={e => onChange({ name: e.target.value })} />
      </div>

      <div>
        <label className={rotulo}>Telefone / WhatsApp</label>
        <div className="flex gap-2">
          <div className="relative shrink-0">
            <select aria-label="País" className={`${campo} w-[6.5rem] pr-2 appearance-none`} value={valor.ddi}
              onChange={e => onChange({ ddi: e.target.value, phone: mascaraTelefone(valor.phone, e.target.value) })}>
              {PAISES.map(p => <option key={p.ddi} value={p.ddi}>{p.bandeira} +{p.ddi}</option>)}
            </select>
          </div>
          <input className={`${campo} min-w-0`} inputMode="tel" placeholder={pais.ddi === '55' ? '(27) 99999-9999' : 'Número'}
            value={valor.phone} onChange={e => onChange({ phone: mascaraTelefone(e.target.value, valor.ddi) })} />
        </div>
      </div>

      <div>
        <label className={rotulo}>E-mail</label>
        <input className={campo} type="email" placeholder="email@exemplo.com (opcional)" value={valor.email} onChange={e => onChange({ email: e.target.value })} />
      </div>

      <div>
        <div className="flex items-center gap-4 mb-1.5">
          {(['CPF', 'CNPJ'] as const).map(t => (
            <label key={t} className="inline-flex items-center gap-1.5 text-sm font-bold text-darkText dark:text-darkTextPrimary cursor-pointer">
              <input type="radio" name="tipo-documento" className="accent-[#a163ff]" checked={valor.tipoDocumento === t}
                onChange={() => onChange({ tipoDocumento: t, documento: mascaraDocumento(valor.documento, t) })} /> {t}
            </label>
          ))}
          <span className="text-xs text-lightText">para a nota fiscal</span>
        </div>
        <input className={`${campo} ${docInvalido ? 'border-red-400' : ''}`} inputMode="numeric"
          placeholder={valor.tipoDocumento === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
          value={valor.documento} onChange={e => onChange({ documento: mascaraDocumento(e.target.value, valor.tipoDocumento) })} />
        {docInvalido && <p className="text-xs text-red-600 mt-1">{valor.tipoDocumento} inválido. Confira os números.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={rotulo}>Aniversário</label>
          <input className={campo} type="date" value={valor.nascimento} onChange={e => onChange({ nascimento: e.target.value })} />
          {anos !== null && <p className="text-xs text-lightText mt-1">{anos} anos</p>}
        </div>
        <div>
          <label className={rotulo}>Sexo</label>
          <select className={campo} value={valor.sexo} onChange={e => onChange({ sexo: e.target.value })}>
            <option value="">Não informado</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
          </select>
        </div>
      </div>

      <div>
        <label className={rotulo}>Tipo de cliente</label>
        <select className={campo} value={valor.type} onChange={e => onChange({ type: e.target.value })}>
          {tipos.map(o => <option key={o.value} value={o.value}>{o.label}{o.hint ? ` — ${o.hint}` : ''}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-darkBorder px-3.5 py-3">
        <div>
          <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Bloquear cliente</p>
          <p className="text-xs text-lightText">Aparece com aviso na lista e na agenda, para não agendar por engano.</p>
        </div>
        <button type="button" role="switch" aria-checked={valor.bloqueado} onClick={() => onChange({ bloqueado: !valor.bloqueado })}
          className={`relative w-12 h-7 rounded-full shrink-0 transition ${valor.bloqueado ? 'bg-red-500' : 'bg-gray-300 dark:bg-darkBorder'}`}>
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${valor.bloqueado ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      <div>
        <label className={rotulo}>Descrição</label>
        <textarea className={`${campo} min-h-[80px]`} placeholder="Preferências, produtos que não pode usar, observações gerais..."
          value={valor.descricao} onChange={e => onChange({ descricao: e.target.value })} />
      </div>
    </div>
  );
};
