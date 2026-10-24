import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { FileText, Info, CheckCircle, Settings, Mail, History, BarChart2, Zap } from 'lucide-react';

const PROVIDERS = [
  { id: 'nfe_io', label: 'NFe.io', desc: 'Plataforma brasileira especializada em NFS-e para múltiplas prefeituras' },
  { id: 'enotas', label: 'eNotas', desc: 'Emissão automática de NFS-e com API simples e suporte a +700 municípios' },
  { id: 'focus', label: 'Focus NFe', desc: 'API REST para NF-e, NFS-e e NFC-e com sandbox para testes' },
];

const FEATURES = [
  { icon: <Zap size={18} className="text-purple-500" />, title: 'Emissão automática', desc: 'Ao concluir um serviço, a nota é emitida automaticamente e enviada ao cliente' },
  { icon: <Mail size={18} className="text-blue-500" />, title: 'Envio por e-mail', desc: 'A nota fiscal é enviada automaticamente para o e-mail do cliente' },
  { icon: <History size={18} className="text-emerald-500" />, title: 'Histórico completo', desc: 'Consulte todas as notas emitidas com filtros por período e cliente' },
  { icon: <BarChart2 size={18} className="text-amber-500" />, title: 'Relatórios fiscais', desc: 'Relatórios de faturamento por período para declaração e contabilidade' },
];

export const AdminNFe: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState('nfe_io');

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nota Fiscal</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Emissão de NFS-e · Fase 5</p>
            </div>
          </div>
          <button disabled className="flex items-center gap-2 bg-purple-600 opacity-50 cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl">
            <FileText size={16} /> Emitir NF-e
          </button>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-6 flex gap-3">
          <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-0.5">Em implementação</p>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Esta funcionalidade requer integração com o sistema da prefeitura de Guarapari, ES.
              Escolha um provedor abaixo para configurar a integração quando disponível.
            </p>
          </div>
        </div>

        {/* Provider selection */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Provedor de NFS-e</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Escolha o serviço para emissão de nota fiscal de serviço eletrônica</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">Não configurado</span>
          </div>

          <div className="space-y-3 mb-5">
            {PROVIDERS.map(p => (
              <label
                key={p.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedProvider === p.id
                    ? 'border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value={p.id}
                  checked={selectedProvider === p.id}
                  onChange={() => setSelectedProvider(p.id)}
                  className="mt-0.5 accent-purple-600"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{p.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <button
            disabled
            className="w-full flex items-center justify-center gap-2 bg-purple-600 opacity-50 cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-xl"
          >
            <Settings size={16} /> Configurar integração (em breve)
          </button>
        </div>

        {/* What you'll be able to do */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">O que você poderá fazer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{f.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">O que você vai precisar</h2>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2"><CheckCircle size={16} className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" /><span>Certificado Digital A1 ou A3 (NFS-e)</span></li>
            <li className="flex items-start gap-2"><CheckCircle size={16} className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" /><span>CNPJ ativo e inscrito no cadastro de prestadores da Prefeitura de Guarapari</span></li>
            <li className="flex items-start gap-2"><CheckCircle size={16} className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" /><span>Conta no provedor escolhido (NFe.io, eNotas ou Focus NFe)</span></li>
            <li className="flex items-start gap-2"><CheckCircle size={16} className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" /><span>Código de serviço CNAE para limpeza residencial</span></li>
          </ul>
        </div>

        {/* Empty notes list */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 shadow-sm text-center">
          <FileText size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma nota fiscal emitida</p>
          <p className="text-sm text-gray-400 mt-1">Configure a integração para começar a emitir notas automaticamente</p>
        </div>
      </div>
    </Layout>
  );
};
