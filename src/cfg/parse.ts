import type { Grammar, ParseGrammarResult, Production, SymbolRef } from './types';

const EPSILON_TOKENS = new Set(['ε', 'eps', 'epsilon']);

function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

function isUpperStart(char: string): boolean {
  return /[A-Z]/.test(char);
}

function isLowerIdentifierStart(char: string): boolean {
  return /[a-z0-9_]/.test(char);
}

function isUpperIdentifierContinuation(char: string): boolean {
  return /[A-Z0-9_]/.test(char);
}

function splitAlternatives(rhs: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: string | null = null;

  for (let i = 0; i < rhs.length; i += 1) {
    const char = rhs[i];

    if (quote !== null) {
      current += char;
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === '|') {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  parts.push(current.trim());
  return parts;
}

function stripTrailingProductionSemicolon(rhs: string): string {
  let quote: string | null = null;
  let lastNonWhitespaceOutsideQuote = -1;

  for (let i = 0; i < rhs.length; i += 1) {
    const char = rhs[i];

    if (quote !== null) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (!isWhitespace(char)) {
      lastNonWhitespaceOutsideQuote = i;
    }
  }

  if (lastNonWhitespaceOutsideQuote >= 0 && rhs[lastNonWhitespaceOutsideQuote] === ';') {
    return rhs.slice(0, lastNonWhitespaceOutsideQuote).trimEnd();
  }

  return rhs;
}

function parseAlternative(alt: string, lineNumber: number): SymbolRef[] {
  if (alt.length === 0) {
    return [];
  }

  if (EPSILON_TOKENS.has(alt)) {
    return [];
  }

  const result: SymbolRef[] = [];
  const tokenizedByWhitespace = /\s/.test(alt);
  let i = 0;

  while (i < alt.length) {
    const char = alt[i];

    if (isWhitespace(char)) {
      i += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      const quote = char;
      let j = i + 1;
      let value = '';

      while (j < alt.length && alt[j] !== quote) {
        value += alt[j];
        j += 1;
      }

      if (j >= alt.length) {
        throw new Error(`Unclosed quote on line ${lineNumber}.`);
      }

      const normalizedValue = value.trim();
      if (normalizedValue.length === 0) {
        throw new Error(`Empty quoted terminal on line ${lineNumber}.`);
      }

      result.push({ kind: 'terminal', value: normalizedValue });
      i = j + 1;
      continue;
    }

    if (isUpperStart(char)) {
      let j = i + 1;
      while (j < alt.length && isUpperIdentifierContinuation(alt[j])) {
        j += 1;
      }

      result.push({ kind: 'nonterminal', value: alt.slice(i, j) });
      i = j;
      continue;
    }

    if (isLowerIdentifierStart(char)) {
      let j = i + 1;
      if (tokenizedByWhitespace) {
        while (j < alt.length && isLowerIdentifierStart(alt[j])) {
          j += 1;
        }
      }

      result.push({ kind: 'terminal', value: alt.slice(i, j) });
      i = j;
      continue;
    }

    result.push({ kind: 'terminal', value: char });
    i += 1;
  }

  if (
    result.length === 1 &&
    result[0].kind === 'terminal' &&
    EPSILON_TOKENS.has(result[0].value)
  ) {
    return [];
  }

  return result;
}

function buildGrammar(productions: Production[], startSymbol: string): Grammar {
  const byLhs = new Map<string, Production[]>();

  for (const production of productions) {
    const existing = byLhs.get(production.lhs);
    if (existing) {
      existing.push(production);
    } else {
      byLhs.set(production.lhs, [production]);
    }
  }

  return {
    startSymbol,
    productions,
    byLhs,
  };
}

export function parseGrammar(source: string): ParseGrammarResult {
  const lines = source
    .split('\n')
    .map((line) => line.replace(/#.*/, '').replace(/\/\/.*$/, '').trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error('Grammar is empty. Add at least one production like S -> aSb | ε.');
  }

  const productions: Production[] = [];
  const warnings: string[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineNumber = lineIndex + 1;
    const line = lines[lineIndex];
    const arrowIndex = line.indexOf('->');

    if (arrowIndex < 0) {
      throw new Error(`Missing '->' on line ${lineNumber}.`);
    }

    const lhs = line.slice(0, arrowIndex).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(lhs)) {
      throw new Error(
        `Invalid nonterminal '${lhs}' on line ${lineNumber}. Use ALL CAPS names like S, EXPR, A1.`,
      );
    }

    const rhsSource = stripTrailingProductionSemicolon(line.slice(arrowIndex + 2).trim());
    const alternatives = splitAlternatives(rhsSource);

    if (alternatives.length === 0) {
      throw new Error(`Missing right-hand side on line ${lineNumber}.`);
    }

    for (const alt of alternatives) {
      const rhs = parseAlternative(alt, lineNumber);
      productions.push({ lhs, rhs });
    }
  }

  const startSymbol = productions[0].lhs;

  const declared = new Set(productions.map((p) => p.lhs));
  const referenced = new Set(
    productions
      .flatMap((p) => p.rhs)
      .filter((symbol) => symbol.kind === 'nonterminal')
      .map((symbol) => symbol.value),
  );

  for (const nt of referenced) {
    if (!declared.has(nt)) {
      warnings.push(`Nonterminal '${nt}' is referenced but has no production.`);
    }
  }

  return {
    grammar: buildGrammar(productions, startSymbol),
    warnings,
  };
}

export function tokenizeInput(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return [];
  }

  if (/\s/.test(trimmed)) {
    return trimmed.split(/\s+/).filter((token) => token.length > 0);
  }

  return Array.from(trimmed);
}

export function tokenizeInputForGrammar(value: string, grammar: Grammar): string[] {
  const source = value.trim();
  if (source.length === 0) {
    return [];
  }

  const terminals = Array.from(
    new Set(
      grammar.productions
        .flatMap((production) => production.rhs)
        .filter((symbol): symbol is Extract<SymbolRef, { kind: 'terminal' }> => symbol.kind === 'terminal')
        .map((symbol) => symbol.value)
        .filter((terminal) => terminal.length > 0),
    ),
  ).sort((a, b) => b.length - a.length);

  const tokens: string[] = [];
  let i = 0;

  while (i < source.length) {
    if (isWhitespace(source[i])) {
      i += 1;
      continue;
    }

    let matched: string | null = null;
    for (const terminal of terminals) {
      if (source.startsWith(terminal, i)) {
        matched = terminal;
        break;
      }
    }

    if (matched !== null) {
      tokens.push(matched);
      i += matched.length;
      continue;
    }

    let j = i + 1;
    while (j < source.length && !isWhitespace(source[j])) {
      j += 1;
    }
    tokens.push(source.slice(i, j));
    i = j;
  }

  return tokens;
}
