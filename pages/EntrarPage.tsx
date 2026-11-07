import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useData } from '../components/DataContext';
import { criarEmpresa } from '../lib/conta';

// Single entry screen for everyone (admin, collaborator, client), plus the "create account" steps.
// Inspired by the AgencyFlow login: logo animation on arrival, form on the left, team photo on the right.

const SPLASH_KEY = 'ndl_splash_visto';

const Splash: React.FC<{ onFim: () => void }> = ({ onFim }) => {
  useEffect(() => { const t = setTimeout(onFim, 1700); return () => clearTimeout(t); }, [onFim]);
  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-darkBg flex items-center justify-center ndl-splash-sai">
      <img src="/img/logo-lilas.png" alt="Negócios de Limpeza" className="w-64 max-w-[70vw] ndl-splash-logo dark:hidden" />
      <img src="/img/logo-bege.png" alt="Negócios de Limpeza" className="w-64 max-w-[70vw] ndl-splash-logo hidden dark:block" />
    </div>
  );
};

const campo = 'w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface text-darkText dark:text-darkTextPrimary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition';
const campoSimples = 'w-full px-3.5 py-3 rounded-xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface text-darkText dark:text-darkTextPrimary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition';
const rotulo = 'block text-sm font-semibold text-darkText dark:text-darkTextPrimary mb-1.5';

const Login: React.FC<{ onCriar: () => void }> = ({ onCriar }) => {
  const navigate = useNavigate();
  const { entrarUnico } = useData();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [ajudaSenha, setAjudaSenha] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!/\S+@\S+\.\S+/.test(email)) { setErro('Informe um e-mail válido.'); return; }
    if (!senha) { setErro('Informe a senha.'); return; }
    setCarregando(true);
    try {
      const r = await entrarUnico(email, senha);
      if (r.destino) navigate(r.destino, { replace: true });
      else setErro(r.erro || 'E-mail ou senha incorretos.');
    } finally { setCarregando(false); }
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-darkText dark:text-darkTextPrimary">Ei! É bom te ver aqui ;)</h1>
      <p className="mt-1.5 text-lightText dark:text-darkTextSecondary">Faça login para acessar o sistema</p>
      <hr className="my-7 border-gray-200 dark:border-darkBorder" />

      <form onSubmit={enviar} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className={rotulo}>E-mail</label>
          <div className="relative">
            <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lightText" />
            <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className={campo} />
          </div>
        </div>
        <div>
          <label htmlFor="senha" className={rotulo}>Senha</label>
          <div className="relative">
            <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lightText" />
            <input id="senha" type={verSenha ? 'text' : 'password'} autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" className={campo} />
            <button type="button" onClick={() => setVerSenha(v => !v)} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-lightText hover:text-primary">
              {verSenha ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={() => setAjudaSenha(v => !v)} className="text-sm font-semibold text-primary hover:underline">Esqueceu a senha?</button>
        </div>
        {ajudaSenha && (
          <p className="text-sm rounded-xl bg-primary/5 border border-primary/20 p-3 text-darkText dark:text-darkTextPrimary">
            Peça uma senha nova ao administrador da sua empresa. Em breve você poderá trocar por aqui, recebendo um link no e-mail.
          </p>
        )}

        {erro && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl p-3">
            <AlertCircle size={16} className="shrink-0" /> {erro}
          </div>
        )}

        <button type="submit" disabled={carregando} className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition disabled:opacity-60 flex items-center justify-center gap-2">
          {carregando && <Loader2 size={17} className="animate-spin" />} Entrar
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-lightText dark:text-darkTextSecondary">
        Sua empresa ainda não tem conta? <button onClick={onCriar} className="font-semibold text-primary hover:underline">Crie uma agora</button>
      </p>
    </>
  );
};

const PASSOS = ['Seus dados', 'Sua empresa', 'Sua equipe'];

