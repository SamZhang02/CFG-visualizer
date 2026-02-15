export type TerminalSymbol = {
  kind: 'terminal';
  value: string;
};

export type NonTerminalSymbol = {
  kind: 'nonterminal';
  value: string;
};

export type SymbolRef = TerminalSymbol | NonTerminalSymbol;

export type Production = {
  lhs: string;
  rhs: SymbolRef[];
};

export type Grammar = {
  startSymbol: string;
  productions: Production[];
  byLhs: Map<string, Production[]>;
};

export type ParseGrammarResult = {
  grammar: Grammar;
  warnings: string[];
};
