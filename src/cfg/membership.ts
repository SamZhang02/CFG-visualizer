import type { Grammar, SymbolRef } from './types';

type EarleyState = {
  lhs: string;
  rhs: SymbolRef[];
  dot: number;
  origin: number;
};

function stateKey(state: EarleyState): string {
  const rhs = state.rhs
    .map((symbol) => `${symbol.kind === 'terminal' ? 't' : 'n'}:${symbol.value}`)
    .join(' ');
  return `${state.lhs}|${rhs}|${state.dot}|${state.origin}`;
}

function advance(state: EarleyState): EarleyState {
  return {
    lhs: state.lhs,
    rhs: state.rhs,
    dot: state.dot + 1,
    origin: state.origin,
  };
}

function expectedSymbol(state: EarleyState): SymbolRef | null {
  if (state.dot >= state.rhs.length) {
    return null;
  }
  return state.rhs[state.dot];
}

function isComplete(state: EarleyState): boolean {
  return state.dot >= state.rhs.length;
}

function addState(chart: Map<string, EarleyState>, state: EarleyState): boolean {
  const key = stateKey(state);
  if (chart.has(key)) {
    return false;
  }
  chart.set(key, state);
  return true;
}

export function isStringInGrammar(grammar: Grammar, tokens: string[]): boolean {
  const n = tokens.length;
  const chart: Map<string, EarleyState>[] = Array.from(
    { length: n + 1 },
    () => new Map<string, EarleyState>(),
  );

  const startState: EarleyState = {
    lhs: '$start',
    rhs: [{ kind: 'nonterminal', value: grammar.startSymbol }],
    dot: 0,
    origin: 0,
  };

  addState(chart[0], startState);

  for (let i = 0; i <= n; i += 1) {
    const states = Array.from(chart[i].values());

    for (let p = 0; p < states.length; p += 1) {
      const state = states[p];

      if (isComplete(state)) {
        for (const candidate of chart[state.origin].values()) {
          const expected = expectedSymbol(candidate);
          if (expected && expected.kind === 'nonterminal' && expected.value === state.lhs) {
            const next = advance(candidate);
            if (addState(chart[i], next)) {
              states.push(next);
            }
          }
        }
        continue;
      }

      const expected = expectedSymbol(state);
      if (!expected) {
        continue;
      }

      if (expected.kind === 'nonterminal') {
        const productions = grammar.byLhs.get(expected.value) ?? [];
        for (const production of productions) {
          const next: EarleyState = {
            lhs: production.lhs,
            rhs: production.rhs,
            dot: 0,
            origin: i,
          };
          if (addState(chart[i], next)) {
            states.push(next);
          }
        }
      } else if (i < n && tokens[i] === expected.value) {
        addState(chart[i + 1], advance(state));
      }
    }
  }

  for (const state of chart[n].values()) {
    if (
      state.lhs === '$start' &&
      state.origin === 0 &&
      state.dot === state.rhs.length
    ) {
      return true;
    }
  }

  return false;
}
