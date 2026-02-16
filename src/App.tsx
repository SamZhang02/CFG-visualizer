import { useEffect, useMemo, useState } from 'react';
import {
  generateExampleStrings,
  parseGrammar,
  type ParseTreeNode,
  parseTreesForTokens,
  tokenizeInputForGrammar,
} from './cfg';
import { ExamplesPanel } from './components/ExamplesPanel';
import { GrammarEditor } from './components/GrammarEditor';
import { MembershipPanel } from './components/MembershipPanel';
import { ParseTreePanel } from './components/ParseTreePanel';

const DEFAULT_GRAMMAR = `S -> aSb | ε`;
const GRAMMAR_STORAGE_KEY = 'cfg-visualizer.grammar-text';

export default function App(): JSX.Element {
  const [grammarText, setGrammarText] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_GRAMMAR;
    }

    const saved = window.localStorage.getItem(GRAMMAR_STORAGE_KEY);
    return saved ?? DEFAULT_GRAMMAR;
  });
  const [inputText, setInputText] = useState<string>('');
  const [membershipResult, setMembershipResult] = useState<boolean | null>(null);
  const [examples, setExamples] = useState<string[]>([]);
  const [parseTrees, setParseTrees] = useState<ParseTreeNode[]>([]);
  const [selectedParseIndex, setSelectedParseIndex] = useState<number>(0);
  const [treesTruncated, setTreesTruncated] = useState<boolean>(false);

  useEffect(() => {
    window.localStorage.setItem(GRAMMAR_STORAGE_KEY, grammarText);
  }, [grammarText]);

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

  useEffect(() => {
    setMembershipResult(null);
    setParseTrees([]);
    setSelectedParseIndex(0);
    setTreesTruncated(false);
  }, [grammarText, inputText]);

  const handleCheckMembership = (): void => {
    if (!parseResult.ok) {
      setMembershipResult(null);
      setParseTrees([]);
      setSelectedParseIndex(0);
      setTreesTruncated(false);
      return;
    }

    const tokens = tokenizeInputForGrammar(inputText, parseResult.grammar);
    const parseTreesResult = parseTreesForTokens(parseResult.grammar, tokens, { maxTrees: 30 });
    setMembershipResult(parseTreesResult.accepted);
    setParseTrees(parseTreesResult.trees);
    setSelectedParseIndex(0);
    setTreesTruncated(parseTreesResult.truncated);
  };

  const handleGenerateExamples = (
    count: number,
    maxLength: number,
    forceTokenSpacing: boolean,
  ): void => {
    if (!parseResult.ok) {
      setExamples([]);
      return;
    }

    const generated = generateExampleStrings(parseResult.grammar, {
      count,
      maxLength,
      forceTokenSpacing,
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

      <ParseTreePanel
        input={inputText}
        accepted={membershipResult}
        trees={parseTrees}
        selectedIndex={selectedParseIndex}
        onSelectIndex={setSelectedParseIndex}
        truncated={treesTruncated}
      />
    </main>
  );
}
