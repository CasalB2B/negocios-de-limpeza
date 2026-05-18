import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../../components/Layout';
import { UserRole, CargoRH } from '../../../types';
import { useRH } from '../../../components/RHContext';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Users, TrendingUp, Star, AlertTriangle, ChevronRight, Award, UserCheck } from 'lucide-react';

const CARGO_LABEL: Record<CargoRH, string> = {
  JUNIOR: 'Auxiliar de Limpeza', SENIOR: 'Faxineira', PROFISSIONAL: 'Faxineira Profissional', LIDER: 'Líder de Equipe', GERENTE: 'Gerente de Equipe',
};

const MESES_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export const AdminRHDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { colaboradoras, desempenhoMensal, getElegibilidade, getMesesNaEmpresa, rhLoading } = useRH();

  const ativas = useMemo(() => colaboradoras.filter(c => c.status === 'ATIVA'), [colaboradoras]);

  const distribuicao = useMemo(() => {
    const counts: Record<string, number> = { JUNIOR: 0, PROFISSIONAL: 0, LIDER: 0, GERENTE: 0 };
    ativas.forEach(c => counts[c.cargoAtual] = (counts[c.cargoAtual] || 0) + 1);
    return Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => ({ cargo: CARGO_LABEL[k as CargoRH], qtd: v }));
  }, [ativas]);

  const now = new Date();
  const mesAtual = now.getMonth() + 1;
  const anoAtual = now.getFullYear();

  const desempenhoMesAtual = useMemo(() =>
    desempenhoMensal.filter(d => d.mes === mesAtual && d.ano === anoAtual), [desempenhoMensal, mesAtual, anoAtual]);

  const mediaAvaliacaoMes = useMemo(() => {
    if (!desempenhoMesAtual.length) return null;
    const soma = desempenhoMesAtual.reduce((a, b) => a + b.mediaAvaliacao, 0);
    return soma / desempenhoMesAtual.length;
  }, [desempenhoMesAtual]);

  const elegiveis = useMemo(() =>
    ativas.filter(c => getElegibilidade(c) === 'GREEN'), [ativas, getElegibilidade]);

  const quaseElegiveis = useMemo(() =>
    ativas.filter(c => getElegibilidade(c) === 'YELLOW'), [ativas, getElegibilidade]);

  // Alertas: colaboradoras com 3+ meses consecutivos com avaliação < 4.0
  const alertasBaixaAvaliacao = useMemo(() => {
    return ativas.filter(col => {
      const registros: number[] = [];
      for (let i = 1; i <= 3; i++) {
        const d = new Date(now); d.setMonth(d.getMonth() - i);
        const reg = desempenhoMensal.find(r => r.colaboradoraId === col.id && r.mes === d.getMonth() + 1 && r.ano === d.getFullYear());
        if (reg) registros.push(reg.mediaAvaliacao);
      }
      return registros.length >= 3 && registros.every(v => v < 4.0);
    });
  }, [ativas, desempenhoMensal]);

  // Gráfico de avaliações mensais (últimos 6 meses) — todas as colaboradoras
  const chartAvaliacoes = useMemo(() => {
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i);
      const mes = d.getMonth() + 1; const ano = d.getFullYear();
      const entry: Record<string, any> = { label: MESES_ABBR[mes - 1] };
      ativas.forEach(col => {
        const reg = desempenhoMensal.find(r => r.colaboradoraId === col.id && r.mes === mes && r.ano === ano);
        if (reg) entry[col.nome] = reg.mediaAvaliacao;
      });
      meses.push(entry);
    }
    return meses;
  }, [ativas, desempenhoMensal]);

  // Gráfico de faxinas da equipe por mês (últimos 6 meses)
  const chartFaxinas = useMemo(() => {
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i);
      const mes = d.getMonth() + 1; const ano = d.getFullYear();
      const total = desempenhoMensal.filter(r => r.mes === mes && r.ano === ano).reduce((a, b) => a + b.totalFaxinas, 0);
      meses.push({ label: MESES_ABBR[mes - 1], faxinas: total });
    }
    return meses;
  }, [desempenhoMensal]);

  const CHART_COLORS = ['#a163ff','#EC4899','#22c55e','#f59e0b','#3b82f6','#ef4444'];

  if (rhLoading) {
    return (
      <Layout role={UserRole.ADMIN}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">Recursos Humanos</h1>
          <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1">Gestão de carreira e desempenho da equipe</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Users size={20} />} label="Colaboradoras Ativas" value={String(ativas.length)} color="primary" />
          <StatCard
            icon={<Star size={20} />}
            label="Média Avaliação"
            value={mediaAvaliacaoMes != null ? mediaAvaliacaoMes.toFixed(1) : '—'}
            sub={mediaAvaliacaoMes != null ? 'este mês' : 'sem dados'}
            color="secondary"
          />
          <StatCard icon={<Award size={20} />} label="Elegíveis p/ Promoção" value={String(elegiveis.length)} color="green" onClick={() => navigate('/admin/rh/colaboradoras')} />
          <StatCard icon={<TrendingUp size={20} />} label="Quase Elegíveis" value={String(quaseElegiveis.length)} color="yellow" />
        </div>

        {/* Alertas */}
        {alertasBaixaAvaliacao.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-700 dark:text-red-400 text-sm">Atenção: Desempenho Baixo</p>
              <p className="text-red-600 dark:text-red-300 text-xs mt-1">
                {alertasBaixaAvaliacao.map(c => c.nome).join(', ')} {alertasBaixaAvaliacao.length === 1 ? 'está' : 'estão'} com avaliação abaixo de 4.0 por 3 meses consecutivos.
              </p>
            </div>
          </div>
        )}

        {/* Elegíveis para promoção */}
        {elegiveis.length > 0 && (
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2">
                <UserCheck size={18} className="text-green-500" /> Elegíveis para Promoção
              </h2>
              <button onClick={() => navigate('/admin/rh/promocoes')} className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                Registrar promoção <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {elegiveis.map(col => (
                <div key={col.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-700 dark:text-green-300 font-bold text-sm overflow-hidden">
                      {col.foto ? <img src={col.foto} alt={col.nome} className="w-full h-full object-cover" /> : col.nome[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{col.nome}</p>
                      <p className="text-xs text-lightText dark:text-darkTextSecondary">{CARGO_LABEL[col.cargoAtual]} · {getMesesNaEmpresa(col.dataAdmissao)} meses</p>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-200 dark:ring-green-700 inline-block" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Avaliações mensais */}
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5">
            <h2 className="font-bold text-darkText dark:text-darkTextPrimary text-sm mb-4">Avaliações por Colaboradora (6 meses)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartAvaliacoes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[3, 5]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                {ativas.map((col, i) => (
                  <Line key={col.id} type="monotone" dataKey={col.nome} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Faxinas por mês */}
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5">
            <h2 className="font-bold text-darkText dark:text-darkTextPrimary text-sm mb-4">Faxinas da Equipe por Mês</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartFaxinas}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="faxinas" fill="#a163ff" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição por cargo */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5">
          <h2 className="font-bold text-darkText dark:text-darkTextPrimary text-sm mb-4">Distribuição por Cargo</h2>
          <div className="flex flex-wrap gap-3">
            {distribuicao.map(({ cargo, qtd }) => (
              <div key={cargo} className="flex items-center gap-2 bg-gray-50 dark:bg-darkBg px-4 py-3 rounded-xl border border-gray-100 dark:border-darkBorder">
                <span className="font-bold text-2xl text-darkText dark:text-darkTextPrimary">{qtd}</span>
                <span className="text-sm text-lightText dark:text-darkTextSecondary">{cargo}</span>
              </div>
            ))}
            {distribuicao.length === 0 && <p className="text-sm text-lightText dark:text-darkTextSecondary">Nenhuma colaboradora ativa.</p>}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Colaboradoras', path: '/admin/rh/colaboradoras', icon: <Users size={18}/> },
            { label: 'Desempenho', path: '/admin/rh/desempenho', icon: <TrendingUp size={18}/> },
            { label: 'Bônus', path: '/admin/rh/bonus', icon: <Star size={18}/> },
            { label: 'Promoções', path: '/admin/rh/promocoes', icon: <Award size={18}/> },
          ].map(item => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="flex items-center gap-2 p-4 bg-white dark:bg-darkSurface rounded-xl border border-gray-100 dark:border-darkBorder hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-bold text-darkText dark:text-darkTextPrimary">
              <span className="text-primary">{item.icon}</span>
              {item.label}
              <ChevronRight size={14} className="ml-auto text-lightText" />
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
};

// ─── Sub-component ─────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: 'primary' | 'secondary' | 'green' | 'yellow';
  onClick?: () => void;
}

const COLOR_MAP = {
  primary:   { bg: 'bg-primary/10',   icon: 'text-primary',   ring: '' },
  secondary: { bg: 'bg-secondary/10', icon: 'text-secondary', ring: '' },
  green:     { bg: 'bg-green-50 dark:bg-green-900/20',   icon: 'text-green-600',  ring: '' },
  yellow:    { bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: 'text-yellow-600', ring: '' },
};

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sub, color, onClick }) => {
  const c = COLOR_MAP[color];
  return (
    <div onClick={onClick} className={`bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-4 ${onClick ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''}`}>
      <div className={`w-9 h-9 rounded-xl ${c.bg} ${c.icon} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">{value}</p>
      <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-lightText/70 dark:text-darkTextSecondary/70 mt-0.5">{sub}</p>}
    </div>
  );
};
