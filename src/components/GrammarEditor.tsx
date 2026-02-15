import { useRef } from 'react';

type GrammarEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function GrammarEditor({ value, onChange }: GrammarEditorProps): JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertEpsilon = (): void => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}ε`);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}ε${value.slice(end)}`;
    const nextCaret = start + 1;
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  return (
    <section className="panel">
      <h2>Grammar</h2>
      <p className="help">
        Enter productions one per line, for example <code>S -&gt; aSb | ε</code>.
      </p>
      <div className="grammar-rules" aria-label="Grammar rules">
        <strong>Grammar rules:</strong>
        <ul>
          <li>Nonterminals (production names) must be ALL CAPS: <code>S</code>, <code>EXPR</code>.</li>
          <li>Use spaces between adjacent nonterminals: <code>S -&gt; A B</code>, not <code>S -&gt; AB</code>.</li>
          <li>Use <code>|</code> for alternatives and <code>ε</code> for empty production.</li>
          <li>Use quotes for multi-character terminals: <code>S -&gt; &quot;id&quot; EXPR</code>.</li>
        </ul>
      </div>
      <textarea
        ref={textareaRef}
        className="grammar-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={10}
        spellCheck={false}
      />
      <div className="row grammar-toolbar">
        <button type="button" onClick={insertEpsilon}>
          Insert ε
        </button>
      </div>
    </section>
  );
}
