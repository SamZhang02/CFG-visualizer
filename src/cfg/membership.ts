import type { Grammar, SymbolRef } from './types';

type EarleyState = {
  lhs: string;
  rhs: SymbolRef[];
  dot: number;
  origin: number;
};

export type ParseTreeTerminal = {
  kind: 'terminal';
  value: string;
  tokenIndex: number;
};

export type ParseTreeNode = {
  kind: 'nonterminal';
  value: string;
  start: number;
  end: number;
  children: ParseTreeChild[];
};

export type ParseTreeChild = ParseTreeNode | ParseTreeTerminal;

export type ParseTreesResult = {
  accepted: boolean;
  trees: ParseTreeNode[];
  truncated: boolean;
};

type CompletedState = EarleyState & { end: number };

type ParseTreeOptions = {
  maxTrees?: number;
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

function buildChart(grammar: Grammar, tokens: string[]): Map<string, EarleyState>[] {
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

        // If this nonterminal is already complete at the current position
        // (for example via an epsilon production), advance immediately so
        // completion order does not affect recognition.
        for (const completed of chart[i].values()) {
          if (!isComplete(completed)) {
            continue;
          }
          if (completed.lhs !== expected.value || completed.origin !== i) {
            continue;
          }
          const next = advance(state);
          if (addState(chart[i], next)) {
            states.push(next);
          }
          break;
        }
      } else if (i < n && tokens[i] === expected.value) {
        addState(chart[i + 1], advance(state));
      }
    }
  }

  return chart;
}

function isAccepted(chart: Map<string, EarleyState>[], inputLength: number): boolean {
  for (const state of chart[inputLength].values()) {
    if (state.lhs === '$start' && state.origin === 0 && state.dot === state.rhs.length) {
      return true;
    }
  }
  return false;
}

function completedStateId(state: CompletedState): string {
  return `${stateKey(state)}|${state.end}`;
}

function completedIndexKey(lhs: string, start: number, end: number): string {
  return `${lhs}|${start}|${end}`;
}

export function parseTreesForTokens(
  grammar: Grammar,
  tokens: string[],
  options?: ParseTreeOptions,
): ParseTreesResult {
  const chart = buildChart(grammar, tokens);
  const n = tokens.length;
  const accepted = isAccepted(chart, n);

  const maxTrees = Math.max(0, options?.maxTrees ?? 20);
  if (!accepted || maxTrees === 0) {
    return {
      accepted,
      trees: [],
      truncated: false,
    };
  }

  const completedBySpan = new Map<string, CompletedState[]>();
  const stateById = new Map<string, CompletedState>();
  const acceptingStartIds: string[] = [];

  for (let end = 0; end < chart.length; end += 1) {
    for (const state of chart[end].values()) {
      if (!isComplete(state)) {
        continue;
      }
      const completed: CompletedState = { ...state, end };
      const id = completedStateId(completed);
      stateById.set(id, completed);

      const key = completedIndexKey(completed.lhs, completed.origin, completed.end);
      const existing = completedBySpan.get(key);
      if (existing) {
        existing.push(completed);
      } else {
        completedBySpan.set(key, [completed]);
      }

      if (
        completed.lhs === '$start' &&
        completed.origin === 0 &&
        completed.end === n &&
        completed.rhs.length === 1
      ) {
        acceptingStartIds.push(id);
      }
    }
  }

  const derivationMemo = new Map<string, ParseTreeChild[][]>();
  const treeMemo = new Map<string, ParseTreeNode[]>();
  const inProgress = new Set<string>();
  let truncated = false;

  function pushLimited<T>(items: T[], item: T): void {
    if (items.length < maxTrees) {
      items.push(item);
      return;
    }
    truncated = true;
  }

  function deriveRhs(
    rhs: SymbolRef[],
    symbolIndex: number,
    start: number,
    end: number,
  ): ParseTreeChild[][] {
    const memoKey = `${rhs
      .map((symbol) => `${symbol.kind}:${symbol.value}`)
      .join(',')}|${symbolIndex}|${start}|${end}`;
    const existing = derivationMemo.get(memoKey);
    if (existing) {
      return existing;
    }

    if (symbolIndex >= rhs.length) {
      return start === end ? [[]] : [];
    }

    const symbol = rhs[symbolIndex];
    const results: ParseTreeChild[][] = [];

    if (symbol.kind === 'terminal') {
      if (start < end && tokens[start] === symbol.value) {
        const tails = deriveRhs(rhs, symbolIndex + 1, start + 1, end);
        for (const tail of tails) {
          pushLimited(results, [
            {
              kind: 'terminal',
              value: symbol.value,
              tokenIndex: start,
            },
            ...tail,
          ]);
          if (results.length >= maxTrees) {
            break;
          }
        }
      }
      derivationMemo.set(memoKey, results);
      return results;
    }

    for (let split = start; split <= end; split += 1) {
      const key = completedIndexKey(symbol.value, start, split);
      const candidates = completedBySpan.get(key) ?? [];
      for (const candidate of candidates) {
        const childTrees = treesForCompletedState(completedStateId(candidate));
        if (childTrees.length === 0) {
          continue;
        }
        const tails = deriveRhs(rhs, symbolIndex + 1, split, end);
        if (tails.length === 0) {
          continue;
        }
        for (const tree of childTrees) {
          for (const tail of tails) {
            pushLimited(results, [tree, ...tail]);
            if (results.length >= maxTrees) {
              break;
            }
          }
          if (results.length >= maxTrees) {
            break;
          }
        }
        if (results.length >= maxTrees) {
          break;
        }
      }
      if (results.length >= maxTrees) {
        break;
      }
    }

    derivationMemo.set(memoKey, results);
    return results;
  }

  function treesForCompletedState(stateId: string): ParseTreeNode[] {
    const memoized = treeMemo.get(stateId);
    if (memoized) {
      return memoized;
    }

    if (inProgress.has(stateId)) {
      return [];
    }

    const state = stateById.get(stateId);
    if (!state || !isComplete(state)) {
      return [];
    }

    inProgress.add(stateId);
    const derivations = deriveRhs(state.rhs, 0, state.origin, state.end);
    const nodes: ParseTreeNode[] = [];

    for (const children of derivations) {
      pushLimited(nodes, {
        kind: 'nonterminal',
        value: state.lhs,
        start: state.origin,
        end: state.end,
        children,
      });
      if (nodes.length >= maxTrees) {
        break;
      }
    }

    treeMemo.set(stateId, nodes);
    inProgress.delete(stateId);
    return nodes;
  }

  const roots: ParseTreeNode[] = [];
  for (const startId of acceptingStartIds) {
    const rootWrappers = treesForCompletedState(startId);
    for (const wrapper of rootWrappers) {
      const rootChild = wrapper.children[0];
      if (rootChild && rootChild.kind === 'nonterminal') {
        pushLimited(roots, rootChild);
      }
      if (roots.length >= maxTrees) {
        break;
      }
    }
    if (roots.length >= maxTrees) {
      break;
    }
  }

  return {
    accepted,
    trees: roots,
    truncated,
  };
}

export function isStringInGrammar(grammar: Grammar, tokens: string[]): boolean {
  const chart = buildChart(grammar, tokens);
  return isAccepted(chart, tokens.length);
}
