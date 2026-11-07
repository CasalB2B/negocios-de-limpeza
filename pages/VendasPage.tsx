import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PLANOS, mensalNoAnual } from '../supabase/functions/_shared/planos';
import {
  ArrowRight, Check, CalendarDays, Smartphone, MessageCircle, Wallet, Users, Sparkles, MapPin, ClipboardList,
  NotebookPen, PhoneOff, Calculator, UserX, ChevronDown, Menu, X, FileText, Star,
} from 'lucide-react';

// Sales page of the platform (inspired by AgencyFlow): features with real screenshots from the demo company,
// how it works, plans, the Negócios de Limpeza case, FAQ. "Entrar" and "Testar grátis" go to the app.

const IMG = '/img/sistema';

// Pain points of a cleaning-business owner whose team grew beyond what a notebook and WhatsApp can hold.
const DORES = [
  { icon: Users, titulo: 'Equipe de 5, 10 pessoas e ninguém sabe direito onde ir', texto: 'Quem vai em qual casa, que horas, qual endereço, quem cobre a falta. Tudo isso passando por áudio e print de conversa.' },
  { icon: Calculator, titulo: 'Faxina feita e cobrança esquecida', texto: 'Com muitas faxinas no mesmo dia, um sinal não cobrado, um restante que ficou para depois e um cliente que nunca pagou.' },
  { icon: NotebookPen, titulo: 'Caderno e WhatsApp não são um sistema', texto: 'A informação fica espalhada, só você sabe de tudo, e se o celular quebra ou você viaja a empresa para.' },
  { icon: Wallet, titulo: 'Sem saber quanto entra e quanto sai', texto: 'Quanto faturou no mês, quanto falta receber, quanto pagar para cada colaboradora: sem número, a decisão vira achismo.' },
  { icon: PhoneOff, titulo: 'Cliente que esquece e faxina perdida', texto: 'Sem lembrete na véspera, a colaboradora chega e não tem ninguém. É deslocamento pago e dia sem receita.' },
  { icon: UserX, titulo: 'Contratar e manter gente boa', texto: 'Candidatas, avaliações dos clientes e promoções em planilhas soltas. Você perde as melhores sem perceber.' },
];

const ANTES_DEPOIS: [string, string][] = [
  ['Agenda no caderno e em conversas de WhatsApp', 'Agenda da equipe inteira numa tela, por dia, semana ou pessoa'],
  ['Colaboradora pergunta o endereço toda vez', 'Ela abre o app, vê o serviço e toca no endereço para abrir o mapa'],
  ['Você lembra cada cliente na véspera, um por um', 'Lembrete automático no WhatsApp, saindo do seu número'],
  ['Pix cobrado na mão e conferido no extrato', 'Link de sinal enviado sozinho e baixa automática quando cai'],
  ['Faturamento só no fim do mês, se der tempo', 'Receita do mês e quanto falta receber na tela inicial'],
  ['Pagamento da equipe calculado na calculadora', 'Valor de cada faxina pela diária do cargo, já somado'],
];


