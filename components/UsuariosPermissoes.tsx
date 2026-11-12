import React, { useEffect, useMemo, useState } from 'react';
import { Check, Eye, Loader2, Plus, Shield, Trash2, User, UserPlus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AREAS, PERFIS, AreaKey, Permissoes, definirPermissoes, nivelDeAcesso, temAcessoTotal } from '../lib/acesso';
import { criarAcesso, excluirAcesso } from '../lib/conta';
import { startCollabPreview, startClientPreview, type PreviewCollab, type PreviewClient } from '../lib/adminPreview';

// Configurações → Usuários & Permissões: who is in the office team and what each person can open.
// Professionals (the phone app) are managed in Recursos Humanos → Profissionais.

interface Usuario { id: string; name: string; email: string; role: string; auth_id?: string | null; permissoes: Permissoes | null }

const campo = 'w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-sm text-darkText dark:text-darkTextPrimary';
const GRUPOS = Array.from(new Set(AREAS.map(a => a.grupo)));

const EscolherAreas: React.FC<{ valor: Permissoes | null; onChange: (p: Permissoes | null) => void }> = ({ valor, onChange }) => {
  const areas = valor?.areas ?? [];
  const alternar = (k: AreaKey) => onChange({ areas: areas.includes(k) ? areas.filter(a => a !== k) : [...areas, k] });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange(null)}
          className={`text-xs font-bold px-3 py-1.5 rounded-full border ${!valor ? 'bg-primary text-white border-primary' : 'border-gray-200 dark:border-darkBorder text-darkText dark:text-darkTextPrimary'}`}>
          Acesso total
        </button>
        {PERFIS.map(p => {
          const ativo = !!valor && p.areas.length === areas.length && p.areas.every(a => areas.includes(a));
          return (
            <button key={p.key} type="button" title={p.descricao} onClick={() => onChange({ areas: [...p.areas] })}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border ${ativo ? 'bg-primary text-white border-primary' : 'border-gray-200 dark:border-darkBorder text-darkText dark:text-darkTextPrimary'}`}>
              {p.label}
            </button>
          );
        })}
      </div>
      {!valor ? (
        <p className="text-xs text-lightText dark:text-darkTextSecondary">Vê e mexe em tudo, inclusive no acesso das outras pessoas.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {GRUPOS.map(g => (
            <div key={g} className="rounded-xl border border-gray-100 dark:border-darkBorder p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{g}</p>
              {AREAS.filter(a => a.grupo === g).map(a => (
                <label key={a.key} className="flex items-start gap-2 py-1 cursor-pointer">
                  <input type="checkbox" className="accent-[#a163ff] w-4 h-4 mt-0.5" checked={areas.includes(a.key)} onChange={() => alternar(a.key)} />
                  <span className="text-sm text-darkText dark:text-darkTextPrimary leading-tight">
                    {a.label}
                    {a.dica && <span className="block text-[11px] text-lightText dark:text-darkTextSecondary">{a.dica}</span>}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const UsuariosPermissoes: React.FC = () => {
  const souTotal = temAcessoTotal();
  const souDono = localStorage.getItem('ndl_dono') === '1';
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [meuAuth, setMeuAuth] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Permissoes | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [novo, setNovo] = useState<{ name: string; email: string; senha: string; perm: Permissoes | null } | null>(null);

  const carregar = async () => {
    setCarregando(true);
    const [{ data }, { data: eu }] = await Promise.all([
      supabase.from('app_users').select('id, name, email, role, auth_id, permissoes').in('role', ['ADMIN', 'COLLABORATOR']).order('role').order('name'),
      supabase.auth.getUser(),
    ]);
    setUsuarios((data as Usuario[]) ?? []);
    setMeuAuth(eu?.user?.id ?? null);
    setCarregando(false);
  };
  useEffect(() => { carregar(); }, []);

  const equipe = useMemo(() => usuarios.filter(u => u.role === 'ADMIN'), [usuarios]);
  const profissionais = useMemo(() => usuarios.filter(u => u.role === 'COLLABORATOR'), [usuarios]);

  const salvarAcesso = async (u: Usuario) => {
    if (rascunho && rascunho.areas.length === 0) { setMsg({ ok: false, t: 'Marque pelo menos uma área.' }); return; }
    setSalvando(true); setMsg(null);
    const erro = await definirPermissoes(u.id, rascunho);
    setSalvando(false);
    if (erro) { setMsg({ ok: false, t: erro }); return; }
    setUsuarios(l => l.map(x => x.id === u.id ? { ...x, permissoes: rascunho } : x));
    setEditando(null);
    setMsg({ ok: true, t: `Acesso de ${u.name} atualizado. Vale na próxima vez que a pessoa abrir o sistema.` });
  };

  const adicionar = async () => {
    if (!novo) return;
    if (!novo.name.trim() || !novo.email.includes('@') || novo.senha.length < 6) { setMsg({ ok: false, t: 'Preencha nome, e-mail e uma senha de pelo menos 6 caracteres.' }); return; }
    if (novo.perm && novo.perm.areas.length === 0) { setMsg({ ok: false, t: 'Marque pelo menos uma área.' }); return; }
    setSalvando(true); setMsg(null);
    const r = await criarAcesso({ name: novo.name.trim(), email: novo.email.trim(), senha: novo.senha, role: 'ADMIN', permissoes: novo.perm });
    setSalvando(false);
    if (!r?.ok) { setMsg({ ok: false, t: r?.erro || 'Não foi possível criar o acesso.' }); return; }
    setMsg({ ok: true, t: `${novo.name} já pode entrar em app.negociosdelimpeza.com.br/entrar com o e-mail e a senha que você definiu.` });
    setNovo(null);
    carregar();
  };

  const remover = async (u: Usuario) => {
    if (!window.confirm(`Remover o acesso de ${u.name}? A pessoa não vai mais conseguir entrar.`)) return;
    const r = await excluirAcesso(u.id);
    if (!r?.ok) { setMsg({ ok: false, t: r?.erro || 'Não foi possível remover.' }); return; }
    setUsuarios(l => l.filter(x => x.id !== u.id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-xl font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><Shield size={20} /> Usuários & Permissões</h3>
          <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1">Quem é da equipe do escritório e o que cada pessoa pode ver e mexer.</p>
        </div>
        {souTotal && !novo && (
          <button onClick={() => { setNovo({ name: '', email: '', senha: '', perm: { areas: [...PERFIS[0].areas] } }); setMsg(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover">
            <UserPlus size={16} /> Adicionar pessoa
          </button>
        )}
      </div>

      {msg && <p className={`text-sm font-semibold rounded-xl px-3 py-2 ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg.t}</p>}

      {novo && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Nova pessoa da equipe do escritório</p>
            <button onClick={() => setNovo(null)} className="text-gray-400" aria-label="Fechar"><X size={18} /></button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <input className={campo} placeholder="Nome" value={novo.name} onChange={e => setNovo({ ...novo, name: e.target.value })} />
            <input className={campo} placeholder="E-mail (é o login)" type="email" value={novo.email} onChange={e => setNovo({ ...novo, email: e.target.value })} />
            <input className={campo} placeholder="Senha (mín. 6)" value={novo.senha} onChange={e => setNovo({ ...novo, senha: e.target.value })} />
          </div>
          <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary">O que ela pode ver</p>
          <EscolherAreas valor={novo.perm} onChange={perm => setNovo({ ...novo, perm })} />
          <button onClick={adicionar} disabled={salvando}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-60">
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Criar acesso
          </button>
        </div>
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Equipe do escritório</p>
        <div className="divide-y divide-gray-100 dark:divide-darkBorder rounded-xl border border-gray-200 dark:border-darkBorder">
          {carregando && <p className="p-4 text-sm text-lightText">Carregando...</p>}
          {!carregando && equipe.map(u => {
            const souEu = !!meuAuth && u.auth_id === meuAuth;
            const aberto = editando === u.id;
            return (
              <div key={u.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-darkText dark:text-darkTextPrimary text-sm truncate">{u.name}{souEu && <span className="text-lightText font-normal"> (você)</span>}</p>
                    <p className="text-xs text-lightText dark:text-darkTextSecondary truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${u.permissoes ? 'bg-amber-50 text-amber-700' : 'bg-primary/10 text-primary'}`}>{nivelDeAcesso(u.permissoes)}</span>
                    {souTotal && !souEu && !aberto && (
                      <>
                        <button onClick={() => { setEditando(u.id); setRascunho(u.permissoes); setMsg(null); }} className="text-xs font-bold text-primary hover:underline">Editar acesso</button>
                        <button onClick={() => remover(u)} className="p-1.5 text-gray-300 hover:text-red-500" title="Remover acesso"><Trash2 size={15} /></button>
                      </>
                    )}
                  </div>
                </div>
                {aberto && (
                  <div className="rounded-xl bg-gray-50 dark:bg-darkBg p-3 space-y-3">
                    <EscolherAreas valor={rascunho} onChange={setRascunho} />
                    <div className="flex gap-2">
                      <button onClick={() => salvarAcesso(u)} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-60">
                        {salvando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
                      </button>
                      <button onClick={() => setEditando(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-lightText">Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!souTotal && <p className="text-xs text-lightText mt-2">Só quem tem acesso total pode mudar o acesso das pessoas.</p>}
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Profissionais (app do celular)</p>
        <div className="rounded-xl border border-gray-200 dark:border-darkBorder p-4 text-sm text-lightText dark:text-darkTextSecondary">
          {profissionais.length} {profissionais.length === 1 ? 'profissional tem' : 'profissionais têm'} acesso ao app. No app elas veem só a agenda delas, os serviços, quanto vão receber e o próprio financeiro (nunca o valor que o cliente paga). O acesso é criado em Recursos Humanos → Profissionais → Dar acesso.
        </div>
      </div>

      {souDono && <VerComo />}
    </div>
  );
};

// Owner only: open the professional or client screens as a specific person.
const VerComo: React.FC = () => {
  const [aba, setAba] = useState<'prof' | 'cliente' | null>(null);
  const [lista, setLista] = useState<{ id: string; nome: string; foto?: string | null; raw: any }[]>([]);
  const [carregando, setCarregando] = useState(false);

  const abrir = async (qual: 'prof' | 'cliente') => {
    if (aba === qual) { setAba(null); return; }
    setAba(qual); setCarregando(true);
    if (qual === 'prof') {
      const { data } = await supabase.from('colaboradoras_rh').select('id, nome, foto').eq('status', 'ATIVA').order('nome');
      setLista((data ?? []).map((c: any) => ({ id: c.id, nome: c.nome, foto: c.foto, raw: c })));
    } else {
      const { data } = await supabase.from('app_users').select('id, name, photo, email').eq('role', 'CLIENT').order('name');
      setLista((data ?? []).map((c: any) => ({ id: c.id, nome: c.name, foto: c.photo, raw: c })));
    }
    setCarregando(false);
  };

  const entrarComo = (raw: any) => {
    try { aba === 'prof' ? startCollabPreview(raw as PreviewCollab) : startClientPreview(raw as PreviewClient); }
    catch { window.alert('Não foi possível abrir: o armazenamento do navegador está cheio. Feche outras abas do sistema e tente de novo.'); return; }
    sessionStorage.setItem('ndl_preview_return_path', window.location.hash || '#/admin/dashboard');
    window.location.assign(window.location.origin + '/?_ndl=1#' + (aba === 'prof' ? '/collab/agenda' : '/client/dashboard'));
  };

  return (
    <div className="border-t border-gray-100 dark:border-darkBorder pt-6">
      <h4 className="text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1 flex items-center gap-2"><Eye size={16} /> Ver o sistema como outra pessoa</h4>
      <p className="text-xs text-lightText dark:text-darkTextSecondary mb-3">Abre as telas exatamente como a profissional ou o cliente vê (só o dono da plataforma).</p>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => abrir('prof')} className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold ${aba === 'prof' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'}`}><Eye size={15} /> Como profissional</button>
        <button onClick={() => abrir('cliente')} className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold ${aba === 'cliente' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}`}><User size={15} /> Como cliente</button>
      </div>
      {aba && (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-gray-100 dark:border-darkBorder divide-y divide-gray-50 dark:divide-darkBorder">
          {carregando ? <p className="text-xs text-gray-400 p-3 text-center">Carregando...</p>
            : lista.length === 0 ? <p className="text-xs text-gray-400 p-3 text-center">Ninguém encontrado</p>
            : lista.map(c => (
              <button key={c.id} onClick={() => entrarComo(c.raw)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-darkText dark:text-darkTextPrimary hover:bg-gray-50 dark:hover:bg-darkBg">
                {c.foto ? <img src={c.foto} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  : <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{(c.nome || '?').trim().charAt(0)}</span>}
                <span className="truncate">{(c.nome || '').trim()}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
