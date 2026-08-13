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
      const html = toHtml(defaultValue);
      editorRef.current.innerHTML = html;
      setShowPlaceholder(!html || htmlIsEmpty(html));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync placeholder state after every keystroke.
  const handleInput = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? '';
    setShowPlaceholder(htmlIsEmpty(html));
    onChange(html);
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
      className={`flex flex-col border border-input rounded-2xl overflow-hidden bg-gray-50 dark:bg-darkBg focus-within:ring-2 focus-within:ring-primary/30 ${className}`}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-2.5 py-2 border-b border-input bg-white dark:bg-darkSurface shrink-0 flex-wrap">
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

      {/* ── Editable area ───────────────────────────────────────────────── */}
      <div className="relative flex-1">
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
          onBlur={handleBlur}
          /* The class rich-editor-content activates the heading/list CSS in index.html */
          className="rich-editor-content min-h-[220px] px-5 py-4 text-sm text-darkText dark:text-darkTextPrimary outline-none leading-relaxed"
        />
      </div>
    </div>
  );
};
