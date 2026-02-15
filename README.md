# CFG Visualizer
<img width="3190" height="1988" alt="CleanShot 2026-02-15 at 10 38 09@2x" src="https://github.com/user-attachments/assets/33fa47d4-dd2c-4992-90f0-e3fb140650b4" />

This is a fully AI-generated tool made for studying for a computational theory class. It might not always be correct.

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
