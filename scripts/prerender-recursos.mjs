// After `vite build`: writes dist/recursos.html and dist/recursos/<slug>.html with the right title, description,
// canonical and the page text already in the HTML, so Google reads each feature page without running the app.
// The app then loads normally on top of it (React replaces the #root content). vercel.json maps the clean URLs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = 'https://app.negociosdelimpeza.com.br';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(raiz, 'dist');
const recursos = JSON.parse(fs.readFileSync(path.join(raiz, 'lib', 'recursos.json'), 'utf8'));
const modelo = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function pagina({ titulo, descricao, url, corpo, jsonld }) {
  let h = modelo;
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titulo)}</title>`);
  const trocaMeta = (re, tag) => { h = re.test(h) ? h.replace(re, tag) : h.replace('</head>', `  ${tag}\n</head>`); };
  trocaMeta(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(descricao)}" />`);
  trocaMeta(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(titulo)}" />`);
  trocaMeta(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(descricao)}" />`);
  trocaMeta(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`);
  trocaMeta(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(titulo)}" />`);
  trocaMeta(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(descricao)}" />`);
  h = h.replace('</head>', `  <link rel="canonical" href="${url}" />\n${jsonld ? `  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>\n` : ''}</head>`);
  h = h.replace(/<div id="root"><\/div>/, `<div id="root"><main style="max-width:880px;margin:0 auto;padding:40px 16px;font-family:Manrope,sans-serif">${corpo}</main></div>`);
  return h;
}

const nav = `<nav><a href="/">Início</a> · <a href="/recursos">Recursos</a> · <a href="/#/criar-conta">Testar grátis por 14 dias</a> · <a href="/#/entrar">Entrar</a></nav>`;
const lista = recursos.map(r => `<li><a href="/recursos/${r.slug}">${esc(r.nome)}</a>: ${esc(r.menu)}</li>`).join('');

fs.mkdirSync(path.join(dist, 'recursos'), { recursive: true });
for (const r of recursos) {
  const url = `${BASE}/recursos/${r.slug}`;
  const corpo = `${nav}
<h1>${esc(r.chamada)}</h1><p>${esc(r.subtitulo)}</p>
<h2>O que você ganha</h2><ul>${r.beneficios.map(b => `<li><strong>${esc(b.t)}</strong>: ${esc(b.d)}</li>`).join('')}</ul>
<h2>Como funciona</h2><ol>${r.passos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
${r.perguntas.length ? `<h2>Perguntas frequentes</h2>${r.perguntas.map(f => `<h3>${esc(f.p)}</h3><p>${esc(f.r)}</p>`).join('')}` : ''}
<h2>Outros recursos</h2><ul>${lista}</ul>
<p><a href="/#/criar-conta">Testar grátis por 14 dias, sem cartão</a></p>`;
  const jsonld = r.perguntas.length ? {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: r.perguntas.map(f => ({ '@type': 'Question', name: f.p, acceptedAnswer: { '@type': 'Answer', text: f.r } })),
  } : null;
  fs.writeFileSync(path.join(dist, 'recursos', `${r.slug}.html`), pagina({ titulo: `${r.titulo} | Negócios de Limpeza`, descricao: r.descricao, url, corpo, jsonld }));
}

fs.writeFileSync(path.join(dist, 'recursos.html'), pagina({
  titulo: 'Recursos do sistema para empresas de limpeza | Negócios de Limpeza',
  descricao: 'Agenda da equipe, clientes, cobrança automática, lembretes no WhatsApp, financeiro, RH, app da colaboradora e assistente com IA para empresas de limpeza.',
  url: `${BASE}/recursos`,
  corpo: `${nav}<h1>Todos os recursos para a sua empresa de limpeza</h1><ul>${recursos.map(r => `<li><a href="/recursos/${r.slug}">${esc(r.nome)}</a>: ${esc(r.descricao)}</li>`).join('')}</ul>`,
}));

// Sitemap with the public pages.
const hoje = new Date().toISOString().slice(0, 10);
const urls = ['/', '/recursos', ...recursos.map(r => `/recursos/${r.slug}`)];
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${BASE}${u}</loc><lastmod>${hoje}</lastmod></url>`).join('\n')}
</urlset>
`);
console.log(`prerender: ${recursos.length} páginas de recursos + sitemap`);
