import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../../components/Layout';
import { UserRole } from '../../../types';
import { Button } from '../../../components/Button';
import { FileText, Upload, Download, Trash2, Save, CheckCircle, BookOpen } from 'lucide-react';

const LS_KEY_NOTAS  = 'rh_plano_carreira_notas';
const LS_KEY_ARQUIVO = 'rh_plano_carreira_arquivo';
const LS_KEY_NOME   = 'rh_plano_carreira_arquivo_nome';

export const AdminRHPlanoCarreira: React.FC = () => {
  const [notas, setNotas]       = useState('');
  const [arquivo, setArquivo]   = useState('');  // base64
  const [arquivoNome, setArquivoNome] = useState('');
  const [saved, setSaved]       = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega do localStorage na montagem
  useEffect(() => {
    setNotas(localStorage.getItem(LS_KEY_NOTAS) || '');
    setArquivo(localStorage.getItem(LS_KEY_ARQUIVO) || '');
    setArquivoNome(localStorage.getItem(LS_KEY_NOME) || '');
  }, []);

  // Auto-save 2s após parar de digitar
  useEffect(() => {
    if (!autoSave) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      salvar(notas, arquivo, arquivoNome);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [notas, autoSave]);

  const salvar = (n = notas, a = arquivo, an = arquivoNome) => {
    localStorage.setItem(LS_KEY_NOTAS, n);
    localStorage.setItem(LS_KEY_ARQUIVO, a);
    localStorage.setItem(LS_KEY_NOME, an);
  };

  const handleSalvar = () => {
    salvar();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setArquivo(url);
      setArquivoNome(file.name);
      salvar(notas, url, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoverArquivo = () => {
    setArquivo('');
    setArquivoNome('');
    salvar(notas, '', '');
  };

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">Plano de Carreira</h1>
            <p className="text-sm text-lightText dark:text-darkTextSecondary mt-0.5">
              Documento central de carreira — anexe o arquivo e escreva suas notas aqui.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-1.5 text-xs text-lightText dark:text-darkTextSecondary cursor-pointer select-none">
              <input type="checkbox" checked={autoSave} onChange={e => setAutoSave(e.target.checked)}
                className="w-3.5 h-3.5 accent-primary" />
              Auto-salvar
            </label>
            <Button onClick={handleSalvar} icon={saved ? <CheckCircle size={16}/> : <Save size={16}/>}
              variant={saved ? 'outline' : 'primary'}>
              {saved ? 'Salvo!' : 'Salvar'}
            </Button>
          </div>
        </div>

        {saved && !autoSave && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-green-700 dark:text-green-400 text-sm font-bold">
            <CheckCircle size={16}/> Alterações salvas com sucesso!
          </div>
        )}

        {/* Arquivo */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <h2 className="font-bold text-darkText dark:text-darkTextPrimary text-sm">Documento anexado</h2>
          </div>

          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />

          {arquivo ? (
            <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
              <FileText size={24} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary truncate">{arquivoNome}</p>
                <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5">Clique em Baixar para visualizar</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <a href={arquivo} download={arquivoNome}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors">
                  <Download size={13}/> Baixar
                </a>
                <button onClick={handleRemoverArquivo}
                  className="flex items-center gap-1.5 px-3 py-2 border border-red-200 dark:border-red-800 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={13}/> Remover
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-darkBorder rounded-xl py-8 hover:border-primary hover:bg-primary/5 transition-colors group">
              <Upload size={24} className="text-lightText dark:text-darkTextSecondary group-hover:text-primary transition-colors" />
              <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Clique para fazer upload</p>
              <p className="text-xs text-lightText dark:text-darkTextSecondary">PDF, Word ou TXT</p>
            </button>
          )}
        </div>

        {/* Bloco de notas */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            <h2 className="font-bold text-darkText dark:text-darkTextPrimary text-sm">Notas & Conteúdo</h2>
            {autoSave && (
              <span className="ml-auto text-[10px] text-lightText dark:text-darkTextSecondary">
                Auto-salvando...
              </span>
            )}
          </div>
          <p className="text-xs text-lightText dark:text-darkTextSecondary">
            Escreva livremente — critérios de promoção, observações, metas, histórico de decisões.
          </p>
          <textarea
            value={notas}
            onChange={e => { setNotas(e.target.value); if (autoSave) setSaved(false); }}
            rows={24}
            placeholder={`Plano de Carreira — Negócios de Limpeza\n\n` +
              `─── CARGOS & CRITÉRIOS ───────────────────\n\n` +
              `Faxineira Júnior\n• Critérios de entrada\n• ...\n\n` +
              `Faxineira Sênior\n• Tempo mínimo: 12 meses\n• ...\n\n` +
              `Faxineira Profissional\n• ...\n\n` +
              `─── OBSERVAÇÕES ──────────────────────────\n\n` +
              `Escreva qualquer nota, meta ou decisão aqui...`}
            className="w-full border border-input bg-gray-50 dark:bg-darkBg rounded-xl px-4 py-3 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed font-mono"
          />
        </div>

        {/* Salvar no final também */}
        <div className="flex justify-end">
          <Button onClick={handleSalvar} icon={saved ? <CheckCircle size={16}/> : <Save size={16}/>}>
            {saved ? 'Salvo!' : 'Salvar alterações'}
          </Button>
        </div>
      </div>
    </Layout>
  );
};
