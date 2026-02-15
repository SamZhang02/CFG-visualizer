# CFG Visualizer

This is a fully AI-generated tool made for studying for a computational theory class. It does **not** guarantee correctness.

## What This App Does

A frontend-only React app for experimenting with context-free grammars (CFGs):
- Enter grammar productions (for example: `S -> aSb | ε`)
- Check whether an input string is in the language
- Generate example strings from the grammar

CFG-specific logic (parsing, membership checking, generation) is separated from UI/rendering code.

## Run Locally

Prerequisites:
- `pnpm`
- `just`

Commands:
```bash
just install
just dev
```

Other useful commands:
```bash
just typecheck
just build
just preview
```
