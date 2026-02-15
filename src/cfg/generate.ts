import type { Grammar, SymbolRef } from './types';

type GenerateOptions = {
  count: number;
  maxLength: number;
  maxExpansions?: number;
};

type QueueState = {
  form: SymbolRef[];
  depth: number;
};

function serializedForm(form: SymbolRef[]): string {
  return form.map((s) => `${s.kind[0]}:${s.value}`).join(' ');
}

function countTerminals(form: SymbolRef[]): number {
  return form.reduce((sum, symbol) => sum + (symbol.kind === 'terminal' ? 1 : 0), 0);
}

function formatTerminalOutput(tokens: string[]): string {
  if (tokens.length === 0) {
    return 'ε';
  }

  const allSingleChar = tokens.every((token) => token.length === 1);
  return allSingleChar ? tokens.join('') : tokens.join(' ');
}

export function generateExampleStrings(grammar: Grammar, options: GenerateOptions): string[] {
  const maxExpansions = options.maxExpansions ?? 5000;
  const output = new Set<string>();
  const visited = new Set<string>();

  const queue: QueueState[] = [
    {
      form: [{ kind: 'nonterminal', value: grammar.startSymbol }],
      depth: 0,
    },
  ];

  while (queue.length > 0 && output.size < options.count && visited.size < maxExpansions) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    const key = serializedForm(current.form);
    if (visited.has(key)) {
      continue;
    }
    visited.add(key);

    const firstNonTerminalIndex = current.form.findIndex((symbol) => symbol.kind === 'nonterminal');

    if (firstNonTerminalIndex === -1) {
      const text = formatTerminalOutput(current.form.map((symbol) => symbol.value));
      output.add(text);
      continue;
    }

    const selected = current.form[firstNonTerminalIndex];
    if (selected.kind !== 'nonterminal') {
      continue;
    }

    const productions = grammar.byLhs.get(selected.value) ?? [];
    for (const production of productions) {
      const nextForm = [
        ...current.form.slice(0, firstNonTerminalIndex),
        ...production.rhs,
        ...current.form.slice(firstNonTerminalIndex + 1),
      ];

      if (countTerminals(nextForm) > options.maxLength) {
        continue;
      }

      queue.push({ form: nextForm, depth: current.depth + 1 });
    }
  }

  return Array.from(output);
}
