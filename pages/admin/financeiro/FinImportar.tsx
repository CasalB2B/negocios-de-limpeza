// Importar lançamentos de uma planilha (exportação do Mobills, planilha própria ou extrato em CSV/Excel).
// Passos: arquivo → colunas → contas e cartões → conferir → importar → acertar saldos de hoje.
import React, { useMemo, useState } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, Check, Undo2, ArrowRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  useFinanceiro, DadosFin, Lancamento, Cartao, brl, dataBR, hoje, faturaDaCompra, datasDaFatura, saldoAtual, r2, mesDe,
} from '../../../lib/financeiro';
import {
  CAMPOS, Celula, Mapa, RegraSinal, LinhaLida, lerArquivo, acharCabecalho, detectarColunas, interpretar, normalizar,
} from '../../../lib/importarFin';
import { FinShell, card, Carregando, inputCls, labelCls, lerValor, valorParaCampo } from './comum';

type Destino = { tipo: 'conta' | 'cartao' | 'nova-conta' | 'novo-cartao'; id?: string; fecha?: string; vence?: string; dataNaFatura?: boolean };
type Passo = 'arquivo' | 'colunas' | 'contas' | 'conferir' | 'saldos';

const SEM_CONTA = '(sem conta na planilha)';

export const FinImportar: React.FC = () => {
  const fin = useFinanceiro();
  const [passo, setPasso] = useState<Passo>('arquivo');
  const [nomeArq, setNomeArq] = useState('');
  const [linhas, setLinhas] = useState<Celula[][]>([]);
  const [cab, setCab] = useState(0);
  const [mapa, setMapa] = useState<Mapa>({});
  const [regra, setRegra] = useState<RegraSinal>('SINAL');
  const [destinos, setDestinos] = useState<Record<string, Destino>>({});
  const [faturasPagas, setFaturasPagas] = useState(true);
  const [erro, setErro] = useState('');
  const [lendo, setLendo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{ lote: string; criados: number; repetidos: number; contas: string[] } | null>(null);

  const lidas = useMemo(() => passo === 'arquivo' ? { ok: [], problemas: [] } : interpretar(linhas, cab + 1, mapa, regra), [linhas, cab, mapa, regra, passo]);
  const temSinal = useMemo(() => lidas.ok.length > 0 && mapa.tipo == null && linhas.slice(cab + 1).some(l => {
    const v = mapa.valor != null ? l[mapa.valor] : null; return typeof v === 'number' ? v < 0 : String(v ?? '').includes('-');
  }), [lidas, mapa, linhas, cab]);

  // Chaves já importadas antes (para não repetir).
  const jaImportadas = useMemo(() => new Set(fin.lancamentos.filter(l => l.origem === 'IMPORTACAO' && l.referencia)
    .map(l => l.referencia!.split(':').pop()!)), [fin.lancamentos]);

  if (fin.carregando || fin.erro) return <FinShell titulo="Importar planilha"><Carregando erro={fin.erro} /></FinShell>;

  async function escolherArquivo(f: File | undefined) {
    if (!f) return;
    setErro(''); setLendo(true);
    try {
      const rows = await lerArquivo(f);
      if (rows.length < 2) throw new Error('A planilha está vazia.');
      const h = acharCabecalho(rows);
      setLinhas(rows); setCab(h); setMapa(detectarColunas(rows[h])); setNomeArq(f.name); setResultado(null);
      setPasso('colunas');
    } catch (e) {
      setErro((e as Error).message || 'Não consegui ler este arquivo.');
    }
    setLendo(false);
  }

  function irParaContas() {
    const nomes = [...new Set(lidas.ok.map(l => l.conta || SEM_CONTA))];
    const d: Record<string, Destino> = {};
    for (const n of nomes) {
      const atual = destinos[n];
      if (atual) { d[n] = atual; continue; }
      const conta = fin.contas.find(c => normalizar(c.nome) === normalizar(n));
      const cartao = fin.cartoes.find(c => normalizar(c.nome) === normalizar(n));
      if (n === SEM_CONTA) d[n] = { tipo: 'conta', id: (fin.contas.find(c => c.padrao) ?? fin.contas[0])?.id };
      else if (cartao) d[n] = { tipo: 'cartao', id: cartao.id };
      else if (conta) d[n] = { tipo: 'conta', id: conta.id };
      else if (/cart|credit|visa|master|elo/.test(normalizar(n))) d[n] = { tipo: 'novo-cartao', fecha: '', vence: '' };
      else d[n] = { tipo: 'nova-conta' };
    }
    setDestinos(d);
    setPasso('contas');
  }

  const faltaDiaCartao = Object.values(destinos).some(d => d.tipo === 'novo-cartao' && !(Number(d.fecha) >= 1 && Number(d.fecha) <= 31 && Number(d.vence) >= 1 && Number(d.vence) <= 31));
  const novas = lidas.ok.filter(l => !jaImportadas.has(l.chave));
  const repetidas = lidas.ok.length - novas.length;
  const categoriasNovas = [...new Set(novas.filter(l => l.categoria && l.tipo !== 'TRANSFERENCIA')
    .filter(l => !fin.categorias.some(c => c.tipo === l.tipo && normalizar(c.nome) === normalizar(l.categoria)))
    .map(l => `${l.tipo === 'RECEITA' ? 'Receita' : 'Despesa'}: ${l.categoria}`))];
  const transferencias = novas.filter(l => l.tipo === 'TRANSFERENCIA').length;

  async function importar() {
    setErro(''); setImportando(true);
    try {
      const agora = new Date();
      const lote = [agora.getFullYear(), agora.getMonth() + 1, agora.getDate(), agora.getHours(), agora.getMinutes()].map(n => String(n).padStart(2, '0')).join('');
      // 1) Contas e cartões novos.
      const contaDe: Record<string, string> = {};
      const cartaoDe: Record<string, Cartao> = {};
      const dataNaFatura: Record<string, boolean> = {};
      const padrao = fin.contas.find(c => c.padrao) ?? fin.contas.find(c => !c.arquivada);
      for (const [nome, d] of Object.entries(destinos)) {
        if (d.tipo === 'conta' && d.id) contaDe[nome] = d.id;
        if (d.tipo === 'cartao' && d.id) cartaoDe[nome] = fin.cartoes.find(c => c.id === d.id)!;
        if (d.tipo === 'nova-conta') {
          const { data, error } = await supabase.from('fin_contas').insert({ nome: nome === SEM_CONTA ? 'Conta importada' : nome, tipo: 'BANCO' }).select('id').single();
          if (error) throw error;
          contaDe[nome] = data.id;
        }
        if (d.tipo === 'novo-cartao') {
          const { data, error } = await supabase.from('fin_cartoes').insert({
            nome, dia_fechamento: Number(d.fecha), dia_vencimento: Number(d.vence), conta_pagamento_id: padrao?.id ?? null, limite: 0,
          }).select('*').single();
          if (error) throw error;
          cartaoDe[nome] = { ...data, limite: Number(data.limite) } as Cartao;
        }
        dataNaFatura[nome] = !!d.dataNaFatura;
      }
      // 2) Categorias que ainda não existem.
      const faltam = [...new Map(novas.filter(l => l.categoria && l.tipo !== 'TRANSFERENCIA')
        .filter(l => !fin.categorias.some(c => c.tipo === l.tipo && normalizar(c.nome) === normalizar(l.categoria)))
        .map(l => [`${l.tipo}|${normalizar(l.categoria)}`, { nome: l.categoria, tipo: l.tipo }])).values()];
      if (faltam.length) {
        const { error } = await supabase.from('fin_categorias').insert(faltam);
        if (error && !error.message.includes('duplicate')) throw error;
      }
      const { data: cats } = await supabase.from('fin_categorias').select('id, nome, tipo');
      const catDe = (l: LinhaLida) => (cats ?? []).find(c => c.tipo === l.tipo && normalizar(c.nome) === normalizar(l.categoria))?.id ?? null;

      // 3) Lançamentos. Parcelas da mesma compra ficam no mesmo grupo.
      const grupos = new Map<string, string>();
      const linhasBD: any[] = [];
      const h = hoje();
      for (const l of novas) {
        if (l.tipo === 'TRANSFERENCIA') continue;
        const nomeConta = l.conta || SEM_CONTA;
        const cartao = cartaoDe[nomeConta];
        let grupo: string | null = null;
        if (l.parcela) {
          const g = `${nomeConta}|${normalizar(l.descricao.replace(/\s*[([]?\d+\s*\/\s*\d+[)\]]?\s*$/, ''))}|${l.parcela.total}|${l.valor}`;
          if (!grupos.has(g)) grupos.set(g, crypto.randomUUID());
          grupo = grupos.get(g)!;
        }
        const base = {
          tipo: l.tipo, descricao: l.descricao, valor: l.valor, data: l.data, categoria_id: catDe(l),
          grupo_id: grupo, parcela_num: l.parcela?.num ?? null, parcela_total: l.parcela?.total ?? null,
          origem: 'IMPORTACAO', referencia: `imp:${lote}:${l.chave}`, observacao: `Importado de ${nomeArq}`,
        };
        if (cartao && l.tipo === 'DESPESA') {
          const fat = dataNaFatura[nomeConta] ? mesDe(l.data) : faturaDaCompra(l.data, cartao);
          linhasBD.push({ ...base, cartao_id: cartao.id, conta_id: null, fatura_mes: `${fat}-01`, pago: false });
        } else {
          const contaId = contaDe[nomeConta] ?? cartao?.conta_pagamento_id ?? padrao?.id;
          if (!contaId) throw new Error('Cadastre uma conta antes de importar.');
          linhasBD.push({ ...base, conta_id: contaId, pago: l.pago ?? l.data <= h });
        }
      }
      for (let i = 0; i < linhasBD.length; i += 500) {
        const { error } = await supabase.from('fin_lancamentos').insert(linhasBD.slice(i, i + 500));
        if (error) throw error;
      }

      // 4) Faturas já vencidas: lança o pagamento (sai da conta que paga o cartão) e marca as compras como pagas.
      if (faturasPagas) {
        const doCartao = new Map<string, { cartao: Cartao; meses: Set<string> }>();
        for (const x of linhasBD.filter(x => x.cartao_id)) {
          const c = Object.values(cartaoDe).find(k => k.id === x.cartao_id)!;
          if (!doCartao.has(c.id)) doCartao.set(c.id, { cartao: c, meses: new Set() });
          doCartao.get(c.id)!.meses.add(x.fatura_mes.slice(0, 7));
        }
        const pagamentos: any[] = [];
        for (const { cartao, meses } of doCartao.values()) {
          for (const m of meses) {
            const { vencimento } = datasDaFatura(m, cartao);
            if (vencimento >= h) continue;
            const todas = [...fin.lancamentos, ...linhasBD as Lancamento[]].filter(x => x.cartao_id === cartao.id && (x.fatura_mes || '').slice(0, 7) === m);
            const total = todas.filter(x => x.tipo === 'DESPESA').reduce((s, x) => s + Number(x.valor), 0);
            const pago = todas.filter(x => x.tipo === 'PAGAMENTO_FATURA').reduce((s, x) => s + Number(x.valor), 0);
            const resta = r2(total - pago);
            const conta = cartao.conta_pagamento_id ?? padrao?.id;
            if (resta > 0 && conta) pagamentos.push({
              tipo: 'PAGAMENTO_FATURA', descricao: `Fatura ${cartao.nome} — ${m.slice(5)}/${m.slice(0, 4)}`, valor: resta, data: vencimento, pago: true,
              conta_id: conta, cartao_id: cartao.id, fatura_mes: `${m}-01`, origem: 'IMPORTACAO', referencia: `imp:${lote}:fat-${cartao.id.slice(0, 8)}-${m}`,
            });
            await supabase.from('fin_lancamentos').update({ pago: true }).eq('cartao_id', cartao.id).eq('tipo', 'DESPESA').eq('fatura_mes', `${m}-01`);
          }
        }
        if (pagamentos.length) {
          const { error } = await supabase.from('fin_lancamentos').insert(pagamentos);
          if (error) throw error;
        }
      }

      await fin.recarregar();
      const contasUsadas = [...new Set([...Object.values(contaDe), ...Object.values(cartaoDe).map(c => c.conta_pagamento_id ?? padrao?.id ?? '')])].filter(Boolean);
      setResultado({ lote, criados: linhasBD.length, repetidos: repetidas, contas: contasUsadas });
      setPasso('saldos');
    } catch (e) {
      setErro(`Não foi possível importar: ${(e as Error).message}`);
    }
    setImportando(false);
  }

  return (
    <FinShell titulo="Importar planilha">
      <Etapas passo={passo} />
      {erro && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 text-sm rounded-xl p-3 flex gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" />{erro}</div>}

      {passo === 'arquivo' && (
        <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
          <label className={`${card} p-10 flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:border-primary/50 border-dashed border-2`}>
            <Upload size={32} className="text-primary" />
            <p className="font-bold text-darkText dark:text-darkTextPrimary">{lendo ? 'Lendo arquivo...' : 'Escolha a planilha (.xlsx ou .csv)'}</p>
            <p className="text-xs text-lightText dark:text-darkTextSecondary">Exportação do Mobills, planilha de vocês ou extrato do banco</p>
            <input type="file" accept=".xlsx,.csv,.txt,.xls" className="hidden" onChange={e => { escolherArquivo(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <div className={`${card} p-5 text-sm space-y-2 text-darkText dark:text-darkTextPrimary`}>
            <p className="font-bold">Como tirar do Mobills</p>
            <ol className="list-decimal pl-5 space-y-1 text-lightText dark:text-darkTextSecondary">
              <li>No Mobills (site), abra <b>Transações</b>.</li>
              <li>Escolha o período (ex.: o ano todo) e "Todas" as contas.</li>
              <li>No menu de três pontinhos, clique em <b>Exportar</b> e baixe o arquivo.</li>
              <li>Envie o arquivo aqui. Faça o mesmo na tela de cada cartão de crédito, se as compras do cartão não vierem juntas.</li>
            </ol>
            <p className="text-xs text-lightText dark:text-darkTextSecondary">Pode importar de novo sem medo: o que já foi importado é pulado.</p>
          </div>
          <Lotes fin={fin} />
        </div>
      )}

      {passo === 'colunas' && (
        <div className="space-y-4">
          <div className={`${card} p-5 space-y-4`}>
            <div className="flex items-center gap-2 text-sm text-darkText dark:text-darkTextPrimary"><FileSpreadsheet size={16} className="text-primary" /><b>{nomeArq}</b> · {linhas.length - cab - 1} linhas</div>
            <p className="text-sm text-lightText dark:text-darkTextSecondary">Confira qual coluna da planilha é cada informação. Já deixei marcado o que reconheci.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>Linha dos títulos</label>
                <select className={inputCls} value={cab} onChange={e => { const h = Number(e.target.value); setCab(h); setMapa(detectarColunas(linhas[h])); }}>
                  {linhas.slice(0, 15).map((l, i) => <option key={i} value={i}>Linha {i + 1}: {l.filter(Boolean).slice(0, 3).join(' · ').slice(0, 40)}</option>)}
                </select>
              </div>
              {CAMPOS.map(c => (
                <div key={c.k}>
                  <label className={labelCls}>{c.label}{c.obrigatorio ? ' *' : ''}</label>
                  <select className={inputCls} value={mapa[c.k] ?? ''} onChange={e => setMapa(m => ({ ...m, [c.k]: e.target.value === '' ? undefined : Number(e.target.value) }))}>
                    <option value="">— não tem —</option>
                    {linhas[cab].map((t, i) => <option key={i} value={i}>{String(t ?? `Coluna ${i + 1}`)}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {mapa.tipo == null && (
              <div>
                <label className={labelCls}>Sem coluna de tipo: como saber se é receita ou despesa?</label>
                <div className="flex gap-1.5 flex-wrap">
                  {([['SINAL', 'Valor negativo = despesa'], ['TUDO_DESPESA', 'Tudo é despesa'], ['TUDO_RECEITA', 'Tudo é receita']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setRegra(k)} className={`px-3 py-2 rounded-xl text-xs font-bold border ${regra === k ? 'bg-primary text-white border-primary' : 'border-gray-200 dark:border-darkBorder text-lightText'}`}>{l}</button>
                  ))}
                </div>
                {regra === 'SINAL' && !temSinal && <p className="text-xs text-amber-600 mt-1">Nenhum valor negativo na planilha: tudo entraria como receita. Se são gastos, escolha "Tudo é despesa".</p>}
              </div>
            )}
          </div>
          <Previa linhas={lidas.ok.slice(0, 8)} />
          {lidas.problemas.length > 0 && (
            <p className="text-xs text-amber-600">{lidas.problemas.length} linha(s) serão puladas ({lidas.problemas.slice(0, 5).map(p => `linha ${p.linha}: ${p.motivo}`).join('; ')}{lidas.problemas.length > 5 ? '…' : ''}). Linhas de total ou em branco são normais.</p>
          )}
          <Navegar voltar={() => setPasso('arquivo')} avancar={irParaContas}
            bloqueado={mapa.data == null || mapa.valor == null || mapa.descricao == null || lidas.ok.length === 0}
            aviso={lidas.ok.length === 0 ? 'Nenhuma linha reconhecida: confira as colunas de data e valor.' : undefined} />
        </div>
      )}

      {passo === 'contas' && (
        <div className="space-y-4">
          <div className={`${card} p-5 space-y-3`}>
            <p className="text-sm text-lightText dark:text-darkTextSecondary">Diga para onde vai cada conta da planilha. Cartão de crédito precisa dos dias de fechamento e vencimento.</p>
            {Object.entries(destinos).map(([nome, d]) => {
              const qtd = lidas.ok.filter(l => (l.conta || SEM_CONTA) === nome).length;
              const valorSel = d.tipo === 'conta' || d.tipo === 'cartao' ? `${d.tipo}:${d.id}` : d.tipo;
              const set = (nd: Partial<Destino>) => setDestinos(x => ({ ...x, [nome]: { ...x[nome], ...nd } }));
              return (
                <div key={nome} className="border border-gray-100 dark:border-darkBorder rounded-xl p-3 grid md:grid-cols-[1fr_1fr] gap-3 items-start">
                  <div>
                    <p className="font-bold text-darkText dark:text-darkTextPrimary">{nome}</p>
                    <p className="text-xs text-lightText">{qtd} lançamento(s)</p>
                  </div>
                  <div className="space-y-2">
                    <select className={inputCls} value={valorSel} onChange={e => {
                      const [t, id] = e.target.value.split(':');
                      set({ tipo: t as Destino['tipo'], id: id || undefined });
                    }}>
                      <option value="nova-conta">Criar conta "{nome === SEM_CONTA ? 'Conta importada' : nome}"</option>
                      <option value="novo-cartao">Criar cartão de crédito "{nome}"</option>
                      <optgroup label="Contas já cadastradas">{fin.contas.filter(c => !c.arquivada).map(c => <option key={c.id} value={`conta:${c.id}`}>{c.nome}</option>)}</optgroup>
                      {fin.cartoes.length > 0 && <optgroup label="Cartões já cadastrados">{fin.cartoes.filter(c => !c.arquivado).map(c => <option key={c.id} value={`cartao:${c.id}`}>{c.nome}</option>)}</optgroup>}
                    </select>
                    {d.tipo === 'novo-cartao' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input className={inputCls} inputMode="numeric" placeholder="Dia que fecha" value={d.fecha ?? ''} onChange={e => set({ fecha: e.target.value.replace(/\D/g, '') })} />
                        <input className={inputCls} inputMode="numeric" placeholder="Dia que vence" value={d.vence ?? ''} onChange={e => set({ vence: e.target.value.replace(/\D/g, '') })} />
                      </div>
                    )}
                    {(d.tipo === 'novo-cartao' || d.tipo === 'cartao') && (
                      <select className={inputCls} value={d.dataNaFatura ? 'venc' : 'compra'} onChange={e => set({ dataNaFatura: e.target.value === 'venc' })}>
                        <option value="compra">A data na planilha é a data da compra</option>
                        <option value="venc">A data na planilha é o vencimento da fatura</option>
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Navegar voltar={() => setPasso('colunas')} avancar={() => setPasso('conferir')} bloqueado={faltaDiaCartao}
            aviso={faltaDiaCartao ? 'Informe os dias de fechamento e vencimento dos cartões novos.' : undefined} />
        </div>
      )}

      {passo === 'conferir' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Num label="Vão entrar" v={String(novas.length - transferencias)} />
            <Num label="Já importados antes (pulados)" v={String(repetidas)} />
            <Num label="Receitas" v={brl(novas.filter(l => l.tipo === 'RECEITA').reduce((s, l) => s + l.valor, 0))} cor="text-emerald-600" />
            <Num label="Despesas" v={brl(novas.filter(l => l.tipo === 'DESPESA').reduce((s, l) => s + l.valor, 0))} cor="text-red-500" />
          </div>
          <div className={`${card} p-5 space-y-2 text-sm text-darkText dark:text-darkTextPrimary`}>
            {novas.length > 0 && <p>Período: {dataBR(novas.reduce((a, l) => l.data < a ? l.data : a, novas[0].data))} a {dataBR(novas.reduce((a, l) => l.data > a ? l.data : a, novas[0].data))}</p>}
            {categoriasNovas.length > 0 && <p>Categorias novas que serão criadas: <span className="text-lightText">{categoriasNovas.join(', ')}</span></p>}
            {transferencias > 0 && <p className="text-amber-600">{transferencias} transferência(s) entre contas não serão importadas (lance pela tela Contas → Transferir, se precisar).</p>}
            {Object.values(destinos).some(d => d.tipo === 'cartao' || d.tipo === 'novo-cartao') && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={faturasPagas} onChange={e => setFaturasPagas(e.target.checked)} className="w-4 h-4 mt-0.5 accent-primary" />
                <span>Faturas do cartão que já venceram foram pagas (lança o pagamento na conta que paga o cartão). <span className="text-lightText">Recomendado.</span></span>
              </label>
            )}
          </div>
          <Previa linhas={novas.slice(0, 12)} />
          <Navegar voltar={() => setPasso('contas')} avancar={importar} textoAvancar={importando ? 'Importando...' : `Importar ${novas.length - transferencias} lançamentos`}
            bloqueado={importando || novas.length - transferencias === 0} aviso={novas.length === 0 ? 'Tudo desta planilha já foi importado antes.' : undefined} />
        </div>
      )}

      {passo === 'saldos' && resultado && (
        <div className="space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-2xl p-4 flex gap-2 text-sm">
            <Check size={18} className="shrink-0" />
            <span><b>{resultado.criados} lançamentos importados.</b>{resultado.repetidos ? ` ${resultado.repetidos} já existiam e foram pulados.` : ''}</span>
          </div>
          <AcertarSaldos fin={fin} contasIds={resultado.contas} />
          <button onClick={() => { setPasso('arquivo'); setResultado(null); }} className="text-sm font-bold text-primary hover:underline">Importar outra planilha</button>
        </div>
      )}
    </FinShell>
  );
};

const Etapas: React.FC<{ passo: Passo }> = ({ passo }) => {
  const ps: [Passo, string][] = [['arquivo', 'Arquivo'], ['colunas', 'Colunas'], ['contas', 'Contas e cartões'], ['conferir', 'Conferir'], ['saldos', 'Saldos de hoje']];
  const atual = ps.findIndex(p => p[0] === passo);
  return (
    <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold">
      {ps.map(([k, l], i) => (
        <React.Fragment key={k}>
          <span className={`px-2.5 py-1 rounded-full ${i === atual ? 'bg-primary text-white' : i < atual ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-darkBorder text-lightText'}`}>{i + 1}. {l}</span>
          {i < ps.length - 1 && <ArrowRight size={12} className="text-lightText" />}
        </React.Fragment>
      ))}
    </div>
  );
};

const Num: React.FC<{ label: string; v: string; cor?: string }> = ({ label, v, cor = 'text-darkText dark:text-darkTextPrimary' }) => (
  <div className={`${card} p-4`}><p className="text-xs text-lightText">{label}</p><p className={`text-lg font-extrabold ${cor}`}>{v}</p></div>
);

const Navegar: React.FC<{ voltar: () => void; avancar: () => void; bloqueado?: boolean; aviso?: string; textoAvancar?: string }> =
  ({ voltar, avancar, bloqueado, aviso, textoAvancar = 'Continuar' }) => (
    <div className="flex items-center gap-3 flex-wrap">
      <button onClick={voltar} className="px-4 py-2.5 rounded-xl text-sm font-bold text-lightText hover:bg-gray-100 dark:hover:bg-darkBorder">Voltar</button>
      <button onClick={avancar} disabled={bloqueado} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-primary disabled:opacity-50">{textoAvancar}</button>
      {aviso && <span className="text-xs text-amber-600">{aviso}</span>}
    </div>
  );

const Previa: React.FC<{ linhas: LinhaLida[] }> = ({ linhas }) => (
  <div className={`${card} overflow-x-auto`}>
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-lightText border-b border-gray-100 dark:border-darkBorder">
          {['Data', 'Descrição', 'Categoria', 'Conta / cartão', 'Situação', 'Valor'].map(h => <th key={h} className="text-left px-4 py-2 font-bold">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {linhas.map(l => (
          <tr key={l.linha} className="border-b border-gray-50 dark:border-darkBorder">
            <td className="px-4 py-2 whitespace-nowrap text-darkText dark:text-darkTextPrimary">{dataBR(l.data)}</td>
            <td className="px-4 py-2 text-darkText dark:text-darkTextPrimary max-w-[220px] truncate">{l.descricao}</td>
            <td className="px-4 py-2 text-lightText max-w-[140px] truncate">{l.categoria || '—'}</td>
            <td className="px-4 py-2 text-lightText max-w-[160px] truncate">{l.conta || '—'}</td>
            <td className="px-4 py-2 text-lightText">{l.pago == null ? 'pela data' : l.pago ? 'pago' : 'pendente'}</td>
            <td className={`px-4 py-2 text-right font-bold whitespace-nowrap ${l.tipo === 'RECEITA' ? 'text-emerald-600' : l.tipo === 'DESPESA' ? 'text-red-500' : 'text-sky-600'}`}>
              {l.tipo === 'DESPESA' ? '− ' : ''}{brl(l.valor)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Depois de importar o histórico, o saldo calculado pode não bater com o banco: a pessoa digita o saldo de hoje
// e o sistema acerta o saldo inicial da conta.
export const AcertarSaldos: React.FC<{ fin: DadosFin; contasIds: string[] }> = ({ fin, contasIds }) => {
  const contas = fin.contas.filter(c => contasIds.includes(c.id));
  const [valores, setValores] = useState<Record<string, string>>({});
  const [salvo, setSalvo] = useState(false);
  async function salvar() {
    for (const c of contas) {
      const txt = valores[c.id];
      if (txt == null || txt === '') continue;
      const alvo = lerValor(txt);
      const movimento = saldoAtual(c, fin.lancamentos) - c.saldo_inicial;
      await supabase.from('fin_contas').update({ saldo_inicial: r2(alvo - movimento) }).eq('id', c.id);
    }
    await fin.recarregar();
    setSalvo(true);
  }
  if (!contas.length) return null;
  return (
    <div className={`${card} p-5 space-y-3`}>
      <p className="font-bold text-darkText dark:text-darkTextPrimary">Acertar os saldos de hoje</p>
      <p className="text-sm text-lightText dark:text-darkTextSecondary">Digite quanto tem hoje em cada conta (como está no banco ou no Mobills). O sistema ajusta para bater.</p>
      {contas.map(c => (
        <div key={c.id} className="grid grid-cols-[1fr_140px_150px] gap-3 items-center text-sm">
          <span className="font-bold text-darkText dark:text-darkTextPrimary truncate">{c.nome}</span>
          <span className="text-lightText text-right">calculado {brl(saldoAtual(c, fin.lancamentos))}</span>
          <input className={inputCls} inputMode="decimal" placeholder={valorParaCampo(saldoAtual(c, fin.lancamentos)) || '0,00'}
            value={valores[c.id] ?? ''} onChange={e => { setValores(v => ({ ...v, [c.id]: e.target.value })); setSalvo(false); }} />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={salvar} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-primary">Salvar saldos</button>
        {salvo && <span className="text-sm text-emerald-600 font-bold flex items-center gap-1"><Check size={14} /> Saldos acertados</span>}
      </div>
    </div>
  );
};

// Importações anteriores, com opção de desfazer.
const Lotes: React.FC<{ fin: DadosFin }> = ({ fin }) => {
  const lotes = useMemo(() => {
    const m = new Map<string, { qtd: number; arquivo: string }>();
    for (const l of fin.lancamentos.filter(x => x.origem === 'IMPORTACAO' && x.referencia?.startsWith('imp:'))) {
      const lote = l.referencia!.split(':')[1];
      const atual = m.get(lote) ?? { qtd: 0, arquivo: (l.observacao || '').replace('Importado de ', '') };
      atual.qtd++; m.set(lote, atual);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [fin.lancamentos]);
  const [desfazendo, setDesfazendo] = useState('');
  if (!lotes.length) return null;
  async function desfazer(lote: string, qtd: number) {
    if (!confirm(`Apagar os ${qtd} lançamentos desta importação? Contas e cartões criados continuam.`)) return;
    setDesfazendo(lote);
    await supabase.from('fin_lancamentos').delete().eq('origem', 'IMPORTACAO').like('referencia', `imp:${lote}:%`);
    await fin.recarregar();
    setDesfazendo('');
  }
  const quando = (lote: string) => `${lote.slice(6, 8)}/${lote.slice(4, 6)}/${lote.slice(0, 4)} ${lote.slice(8, 10)}:${lote.slice(10, 12)}`;
  return (
    <div className={`${card} p-5 lg:col-span-2 space-y-2`}>
      <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Importações feitas</p>
      {lotes.map(([lote, x]) => (
        <div key={lote} className="flex items-center gap-3 text-sm">
          <span className="flex-1 text-darkText dark:text-darkTextPrimary truncate">{quando(lote)} · {x.arquivo || 'planilha'} · {x.qtd} lançamentos</span>
          <button onClick={() => desfazer(lote, x.qtd)} disabled={!!desfazendo} className="flex items-center gap-1 text-xs font-bold text-red-500 hover:underline disabled:opacity-50">
            <Undo2 size={13} /> {desfazendo === lote ? 'Desfazendo...' : 'Desfazer'}
          </button>
        </div>
      ))}
    </div>
  );
};

