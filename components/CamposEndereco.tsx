import React, { useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import type { Address } from '../types';
import { buscarCep, formatarCep, soDigitos } from '../lib/cep';

// Address block used when registering and editing clients: the CEP comes first and fills street,
// district, city and state; then only the number, complement and notes are left.
const campo = 'w-full p-3.5 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary';
const rotulo = 'block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5';

export const CamposEndereco: React.FC<{ valor: Partial<Address>; onChange: (patch: Partial<Address>) => void }> = ({ valor, onChange }) => {
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState('');

  const aoMudarCep = async (texto: string) => {
    const cep = formatarCep(texto);
    onChange({ cep });
    setAviso('');
    if (soDigitos(cep).length !== 8) return;
    setBuscando(true);
    const r = await buscarCep(cep);
    setBuscando(false);
    if (!r) { setAviso('CEP não encontrado. Preencha o endereço abaixo.'); return; }
    onChange({ cep, street: r.street, district: r.district, city: r.city, state: r.state });
    if (!r.street) setAviso('Este CEP é da cidade toda: preencha a rua e o bairro.');
    setTimeout(() => document.getElementById('campo-numero-endereco')?.focus(), 50);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className={rotulo}>CEP</label>
        <div className="relative">
          <input className={campo} inputMode="numeric" placeholder="00000-000" value={valor.cep || ''} onChange={e => aoMudarCep(e.target.value)} />
          {buscando && <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary" />}
        </div>
        {aviso
          ? <p className="text-xs text-amber-600 mt-1">{aviso}</p>
          : <p className="text-xs text-lightText mt-1">Digite o CEP que a rua, o bairro e a cidade aparecem sozinhos.</p>}
      </div>
      <div>
        <label className={rotulo}>Rua / Avenida</label>
        <input className={campo} value={valor.street || ''} onChange={e => onChange({ street: e.target.value })} />
      </div>
      <div className="grid grid-cols-[1fr_1.6fr] gap-3">
        <div>
          <label className={rotulo}>Número</label>
          <input id="campo-numero-endereco" className={campo} inputMode="numeric" value={valor.number || ''} onChange={e => onChange({ number: e.target.value })} />
        </div>
        <div>
          <label className={rotulo}>Complemento</label>
          <input className={campo} placeholder="Apto, bloco, casa" value={valor.complement || ''} onChange={e => onChange({ complement: e.target.value })} />
        </div>
      </div>
      <div>
        <label className={rotulo}>Bairro</label>
        <input className={campo} value={valor.district || ''} onChange={e => onChange({ district: e.target.value })} />
      </div>
      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <div>
          <label className={rotulo}>Cidade</label>
          <input className={campo} value={valor.city || ''} onChange={e => onChange({ city: e.target.value })} />
        </div>
        <div>
          <label className={rotulo}>UF</label>
          <input className={campo} maxLength={2} value={valor.state || ''} onChange={e => onChange({ state: e.target.value.toUpperCase() })} />
        </div>
      </div>
      <div>
        <label className={rotulo}>Observações</label>
        <textarea className={`${campo} min-h-[80px]`} placeholder="Portaria, onde fica a chave, ponto de referência, cachorro..."
          value={valor.notes || ''} onChange={e => onChange({ notes: e.target.value })} />
      </div>
      {valor.street && valor.number && (
        <a className="inline-flex items-center gap-1.5 text-xs font-bold text-primary" target="_blank" rel="noreferrer"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([valor.street, valor.number, valor.district, valor.city, valor.state].filter(Boolean).join(', '))}`}>
          <MapPin size={13} /> Conferir no mapa
        </a>
      )}
    </div>
  );
};