const RECURSOS = [
  {
    eyebrow: 'Agenda', titulo: 'A semana inteira da equipe numa tela só',
    texto: 'Veja por mês, semana, equipe lado a lado ou uma colaboradora por vez. Agende em segundos, com cliente, serviço, endereço e quem vai.',
    itens: ['Visão por equipe e por pessoa', 'Pré-agendamento confirmado pelo sinal', 'Status do serviço em tempo real'],
    img: 'agenda-equipe.webp', alt: 'Agenda da equipe lado a lado',
  },
  {
    eyebrow: 'App da colaboradora', titulo: 'Cada colaboradora com a agenda no celular',
    texto: 'Ela vê os serviços do dia, abre o endereço no mapa, faz check-in e check-out, tira as fotos de antes e depois e sabe quanto vai receber.',
    itens: ['Check-in com localização', 'Fotos do serviço', 'Quanto vai receber, pela diária do cargo'],
    img: 'celular-pessoa.webp', alt: 'App da colaboradora no celular', celular: true,
  },
  {
    eyebrow: 'Ordens de serviço', titulo: 'Do pedido ao serviço concluído, sem perder nada',
    texto: 'Cada serviço anda pelas etapas: aguardando sinal, agendado, confirmado, em andamento e concluído. Cobre o sinal, o total ou o restante com um clique.',
    itens: ['Quadro por etapas', 'Link de pagamento na hora', 'Baixa automática quando o cliente paga'],
    img: 'ordens-servico.webp', alt: 'Quadro de ordens de serviço',
  },
  {
    eyebrow: 'Controle financeiro', titulo: 'Saiba quanto entrou e quanto falta receber',
    texto: 'A tela inicial mostra os serviços do dia, a receita do mês e o que ainda está para receber. Cada pagamento pela InfinitePay entra sozinho, e o assistente responde quanto você faturou e quem está devendo.',
    itens: ['Receita do mês e a receber', 'Pagamentos confirmados automaticamente', 'Quanto pagar para cada colaboradora'],
    img: 'painel.webp', alt: 'Painel com receita do mês e valores a receber',
  },
  {
    eyebrow: 'Clientes', titulo: 'Clientes fixos, eventuais e novos, organizados',
    texto: 'Histórico de cada cliente, endereços, frequência (semanal, quinzenal, mensal) e quem está sumido há meses para você chamar de volta.',
    itens: ['Tipo e frequência do cliente', 'Histórico de serviços', 'Clientes sumidos'],
    img: 'clientes.webp', alt: 'Lista de clientes',
  },
  {
    eyebrow: 'Equipe e RH', titulo: 'Contratação, avaliação e plano de carreira',
    texto: 'Processo seletivo com etapas, avaliações dos clientes, desempenho do mês, promoções e a tabela de diárias por cargo, tudo no mesmo lugar.',
    itens: ['Funil de contratação', 'Avaliações e desempenho', 'Remuneração por cargo'],
    img: 'equipe-rh.webp', alt: 'Equipe e RH',
  },
];

const MODULOS = [
  { icon: CalendarDays, nome: 'Agenda e ordens de serviço' },
  { icon: Smartphone, nome: 'App da colaboradora' },
  { icon: MessageCircle, nome: 'WhatsApp automático' },
  { icon: Wallet, nome: 'Cobrança de sinal e restante' },
  { icon: Users, nome: 'Clientes e retorno' },
  { icon: ClipboardList, nome: 'RH: contratação e carreira' },
  { icon: MapPin, nome: 'Mapa da equipe' },
  { icon: Sparkles, nome: 'Assistente com IA' },
  { icon: FileText, nome: 'Nota fiscal (adicional)' },
];

const FAQ = [
  { p: 'Preciso instalar alguma coisa?', r: 'Não. Funciona no navegador do computador e do celular, e também nos apps para Android e iPhone.' },
  { p: 'Como funciona o teste grátis?', r: 'São 14 dias com todas as funções liberadas, sem cartão. Você cria a conta, configura e usa com a sua equipe. No fim, escolhe o plano.' },
  { p: 'Minhas colaboradoras pagam alguma coisa?', r: 'Não. O acesso delas ao app está incluído no plano da sua empresa.' },
  { p: 'O WhatsApp continua no meu celular?', r: 'Sim. As mensagens automáticas (confirmação, lembrete da véspera, pós-serviço) saem do seu próprio número, e você continua usando o WhatsApp Business normalmente.' },
  { p: 'Quanto custa o WhatsApp?', r: 'A Meta cobra direto no seu cartão só o que for enviado: centavos por lembrete. As respostas dentro de 24 horas são grátis.' },
  { p: 'Meus dados ficam seguros?', r: 'Sim. Cada empresa só acessa os próprios dados, com login protegido. Nenhuma outra empresa vê seus clientes, sua equipe ou seu financeiro.' },
  { p: 'Emite nota fiscal?', r: 'Sim, com o adicional de Nota Fiscal (NFS-e), emitida com o CNPJ e o certificado da sua empresa.' },
  { p: 'Posso cancelar quando quiser?', r: 'Sim. No plano mensal não tem fidelidade nem multa.' },
];

