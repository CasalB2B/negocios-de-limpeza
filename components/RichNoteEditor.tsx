// ─── Rich Note Editor ────────────────────────────────────────────────────────
// Lightweight contenteditable rich text editor — no external deps.
// Uses document.execCommand for formatting (still works in all major browsers).
// Parent must pass `key={candidata.id}` so the component re-mounts when the
// active candidata changes (avoids stale innerHTML after switching cards).

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Minus, Type } from 'lucide-react';

interface RichNoteEditorProps {
  /** HTML string OR legacy plain text — editor auto-detects and converts */
  defaultValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Safely escape HTML entities in plain text. */
function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Convert legacy plain-text notes to HTML paragraphs.
 * If the string already contains HTML tags it is returned as-is.
 */
function toHtml(value: string): string {
  if (!value.trim()) return '';
  if (/<[a-zA-Z]/.test(value)) return value; // already HTML
  return value
    .split('\n')
    .map(line => (line.trim() ? `<p>${esc(line)}</p>` : '<p><br></p>'))
    .join('');
}

const BLOCOS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'A']);
const VAZIOS = new Set(['BR', 'HR']);
const IGNORAR = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE']);

// emTitulo: text inherits bold from an enclosing heading; normal: it explicitly opted out of it.
type Fmt = { bold: boolean; italic: boolean; underline: boolean; emTitulo: boolean; normal: boolean };

/**
 * Text pasted from web pages carries every computed CSS variable as inline style
 * (~100 KB of markup for ~1 KB of text), which made saving and syncing very slow.
 * Rebuilds the note with only basic blocks, and gives every piece of text exactly the
 * bold/italic/underline it rendered with (including inline-style resets like font-weight:400).
 */
