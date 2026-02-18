set shell := ["zsh", "-cu"]

install:
    pnpm install

dev:
    pnpm dev

build:
    pnpm build

preview:
    pnpm preview

typecheck:
    pnpm typecheck

deploy:
    pnpm run deploy
