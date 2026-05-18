import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { MessageSquare, Kanban, Inbox, MessageCircle, BarChart2, ArrowRight } from 'lucide-react';

const ITEMS = [
  {
    icon: <MessageSquare size={28} className="text-primary" />,
    label: 'Orçamentos',
    desc: 'Gerencie propostas e orçamentos enviados aos clientes.',
    path: '/admin/quotes',
    color: 'bg-primary/10',
  },
  {
    icon: <Kanban size={28} className="text-purple-500" />,
    label: 'CRM / Leads',
    desc: 'Pipeline de leads, campanhas e histórico de relacionamento.',
    path: '/admin/crm',
    color: 'bg-purple-500/10',
  },
  {
    icon: <Inbox size={28} className="text-blue-500" />,
    label: 'Conversas',
    desc: 'Central de mensagens e atendimento ao cliente.',
    path: '/admin/inbox',
    color: 'bg-blue-500/10',
  },
  {
    icon: <MessageCircle size={28} className="text-green-500" />,
    label: 'WhatsApp',
    desc: 'Gerencie mensagens e automações do WhatsApp.',
    path: '/admin/whatsapp',
    color: 'bg-green-500/10',
  },
  {
    icon: <BarChart2 size={28} className="text-orange-500" />,
    label: 'Analytics',
    desc: 'Relatórios e métricas de desempenho do negócio.',
    path: '/admin/analytics',
    color: 'bg-orange-500/10',
  },
];

export const AdminMarketing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">Marketing</h1>
          <p className="text-sm text-lightText dark:text-darkTextSecondary mt-0.5">
            Ferramentas de vendas, relacionamento e análise do negócio.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ITEMS.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5 text-left hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center mb-4`}>
                {item.icon}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-darkText dark:text-darkTextPrimary text-base">{item.label}</p>
                  <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1 leading-relaxed">{item.desc}</p>
                </div>
                <ArrowRight size={18} className="text-lightText shrink-0 mt-1 group-hover:text-primary transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
};