const CriarConta: React.FC<{ onVoltar: () => void }> = ({ onVoltar }) => {
  const navigate = useNavigate();
  const { entrarUnico } = useData();
  const [passo, setPasso] = useState(0);
  const [d, setD] = useState({ nome: '', sobrenome: '', whatsapp: '', email: '', senha: '', confirmar: '', empresa: '', documento: '', cidade: '', tamanho_equipe: '', como_agenda: '' });
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const muda = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });

  const validar = (): string => {
    if (passo === 0) {
      if (!d.nome.trim()) return 'Informe seu nome.';
      if (d.whatsapp.replace(/\D/g, '').length < 10) return 'Informe o WhatsApp com DDD.';
      if (!/\S+@\S+\.\S+/.test(d.email)) return 'Informe um e-mail válido.';
      if (d.senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
      if (d.senha !== d.confirmar) return 'As senhas não conferem.';
    }
    if (passo === 1 && !d.empresa.trim()) return 'Informe o nome da empresa.';
    if (passo === 2 && !d.tamanho_equipe) return 'Escolha o tamanho da equipe.';
    return '';
  };

  const avancar = async () => {
    const e = validar();
    if (e) { setErro(e); return; }
    setErro('');
    if (passo < 2) { setPasso(passo + 1); return; }
    setEnviando(true);
    const { confirmar, ...dados } = d;
    const r = await criarEmpresa({ ...dados, email: d.email.trim().toLowerCase() });
    if (!r.ok) { setEnviando(false); setErro(r.erro || 'Não foi possível criar a conta agora. Tente de novo em instantes.'); return; }
    // Account ready: sign in and open the panel with the 14-day trial.
    const login = await entrarUnico(d.email, d.senha);
    setEnviando(false);
    if (login.destino) navigate(login.destino, { replace: true });
    else onVoltar();
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-darkText dark:text-darkTextPrimary">{PASSOS[passo]}</h1>
      <p className="mt-1.5 text-lightText dark:text-darkTextSecondary">
        {passo === 0 ? 'Quem vai usar o sistema' : passo === 1 ? 'Dados da sua empresa de limpeza' : 'Para deixar tudo pronto para você'}
      </p>

      <ol className="flex items-center gap-2 my-7" aria-label="Etapas">
        {PASSOS.map((p, i) => (
          <li key={p} className="flex items-center gap-2 flex-1 last:flex-none">
            <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              i === passo ? 'bg-primary text-white ring-4 ring-primary/20' : i < passo ? 'bg-primary/15 text-primary' : 'bg-gray-100 dark:bg-darkSurface text-lightText'
            }`}>{i + 1}</span>
            {i < PASSOS.length - 1 && <span className={`h-0.5 flex-1 rounded ${i < passo ? 'bg-primary/40' : 'bg-gray-200 dark:bg-darkBorder'}`} />}
          </li>
        ))}
      </ol>

      <div className="space-y-4">
        {passo === 0 && (<>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={rotulo} htmlFor="nome">Nome</label><input id="nome" value={d.nome} onChange={muda('nome')} placeholder="Maria" className={campoSimples} /></div>
            <div><label className={rotulo} htmlFor="sobrenome">Sobrenome</label><input id="sobrenome" value={d.sobrenome} onChange={muda('sobrenome')} placeholder="Silva" className={campoSimples} /></div>
          </div>
          <div><label className={rotulo} htmlFor="whats">WhatsApp</label><input id="whats" type="tel" inputMode="tel" value={d.whatsapp} onChange={muda('whatsapp')} placeholder="(27) 99999-9999" className={campoSimples} /></div>
          <div><label className={rotulo} htmlFor="mail">E-mail</label><input id="mail" type="email" autoComplete="email" value={d.email} onChange={muda('email')} placeholder="voce@suaempresa.com" className={campoSimples} /></div>
          <div>
            <label className={rotulo} htmlFor="nova-senha">Senha</label>
            <div className="relative">
              <input id="nova-senha" type={verSenha ? 'text' : 'password'} autoComplete="new-password" value={d.senha} onChange={muda('senha')} placeholder="••••••••" className={campoSimples + ' pr-10'} />
              <button type="button" onClick={() => setVerSenha(v => !v)} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-lightText hover:text-primary">
                {verSenha ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-lightText dark:text-darkTextSecondary">Mínimo de 8 caracteres. É a senha que você vai usar no sistema e no app.</p>
          </div>
          <div><label className={rotulo} htmlFor="confirmar">Confirmar senha</label><input id="confirmar" type={verSenha ? 'text' : 'password'} autoComplete="new-password" value={d.confirmar} onChange={muda('confirmar')} placeholder="••••••••" className={campoSimples} /></div>
        </>)}
        {passo === 1 && (<>
          <div><label className={rotulo} htmlFor="empresa">Nome da empresa</label><input id="empresa" value={d.empresa} onChange={muda('empresa')} placeholder="Ex.: Brilho Limpezas" className={campoSimples} /></div>
          <div><label className={rotulo} htmlFor="doc">CNPJ ou CPF</label><input id="doc" inputMode="numeric" value={d.documento} onChange={muda('documento')} placeholder="00.000.000/0001-00" className={campoSimples} /></div>
          <div><label className={rotulo} htmlFor="cidade">Cidade / UF</label><input id="cidade" value={d.cidade} onChange={muda('cidade')} placeholder="Guarapari / ES" className={campoSimples} /></div>
        </>)}
        {passo === 2 && (<>
          <div>
            <label className={rotulo} htmlFor="equipe">Quantas pessoas fazem as limpezas?</label>
            <select id="equipe" value={d.tamanho_equipe} onChange={muda('tamanho_equipe')} className={campoSimples}>
              <option value="">Escolha</option>
              <option>Só eu</option><option>2 a 3</option><option>4 a 8</option><option>9 a 20</option><option>Mais de 20</option>
            </select>
          </div>
          <div>
            <label className={rotulo} htmlFor="agenda">Como você organiza a agenda hoje?</label>
            <select id="agenda" value={d.como_agenda} onChange={muda('como_agenda')} className={campoSimples}>
              <option value="">Escolha</option>
              <option>Caderno ou WhatsApp</option><option>Planilha</option><option>Outro sistema</option>
            </select>
          </div>
        </>)}
      </div>

      {erro && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl p-3">
          <AlertCircle size={16} className="shrink-0" /> {erro}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button onClick={() => (passo === 0 ? onVoltar() : setPasso(passo - 1))} className="py-3 rounded-xl border border-gray-200 dark:border-darkBorder font-semibold text-darkText dark:text-darkTextPrimary hover:bg-gray-50 dark:hover:bg-darkSurface flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> {passo === 0 ? 'Login' : 'Voltar'}
        </button>
        <button onClick={avancar} disabled={enviando} className="py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2">
          {enviando ? <Loader2 size={16} className="animate-spin" /> : null}
          {passo < 2 ? 'Continuar' : 'Começar 14 dias grátis'} {passo < 2 && <ArrowRight size={16} />}
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-lightText dark:text-darkTextSecondary">
        Já tem uma conta? <button onClick={onVoltar} className="font-semibold text-primary hover:underline">Faça login</button>
      </p>
    </>
  );
};

export const EntrarPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const modoCriar = location.pathname === '/criar-conta';
  const [splash, setSplash] = useState(() => { try { return !sessionStorage.getItem(SPLASH_KEY); } catch { return false; } });

  // Already logged in: go straight to the right area (also fixes the installed app reopening here).
  useEffect(() => {
    if (localStorage.getItem('auth_admin') === 'true') navigate(localStorage.getItem('auth_reviewer') === 'true' ? '/admin/whatsapp' : '/admin/dashboard', { replace: true });
    else if (localStorage.getItem('auth_collab')) navigate('/collab/agenda', { replace: true });
    else if (localStorage.getItem('auth_client')) navigate('/client/dashboard', { replace: true });
  }, [navigate]);

  useEffect(() => { document.title = modoCriar ? 'Criar conta — Negócios de Limpeza' : 'Entrar — Negócios de Limpeza'; }, [modoCriar]);

  const fimSplash = React.useCallback(() => { try { sessionStorage.setItem(SPLASH_KEY, '1'); } catch {} setSplash(false); }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBg flex">
      <style>{`
        @keyframes ndl-logo-entra { 0% { opacity: 0; transform: scale(.85); clip-path: inset(0 62% 0 0); }
          40% { opacity: 1; transform: scale(1); clip-path: inset(0 62% 0 0); } 85% { clip-path: inset(0 0 0 0); } 100% { clip-path: inset(0 0 0 0); } }
        @keyframes ndl-splash-sai { 0%, 85% { opacity: 1; } 100% { opacity: 0; } }
        .ndl-splash-logo { animation: ndl-logo-entra 1.3s cubic-bezier(.2,.8,.2,1) both; }
        .ndl-splash-sai { animation: ndl-splash-sai 1.7s ease both; }
        @keyframes ndl-sobe { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .ndl-sobe { animation: ndl-sobe .5s ease both; }
        @media (prefers-reduced-motion: reduce) { .ndl-splash-logo, .ndl-splash-sai, .ndl-sobe { animation: none; } }
      `}</style>
      {splash && <Splash onFim={fimSplash} />}

      {/* Form side */}
      <div className="w-full lg:w-1/2 flex flex-col px-6 sm:px-10 py-8 min-h-screen">
        <img src="/img/logo-lilas.png" alt="Negócios de Limpeza" className="h-11 w-auto self-start dark:hidden" />
        <img src="/img/logo-bege.png" alt="Negócios de Limpeza" className="h-11 w-auto self-start hidden dark:block" />
        <div className="flex-1 flex items-center justify-center py-10">
          <div key={modoCriar ? 'criar' : 'entrar'} className="w-full max-w-md ndl-sobe">
            {modoCriar
              ? <CriarConta onVoltar={() => navigate('/')} />
              : <Login onCriar={() => navigate('/criar-conta')} />}
          </div>
        </div>
        <p className="text-xs text-lightText dark:text-darkTextSecondary">
          © {new Date().getFullYear()} Negócios de Limpeza · <a href="/sistema" className="hover:text-primary">Conheça o sistema</a> · <a href="/privacidade" className="hover:text-primary">Privacidade</a> · <a href="/termos" className="hover:text-primary">Termos</a>
        </p>
      </div>

      {/* Photo side (desktop) */}
      <div className="hidden lg:block lg:w-1/2 p-4">
        <div className="relative h-full rounded-3xl overflow-hidden">
          <img src="/img/foto-home.jpg" alt="Equipe da Negócios de Limpeza" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-6 text-white">
            <p className="text-2xl font-bold leading-snug" style={{ textWrap: 'balance' } as React.CSSProperties}>
              Agenda, equipe, cobranças e WhatsApp em um só lugar.
            </p>
            <p className="mt-2 text-sm text-white/85">Feito por quem vive a rotina de uma empresa de limpeza, em Guarapari/ES.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