export function limparHtml(html: string): string {
  if (!html || !/[<]/.test(html)) return html;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const origem = doc.body.firstElementChild as HTMLElement;
  const saida = doc.createElement('div');

  const copiar = (no: Node, destino: Element, fmt: Fmt) => {
    if (no.nodeType === Node.TEXT_NODE) {
      if (!no.textContent) return;
      let alvo: Node = doc.createTextNode(no.textContent);
      if (fmt.underline) { const u = doc.createElement('u'); u.appendChild(alvo); alvo = u; }
      if (fmt.italic) { const i = doc.createElement('em'); i.appendChild(alvo); alvo = i; }
      if (fmt.bold) { const b = doc.createElement('strong'); b.appendChild(alvo); alvo = b; }
      else if (fmt.normal) {
        const s = doc.createElement('span');
        s.setAttribute('style', 'font-weight:400');
        s.appendChild(alvo);
        alvo = s;
      }
      destino.appendChild(alvo);
      return;
    }
    if (no.nodeType !== Node.ELEMENT_NODE) return;
    const el = no as HTMLElement;
    const tag = el.tagName;
    if (IGNORAR.has(tag)) return;
    if (VAZIOS.has(tag)) { destino.appendChild(doc.createElement(tag.toLowerCase())); return; }

    const novo: Fmt = { ...fmt };
    if (tag === 'B' || tag === 'STRONG') { novo.bold = true; novo.normal = false; }
    if (tag === 'I' || tag === 'EM') novo.italic = true;
    if (tag === 'U') novo.underline = true;
    const peso = el.style.fontWeight;
    if (peso) {
      novo.bold = /^(bold|bolder|[6-9]00)$/.test(peso);
      novo.normal = !novo.bold && fmt.emTitulo;
    }
    if (el.style.fontStyle) novo.italic = el.style.fontStyle === 'italic';
    const deco = el.style.textDecorationLine || el.style.textDecoration;
    if (deco) novo.underline = deco.includes('underline');

    if (BLOCOS.has(tag)) {
      const bloco = doc.createElement(tag.toLowerCase());
      const href = tag === 'A' ? el.getAttribute('href') : null;
      if (href && /^https?:\/\//i.test(href)) bloco.setAttribute('href', href);
      let interno = novo;
      if (/^H[1-3]$/.test(tag)) {
        // Headings are bold by default; don't wrap their text in <strong> again.
        interno = { ...novo, bold: false, normal: false, emTitulo: true };
      } else if (novo.normal) {
        // A paragraph inside a heading that was explicitly normal weight stays normal.
        bloco.setAttribute('style', 'font-weight:400');
        interno = { ...novo, normal: false, emTitulo: false };
      }
      el.childNodes.forEach(f => copiar(f, bloco, interno));
      destino.appendChild(bloco);
      return;
    }
    el.childNodes.forEach(f => copiar(f, destino, novo));
  };

  origem.childNodes.forEach(f => copiar(f, saida, { bold: false, italic: false, underline: false, emTitulo: false, normal: false }));
  let resultado = saida.innerHTML;
  // Merge adjacent runs with the same formatting.
  for (let i = 0; i < 3; i++) resultado = resultado.replace(/<\/(strong|em|u)><\1>/g, '');
  return resultado;
}

/** True when the HTML string has no visible text content. */
function htmlIsEmpty(html: string): boolean {
  return !html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

// ── Component ─────────────────────────────────────────────────────────────────

export const RichNoteEditor: React.FC<RichNoteEditorProps> = ({
  defaultValue,
  onChange,
  placeholder = 'Escreva aqui...',
  className = '',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showPlaceholder, setShowPlaceholder] = useState(
    !defaultValue || htmlIsEmpty(defaultValue),
  );

  // Populate innerHTML once on mount (parent must pass key= to re-mount).
  useEffect(() => {
    if (editorRef.current) {
      const original = toHtml(defaultValue);
      const html = limparHtml(original);
      editorRef.current.innerHTML = html;
      setShowPlaceholder(!html || htmlIsEmpty(html));
      // Old notes saved before the cleanup shrink on the next save.
      if (html !== original) onChange(html);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync placeholder state after every keystroke.
  const handleInput = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? '';
    setShowPlaceholder(htmlIsEmpty(html));
    onChange(limparHtml(html));
  }, [onChange]);

  // Paste: keep basic formatting only (see limparHtml).
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData('text/html');
    const texto = e.clipboardData.getData('text/plain');
    if (!html && !texto) return;
    e.preventDefault();
    if (html) {
      document.execCommand('insertHTML', false, limparHtml(html.replace(/<!--[\s\S]*?-->/g, '')));
    } else {
      document.execCommand('insertText', false, texto);
    }
    const atual = editorRef.current?.innerHTML ?? '';
    setShowPlaceholder(htmlIsEmpty(atual));
    onChange(limparHtml(atual));
  }, [onChange]);

  // Re-check on blur (handles deletion via backspace to empty).
  const handleBlur = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? '';
    setShowPlaceholder(htmlIsEmpty(html));
  }, []);

  // Execute a formatting command without stealing focus from the editor.
  const exec = useCallback(
    (cmd: string, value?: string) => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, value ?? undefined);
      const html = editorRef.current?.innerHTML ?? '';
      setShowPlaceholder(htmlIsEmpty(html));
      onChange(html);
    },
    [onChange],
  );

  // ── Toolbar helpers ──────────────────────────────────────────────────────

  const ToolBtn = ({
    onClick,
    title,
    children,
  }: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      // preventDefault keeps focus on the contenteditable div.
      onMouseDown={e => {
        e.preventDefault();
        onClick();
      }}
      className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-darkBorder text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary transition-colors"
    >
      {children}
    </button>
  );

  const Sep = () => (
    <div className="w-px h-4 bg-gray-200 dark:bg-darkBorder mx-0.5 self-center" />
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className={`flex flex-col border border-input rounded-2xl bg-gray-50 dark:bg-darkBg focus-within:ring-2 focus-within:ring-primary/30 ${className}`}
    >
      {/* ── Toolbar — shrink-0 so it always stays at top in flex column ── */}
      <div className="flex items-center gap-0.5 px-2.5 py-2 border-b border-input bg-white dark:bg-darkSurface shrink-0 flex-wrap rounded-t-2xl">
        <ToolBtn onClick={() => exec('bold')} title="Negrito (Ctrl+B)">
          <Bold size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => exec('italic')} title="Itálico (Ctrl+I)">
          <Italic size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => exec('underline')} title="Sublinhado (Ctrl+U)">
          <Underline size={13} />
        </ToolBtn>

        <Sep />

        <ToolBtn
          onClick={() => exec('formatBlock', 'H1')}
          title="Título grande"
        >
          <span className="text-[11px] font-black leading-none select-none">H1</span>
        </ToolBtn>
        <ToolBtn
          onClick={() => exec('formatBlock', 'H2')}
          title="Título médio"
        >
          <span className="text-[11px] font-black leading-none select-none">H2</span>
        </ToolBtn>
        <ToolBtn
          onClick={() => exec('formatBlock', 'P')}
          title="Texto normal"
        >
          <Type size={12} />
        </ToolBtn>

        <Sep />

        <ToolBtn
          onClick={() => exec('insertUnorderedList')}
          title="Lista de tópicos"
        >
          <List size={13} />
        </ToolBtn>
        <ToolBtn
          onClick={() => exec('insertOrderedList')}
          title="Lista numerada"
        >
          <ListOrdered size={13} />
        </ToolBtn>

        <Sep />

        <ToolBtn
          onClick={() => exec('insertHorizontalRule')}
          title="Linha divisória"
        >
          <Minus size={13} />
        </ToolBtn>
      </div>

      {/* ── Editable area — on desktop scrolls inside the bounded editor box ── */}
      <div className="relative flex-1 lg:overflow-y-auto rounded-b-2xl">
        {/* Placeholder overlay — only shown when empty */}
        {showPlaceholder && (
          <div
            aria-hidden
            className="absolute inset-0 px-5 py-4 text-sm text-gray-400 dark:text-darkTextSecondary pointer-events-none whitespace-pre-line leading-relaxed"
          >
            {placeholder}
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onBlur={handleBlur}
          /* The class rich-editor-content activates the heading/list CSS in index.html */
          className="rich-editor-content min-h-[220px] px-5 py-4 text-sm text-darkText dark:text-darkTextPrimary outline-none leading-relaxed"
        />
      </div>
    </div>
  );
};