const preco = (v: number) => v.toLocaleString('pt-BR');

const Navegador: React.FC<{ src: string; alt: string }> = ({ src, alt }) => (
  <div className="rounded-2xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface shadow-2xl shadow-primary/10 overflow-hidden">
    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 dark:border-darkBorder bg-gray-50 dark:bg-darkBg">
      <span className="w-2.5 h-2.5 rounded-full bg-red-300" /><span className="w-2.5 h-2.5 rounded-full bg-amber-300" /><span className="w-2.5 h-2.5 rounded-full bg-green-300" />
      <span className="ml-3 text-[11px] text-lightText truncate">app.negociosdelimpeza.com.br</span>
    </div>
    <img src={`${IMG}/${src}`} alt={alt} loading="lazy" className="w-full h-auto block" />
  </div>
);

const Celular: React.FC<{ src: string; alt: string }> = ({ src, alt }) => (
  <div className="mx-auto w-[260px] max-w-full rounded-[2.5rem] border-[10px] border-gray-900 bg-gray-900 shadow-2xl shadow-primary/20 overflow-hidden">
    <img src={`${IMG}/${src}`} alt={alt} loading="lazy" className="w-full h-auto block rounded-[1.6rem]" />
  </div>
);

export const VendasPage: React.FC = () => {
  const [anual, setAnual] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    document.title = 'Sistema para empresas de limpeza — Negócios de Limpeza';
    window.scrollTo(0, 0);
  }, []);

  const irPara = (id: string) => { setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };
  const botaoTeste = 'inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold px-6 py-3.5 shadow-lg shadow-primary/30 transition';

  return (
    <div className="min-h-screen bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-darkBg/85 backdrop-blur border-b border-gray-100 dark:border-darkBorder" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
          <Link to="/sistema" className="shrink-0">
            <img src="/img/logo-lilas.png" alt="Negócios de Limpeza" className="h-9 w-auto dark:hidden" />
            <img src="/img/logo-bege.png" alt="Negócios de Limpeza" className="h-9 w-auto hidden dark:block" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-lightText dark:text-darkTextSecondary">
            <button onClick={() => irPara('recursos')} className="hover:text-primary">Recursos</button>
            <button onClick={() => irPara('como-funciona')} className="hover:text-primary">Como funciona</button>
            <button onClick={() => irPara('precos')} className="hover:text-primary">Preços</button>
            <button onClick={() => irPara('perguntas')} className="hover:text-primary">Perguntas</button>
          </nav>
          <div className="ml-auto hidden md:flex items-center gap-3">
            <Link to="/" className="text-sm font-bold text-darkText dark:text-darkTextPrimary hover:text-primary px-3 py-2">Entrar</Link>
            <Link to="/criar-conta" className="rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 py-2.5">Testar grátis</Link>
          </div>
          <button onClick={() => setMenu(m => !m)} className="ml-auto md:hidden p-2" aria-label="Menu">{menu ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
        {menu && (
          <div className="md:hidden border-t border-gray-100 dark:border-darkBorder px-4 py-3 space-y-1 bg-white dark:bg-darkBg">
            {[['recursos', 'Recursos'], ['como-funciona', 'Como funciona'], ['precos', 'Preços'], ['perguntas', 'Perguntas']].map(([id, r]) => (
              <button key={id} onClick={() => irPara(id)} className="block w-full text-left py-2 font-semibold">{r}</button>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link to="/" className="text-center rounded-xl border border-gray-200 dark:border-darkBorder py-2.5 font-bold">Entrar</Link>
              <Link to="/criar-conta" className="text-center rounded-xl bg-primary text-white py-2.5 font-bold">Testar grátis</Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 -top-40 h-[520px] bg-gradient-to-b from-primary/15 to-transparent pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 md:pt-24 pb-10 text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider px-3 py-1.5">
            <Sparkles size={13} /> Sistema de gestão para empresas de limpeza
          </p>
          <h1 className="mt-5 text-4xl md:text-6xl font-bold leading-[1.08] max-w-4xl mx-auto" style={{ textWrap: 'balance' } as React.CSSProperties}>
            Agenda, equipe, cobranças e WhatsApp <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">em um só lugar</span>
          </h1>
          <p className="mt-5 text-lg text-lightText dark:text-darkTextSecondary max-w-2xl mx-auto">
            O sistema feito por quem vive a rotina de uma empresa de faxina. Organize a agenda, mande lembretes automáticos, cobre o sinal pelo link e acompanhe sua equipe pelo celular.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/criar-conta" className={botaoTeste}>Testar grátis por 14 dias <ArrowRight size={18} /></Link>
            <button onClick={() => irPara('recursos')} className="rounded-xl border border-gray-200 dark:border-darkBorder font-bold px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-darkSurface">Ver os recursos</button>
          </div>
          <p className="mt-3 text-xs text-lightText dark:text-darkTextSecondary">Sem cartão de crédito · Tudo liberado no teste · Cancele quando quiser</p>
          <div className="mt-12 md:mt-16 max-w-5xl mx-auto">
            <Navegador src="painel.webp" alt="Painel do sistema com serviços do dia, receita e mapa da equipe" />
          </div>
        </div>
      </section>

      {/* Pains */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <p className="text-center text-xs font-bold uppercase tracking-wider text-primary">Se a sua empresa cresceu, você conhece isso</p>
        <h2 className="mt-2 text-3xl md:text-4xl font-bold text-center max-w-3xl mx-auto" style={{ textWrap: 'balance' } as React.CSSProperties}>
          Com 5, 10 colaboradoras, o caderno e o WhatsApp não dão mais conta
        </h2>
        <p className="mt-4 text-center text-lightText dark:text-darkTextSecondary max-w-2xl mx-auto">
          No começo dá para lembrar de tudo de cabeça. Quando a equipe cresce, é aí que a agenda embola, a cobrança escapa e você passa o dia apagando incêndio em vez de fazer a empresa crescer.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DORES.map(({ icon: Icone, titulo, texto }) => (
            <div key={titulo} className="rounded-2xl border border-gray-100 dark:border-darkBorder bg-gray-50/60 dark:bg-darkSurface p-5">
              <Icone size={22} className="text-primary" />
              <h3 className="mt-3 font-bold">{titulo}</h3>
              <p className="mt-1.5 text-sm text-lightText dark:text-darkTextSecondary">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Before / after */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
        <h2 className="text-2xl md:text-3xl font-bold text-center" style={{ textWrap: 'balance' } as React.CSSProperties}>Da bagunça ao controle</h2>
        <div className="mt-8 rounded-2xl border border-gray-200 dark:border-darkBorder overflow-hidden">
          <div className="grid grid-cols-2 text-xs font-bold uppercase tracking-wider">
            <div className="px-4 py-3 bg-gray-100 dark:bg-darkSurface text-lightText">Sem sistema</div>
            <div className="px-4 py-3 bg-primary text-white">Com a Negócios de Limpeza</div>
          </div>
          {ANTES_DEPOIS.map(([antes, depois]) => (
            <div key={antes} className="grid grid-cols-2 border-t border-gray-100 dark:border-darkBorder text-sm">
              <div className="px-4 py-3.5 text-lightText dark:text-darkTextSecondary flex gap-2"><X size={15} className="text-red-400 shrink-0 mt-0.5" /> {antes}</div>
              <div className="px-4 py-3.5 bg-primary/5 font-semibold flex gap-2"><Check size={15} className="text-primary shrink-0 mt-0.5" /> {depois}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/criar-conta" className={botaoTeste}>Quero organizar minha empresa <ArrowRight size={18} /></Link>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="bg-gray-50 dark:bg-darkSurface/40 py-16 md:py-24 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-20 md:space-y-28">
          {RECURSOS.map((r, i) => (
            <div key={r.titulo} className={`grid md:grid-cols-2 gap-10 md:gap-14 items-center ${i % 2 ? 'md:[&>*:first-child]:order-2' : ''}`}>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">{r.eyebrow}</p>
                <h3 className="mt-2 text-2xl md:text-3xl font-bold" style={{ textWrap: 'balance' } as React.CSSProperties}>{r.titulo}</h3>
                <p className="mt-3 text-lightText dark:text-darkTextSecondary">{r.texto}</p>
                <ul className="mt-5 space-y-2">
                  {r.itens.map(it => (
                    <li key={it} className="flex items-center gap-2.5 text-sm font-semibold"><Check size={16} className="text-primary shrink-0" /> {it}</li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0">{r.celular ? <Celular src={r.img} alt={r.alt} /> : <Navegador src={r.img} alt={r.alt} />}</div>
            </div>
          ))}

          {/* WhatsApp + payments + AI (no screenshot) */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: MessageCircle, t: 'WhatsApp automático', d: 'Confirmação do agendamento, lembrete na véspera com o nome da colaboradora e mensagem de pós-serviço, saindo do seu número.' },
              { icon: Wallet, t: 'Sinal de 50% pelo link', d: 'O sistema manda o link de pagamento, lembra quem não pagou, confirma sozinho quando cai e cobra o restante depois da faxina.' },
              { icon: Sparkles, t: 'Assistente com IA', d: 'Pergunte "quanto tenho a receber este mês?" ou "quem mais deu retorno?" e receba a resposta com os números da sua empresa.' },
            ].map(({ icon: Icone, t, d }) => (
              <div key={t} className="rounded-2xl bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder p-6">
                <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icone size={20} /></span>
                <h3 className="mt-4 font-bold text-lg">{t}</h3>
                <p className="mt-1.5 text-sm text-lightText dark:text-darkTextSecondary">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold">Tudo o que sua empresa precisa</h2>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-3 text-left">
          {MODULOS.map(({ icon: Icone, nome }) => (
            <div key={nome} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-darkBorder p-4">
              <Icone size={19} className="text-primary shrink-0" /> <span className="font-semibold text-sm">{nome}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="bg-gray-50 dark:bg-darkSurface/40 py-16 md:py-24 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center">Comece hoje, em 4 passos</h2>
          <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ['Crie sua conta', 'Nome, empresa e senha. Em um minuto você está dentro, com 14 dias grátis.'],
              ['Conecte o WhatsApp', 'Os lembretes e confirmações passam a sair do seu número.'],
              ['Cadastre serviços e equipe', 'Preços, colaboradoras e o acesso de cada uma ao app.'],
              ['Agende e acompanhe', 'O sistema confirma, lembra, cobra e mostra tudo no painel.'],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-2xl bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder p-6">
                <span className="w-9 h-9 rounded-full bg-primary text-white font-bold flex items-center justify-center">{i + 1}</span>
                <h3 className="mt-4 font-bold">{t}</h3>
                <p className="mt-1.5 text-sm text-lightText dark:text-darkTextSecondary">{d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-center text-sm text-lightText dark:text-darkTextSecondary">O assistente com IA guia você em cada passo dentro do sistema.</p>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 scroll-mt-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center">Planos que crescem com a sua equipe</h2>
        <p className="mt-3 text-center text-lightText dark:text-darkTextSecondary">Todos com 14 dias grátis e todas as funções liberadas no teste.</p>
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-darkSurface p-1 text-sm font-bold">
            <button onClick={() => setAnual(false)} className={`px-4 py-2 rounded-lg ${!anual ? 'bg-white dark:bg-darkBg shadow text-primary' : 'text-lightText'}`}>Mensal</button>
            <button onClick={() => setAnual(true)} className={`px-4 py-2 rounded-lg ${anual ? 'bg-white dark:bg-darkBg shadow text-primary' : 'text-lightText'}`}>Anual <span className="text-green-600">−15%</span></button>
          </div>
        </div>
        <div className="mt-10 grid md:grid-cols-3 gap-5 items-stretch">
          {PLANOS.map(p => {
            const valor = anual ? mensalNoAnual(p) : p.mensal;
            return (
              <div key={p.id} className={`relative rounded-2xl p-6 flex flex-col ${p.destaque ? 'border-2 border-primary shadow-xl shadow-primary/15' : 'border border-gray-200 dark:border-darkBorder'}`}>
                {p.destaque && <span className="absolute -top-3 left-6 rounded-full bg-primary text-white text-xs font-bold px-3 py-1">Mais escolhido</span>}
                <h3 className="text-lg font-bold">{p.nome}</h3>
                <p className="text-sm text-lightText dark:text-darkTextSecondary">{p.para}</p>
                <p className="mt-5"><span className="text-4xl font-bold tabular-nums">R$ {preco(valor)}</span><span className="text-lightText">/mês</span></p>
                <p className="text-xs text-lightText dark:text-darkTextSecondary h-4">{anual ? `R$ ${preco(valor * 12)} por ano` : ''}</p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {p.itens.map(it => <li key={it} className="flex gap-2.5 text-sm"><Check size={16} className="text-primary shrink-0 mt-0.5" /> {it}</li>)}
                </ul>
                <Link to="/criar-conta" className={`mt-6 text-center rounded-xl font-bold py-3 ${p.destaque ? 'bg-primary hover:bg-primary-hover text-white' : 'border border-gray-200 dark:border-darkBorder hover:border-primary hover:text-primary'}`}>Testar grátis por 14 dias</Link>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-lightText dark:text-darkTextSecondary">
          Adicionais: Nota fiscal (NFS-e) · Atendimento automático no WhatsApp com IA · Pacotes extras de lembretes. As mensagens do WhatsApp são cobradas pela Meta direto no seu cartão.
        </p>
      </section>

      {/* Case */}
      <section className="bg-gray-50 dark:bg-darkSurface/40 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-10 items-center">
          <img src="/img/foto-home.jpg" alt="Equipe da Negócios de Limpeza" loading="lazy" className="w-full max-w-full rounded-3xl object-cover aspect-[4/5]" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Quem fez o sistema</p>
            <h2 className="mt-2 text-3xl font-bold" style={{ textWrap: 'balance' } as React.CSSProperties}>Nasceu dentro de uma empresa de limpeza de verdade</h2>
            <p className="mt-4 text-lightText dark:text-darkTextSecondary">
              A Negócios de Limpeza atende Guarapari/ES e usa este sistema todos os dias para organizar a equipe, confirmar as faxinas e receber dos clientes. Cada função existe porque resolveu um problema real da nossa rotina.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex text-amber-400">{[0, 1, 2, 3, 4].map(i => <Star key={i} size={18} fill="currentColor" />)}</div>
              <span className="text-sm font-semibold">Mais de 600 clientes atendidos</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="perguntas" className="max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-24 scroll-mt-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center">Perguntas frequentes</h2>
        <div className="mt-10 divide-y divide-gray-100 dark:divide-darkBorder border-y border-gray-100 dark:border-darkBorder">
          {FAQ.map(f => (
            <details key={f.p} className="group py-4">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold">
                {f.p} <ChevronDown size={18} className="shrink-0 text-lightText transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-lightText dark:text-darkTextSecondary">{f.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 sm:px-6 pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-primary to-secondary text-white px-6 py-12 md:py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold" style={{ textWrap: 'balance' } as React.CSSProperties}>Organize sua empresa de limpeza a partir de hoje</h2>
          <p className="mt-3 text-white/85">14 dias grátis, com tudo liberado. Sem cartão.</p>
          <Link to="/criar-conta" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white text-primary font-bold px-6 py-3.5 hover:bg-white/90">Criar minha conta <ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 dark:border-darkBorder">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-4 items-center justify-between text-sm text-lightText dark:text-darkTextSecondary">
          <img src="/img/logo-lilas.png" alt="Negócios de Limpeza" className="h-8 w-auto dark:hidden" />
          <img src="/img/logo-bege.png" alt="Negócios de Limpeza" className="h-8 w-auto hidden dark:block" />
          <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center">
            <a href="/ajuda" className="hover:text-primary">Central de Ajuda</a>
            <a href="/privacidade" className="hover:text-primary">Privacidade</a>
            <a href="/termos" className="hover:text-primary">Termos</a>
            <Link to="/" className="hover:text-primary">Entrar</Link>
          </div>
          <span>© {new Date().getFullYear()} Negócios de Limpeza</span>
        </div>
      </footer>
    </div>
  );
};
