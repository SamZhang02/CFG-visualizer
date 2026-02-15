import { useMemo, useState } from 'react';
import { generateExampleStrings, isStringInGrammar, parseGrammar, tokenizeInput } from './cfg';
import { ExamplesPanel } from './components/ExamplesPanel';
import { GrammarEditor } from './components/GrammarEditor';
import { MembershipPanel } from './components/MembershipPanel';

const DEFAULT_GRAMMAR = `S -> aSb | ε`;

export default function App(): JSX.Element {
  const [grammarText, setGrammarText] = useState<string>(DEFAULT_GRAMMAR);
  const [inputText, setInputText] = useState<string>('');
  const [membershipResult, setMembershipResult] = useState<boolean | null>(null);
  const [examples, setExamples] = useState<string[]>([]);

  const parseResult = useMemo(() => {
    try {
      return {
        ok: true as const,
        ...parseGrammar(grammarText),
      };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : 'Failed to parse grammar.',
      };
    }
  }, [grammarText]);

  const handleCheckMembership = (): void => {
    if (!parseResult.ok) {
      setMembershipResult(null);
      return;
    }

    const tokens = tokenizeInput(inputText);
    const isAccepted = isStringInGrammar(parseResult.grammar, tokens);
    setMembershipResult(isAccepted);
  };

  const handleGenerateExamples = (count: number, maxLength: number): void => {
    if (!parseResult.ok) {
      setExamples([]);
      return;
    }

    const generated = generateExampleStrings(parseResult.grammar, {
      count,
      maxLength,
    });
    setExamples(generated);
  };

  return (
    <main className="app-shell">
      <header>
        <h1>CFG Visualizer</h1>
        <p className="subtitle">
          Parse context-free grammars, test membership, and generate example strings.
        </p>
      </header>

      <GrammarEditor value={grammarText} onChange={setGrammarText} />

      {!parseResult.ok ? (
        <p className="error">{parseResult.error}</p>
      ) : (
        parseResult.warnings.length > 0 && (
          <ul className="warnings">
            {parseResult.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )
      )}

      <section className="grid">
        <MembershipPanel
          input={inputText}
          onInputChange={setInputText}
          onCheck={handleCheckMembership}
          result={membershipResult}
          disabled={!parseResult.ok}
        />

        <ExamplesPanel
          onGenerate={handleGenerateExamples}
          examples={examples}
          disabled={!parseResult.ok}
        />
      </section>
    </main>
  );
}
