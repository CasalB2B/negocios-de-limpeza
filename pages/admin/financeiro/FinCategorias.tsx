import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useFinanceiro, Categoria } from '../../../lib/financeiro';
import { supabase } from '../../../lib/supabase';
import { FinShell, card, Carregando, inputCls } from './comum';

const CORES = ['#ef4444', '#f97316', '#f59e0b', '#65a30d', '#0d9488', '#0ea5e9', '#6366f1', '#7c3aed', '#ec4899', '#78716c', '#94a3b8'];

export const FinCategorias: React.FC = () => {
  const fin = useFinanceiro();
  if (fin.carregando || fin.erro) return <FinShell titulo="Categorias"><Carregando erro={fin.erro} /></FinShell>;
  return (
    <FinShell titulo="Categorias">
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Lista fin={fin} tipo="DESPESA" />
        <Lista fin={fin} tipo="RECEITA" />
      </div>
    </FinShell>
  );
};

const Lista: React.FC<{ fin: ReturnType<typeof useFinanceiro>; tipo: 'RECEITA' | 'DESPESA' }> = ({ fin, tipo }) => {
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(CORES[0]);
  const [msg, setMsg] = useState('');
  const cats = fin.categorias.filter(c => c.tipo === tipo);

  async function criar() {
    if (!nome.trim()) return;
    const { error } = await supabase.from('fin_categorias').insert({ nome: nome.trim(), tipo, cor });
    if (error) return setMsg(error.message.includes('duplicate') ? 'Já existe uma categoria com esse nome.' : error.message);
    setNome(''); setMsg('');
    fin.recarregar();
  }
  async function salvar(c: Categoria, campos: Partial<Categoria>) {
    await supabase.from('fin_categorias').update(campos).eq('id', c.id);
    fin.recarregar();
  }
  async function excluir(c: Categoria) {
    const usos = fin.lancamentos.filter(l => l.categoria_id === c.id).length;
    if (!confirm(usos ? `${usos} lançamento(s) usam "${c.nome}" e ficarão sem categoria. Excluir mesmo assim?` : `Excluir "${c.nome}"?`)) return;
    await supabase.from('fin_categorias').delete().eq('id', c.id);
    fin.recarregar();
  }

  return (
    <div className={`${card} p-5 space-y-3`}>
      <h3 className="font-bold text-darkText dark:text-darkTextPrimary">{tipo === 'DESPESA' ? 'Categorias de despesa' : 'Categorias de receita'}</h3>
      <ul className="divide-y divide-gray-50 dark:divide-darkBorder">
        {cats.map(c => (
          <li key={c.id} className="py-2 flex items-center gap-2">
            <input type="color" value={c.cor} onChange={e => salvar(c, { cor: e.target.value })} className="w-7 h-7 rounded-full border-0 bg-transparent cursor-pointer" aria-label="Cor" />
            <input defaultValue={c.nome} onBlur={e => e.target.value.trim() && e.target.value.trim() !== c.nome && salvar(c, { nome: e.target.value.trim() })}
              className="flex-1 bg-transparent text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:border-b border-primary" />
            {c.sistema ? (
              <span className="text-[10px] text-lightText" title="Usada pelos lançamentos automáticos">automática</span>
            ) : (
              <button onClick={() => excluir(c)} className="p-1.5 text-lightText hover:text-red-500" aria-label="Excluir"><Trash2 size={15} /></button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 items-center pt-2 border-t border-gray-100 dark:border-darkBorder">
        <div className="flex gap-1">
          {CORES.slice(0, 6).map(k => <button key={k} onClick={() => setCor(k)} className={`w-5 h-5 rounded-full ${cor === k ? 'ring-2 ring-offset-1 ring-darkText' : ''}`} style={{ background: k }} aria-label={k} />)}
        </div>
        <input className={`${inputCls} py-1.5`} placeholder="Nova categoria" value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && criar()} />
        <button onClick={criar} className="p-2 bg-primary text-white rounded-xl" aria-label="Adicionar"><Plus size={16} /></button>
      </div>
      {msg && <p className="text-xs text-red-500">{msg}</p>}
    </div>
  );
};
