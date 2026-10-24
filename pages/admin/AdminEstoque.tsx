import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Modal } from '../../components/Modal';
import { supabase } from '../../lib/supabase';
import {
  Package, Plus, Search, Filter, Edit, Trash2, ArrowUpCircle, ArrowDownCircle,
  AlertTriangle, DollarSign, TrendingDown, X,
} from 'lucide-react';

interface EstoqueItem {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade_atual: number;
  quantidade_minima: number;
  preco_unitario: number;
  fornecedor: string;
  observacao: string;
}

const CATEGORIAS = ['Limpeza', 'Higiene', 'EPI', 'Equipamento', 'Outro'];
const UNIDADES = ['un', 'L', 'kg', 'g', 'ml', 'cx', 'pc', 'rolo'];

const BLANK: Omit<EstoqueItem, 'id'> = {
  nome: '', categoria: 'Limpeza', unidade: 'un',
  quantidade_atual: 0, quantidade_minima: 0,
  preco_unitario: 0, fornecedor: '', observacao: '',
};

function fmtMoney(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusBadge(item: EstoqueItem) {
  if (item.quantidade_atual <= 0) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">🔴 Zerado</span>;
  if (item.quantidade_atual < item.quantidade_minima) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">🟡 Baixo</span>;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">🟢 OK</span>;
}

export const AdminEstoque: React.FC = () => {
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<EstoqueItem | null>(null);
  const [form, setForm] = useState<Omit<EstoqueItem, 'id'>>(BLANK);
  const [saving, setSaving] = useState(false);
  const [movItem, setMovItem] = useState<EstoqueItem | null>(null);
  const [movTipo, setMovTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [movQtd, setMovQtd] = useState('');
  const [movMotivo, setMovMotivo] = useState('');
  const [movSaving, setMovSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('estoque').select('*').order('nome');
    setItems((data as EstoqueItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i => {
      const matchSearch = !q || i.nome.toLowerCase().includes(q) || i.fornecedor.toLowerCase().includes(q);
      const matchCat = !filterCat || i.categoria === filterCat;
      return matchSearch && matchCat;
    });
  }, [items, search, filterCat]);

  const kpis = useMemo(() => ({
    total: items.length,
    baixo: items.filter(i => i.quantidade_atual > 0 && i.quantidade_atual < i.quantidade_minima).length,
    zerado: items.filter(i => i.quantidade_atual <= 0).length,
    valorTotal: items.reduce((s, i) => s + i.quantidade_atual * i.preco_unitario, 0),
  }), [items]);

  const openNew = () => {
    setEditItem(null);
    setForm(BLANK);
    setShowModal(true);
  };

  const openEdit = (item: EstoqueItem) => {
    setEditItem(item);
    setForm({ nome: item.nome, categoria: item.categoria, unidade: item.unidade, quantidade_atual: item.quantidade_atual, quantidade_minima: item.quantidade_minima, preco_unitario: item.preco_unitario, fornecedor: item.fornecedor, observacao: item.observacao });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    if (editItem) {
      await supabase.from('estoque').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editItem.id);
    } else {
      await supabase.from('estoque').insert(form);
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('estoque').delete().eq('id', id);
    setConfirmDel(null);
    load();
  };

  const openMov = (item: EstoqueItem, tipo: 'ENTRADA' | 'SAIDA') => {
    setMovItem(item);
    setMovTipo(tipo);
    setMovQtd('');
    setMovMotivo('');
  };

  const handleMov = async () => {
    if (!movItem || !movQtd) return;
    const qtd = parseFloat(movQtd);
    if (isNaN(qtd) || qtd <= 0) return;
    setMovSaving(true);
    const nova = movTipo === 'ENTRADA'
      ? movItem.quantidade_atual + qtd
      : Math.max(0, movItem.quantidade_atual - qtd);
    await Promise.all([
      supabase.from('estoque_movimentos').insert({ estoque_id: movItem.id, tipo: movTipo, quantidade: qtd, motivo: movMotivo }),
      supabase.from('estoque').update({ quantidade_atual: nova, updated_at: new Date().toISOString() }).eq('id', movItem.id),
    ]);
    setMovSaving(false);
    setMovItem(null);
    load();
  };

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow">
              <Package size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Estoque</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Controle de produtos e suprimentos</p>
            </div>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            <Plus size={16} /> Novo Produto
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total de itens</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.total}</p>
            <p className="text-xs text-gray-400 mt-1">cadastrados</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-amber-200 dark:border-amber-800 shadow-sm">
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Estoque baixo</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{kpis.baixo}</p>
            <p className="text-xs text-gray-400 mt-1">abaixo do mínimo</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-red-200 dark:border-red-800 shadow-sm">
            <p className="text-xs text-red-600 dark:text-red-400 mb-1">Zerados</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{kpis.zerado}</p>
            <p className="text-xs text-gray-400 mt-1">sem estoque</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Valor total</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{fmtMoney(kpis.valorTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">em estoque</p>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="flex-1 min-w-[180px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
              placeholder="Buscar produto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum produto encontrado</p>
            <p className="text-sm text-gray-400">Clique em "Novo Produto" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">{item.nome}</span>
                      {statusBadge(item)}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{item.categoria}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span>Qtd: <strong className="text-gray-900 dark:text-white">{item.quantidade_atual} {item.unidade}</strong></span>
                      <span>Mín: {item.quantidade_minima} {item.unidade}</span>
                      <span>Preço: {fmtMoney(item.preco_unitario)}/{item.unidade}</span>
                      <span>Total: <strong className="text-emerald-600 dark:text-emerald-400">{fmtMoney(item.quantidade_atual * item.preco_unitario)}</strong></span>
                      {item.fornecedor && <span>Fornecedor: {item.fornecedor}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => openMov(item, 'ENTRADA')} title="Entrada" className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                      <ArrowUpCircle size={18} />
                    </button>
                    <button onClick={() => openMov(item, 'SAIDA')} title="Saída" className="p-2 rounded-xl text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                      <ArrowDownCircle size={18} />
                    </button>
                    <button onClick={() => openEdit(item)} className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => setConfirmDel(item.id)} className="p-2 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Novo/Editar */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Editar Produto' : 'Novo Produto'}
        maxWidth="md"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.nome.trim()} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
            <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Detergente neutro 5L" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidade</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Qtd. atual</label>
              <input type="number" min="0" step="0.01" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.quantidade_atual} onChange={e => setForm(f => ({ ...f, quantidade_atual: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Qtd. mínima</label>
              <input type="number" min="0" step="0.01" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.quantidade_minima} onChange={e => setForm(f => ({ ...f, quantidade_minima: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço unit. (R$)</label>
              <input type="number" min="0" step="0.01" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.preco_unitario} onChange={e => setForm(f => ({ ...f, preco_unitario: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fornecedor</label>
            <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} placeholder="Nome do fornecedor" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
            <textarea rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Modal Movimento */}
      <Modal
        isOpen={!!movItem}
        onClose={() => setMovItem(null)}
        title={movTipo === 'ENTRADA' ? '📦 Registrar Entrada' : '📤 Registrar Saída'}
        maxWidth="sm"
        footer={
          <>
            <button onClick={() => setMovItem(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancelar</button>
            <button onClick={handleMov} disabled={movSaving || !movQtd} className={`px-4 py-2 text-sm text-white rounded-xl font-medium transition-colors disabled:opacity-50 ${movTipo === 'ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
              {movSaving ? 'Salvando...' : 'Confirmar'}
            </button>
          </>
        }
      >
        {movItem && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Produto: <strong className="text-gray-900 dark:text-white">{movItem.nome}</strong></p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Estoque atual: <strong>{movItem.quantidade_atual} {movItem.unidade}</strong></p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantidade ({movItem.unidade}) *</label>
              <input type="number" min="0.01" step="0.01" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" value={movQtd} onChange={e => setMovQtd(e.target.value)} placeholder="0" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" value={movMotivo} onChange={e => setMovMotivo(e.target.value)} placeholder={movTipo === 'ENTRADA' ? 'Ex: Compra fornecedor' : 'Ex: Uso no serviço'} />
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm delete */}
      <Modal
        isOpen={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Excluir produto"
        maxWidth="sm"
        footer={
          <>
            <button onClick={() => setConfirmDel(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancelar</button>
            <button onClick={() => confirmDel && handleDelete(confirmDel)} className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors">Excluir</button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">Tem certeza que deseja excluir este produto? Todo o histórico de movimentos será perdido.</p>
      </Modal>
    </Layout>
  );
};
