# AGENTS.md — @cyguin/survey

## Build

```bash
npm install --legacy-peer-deps
npx tsc --noEmit       # type check
npx vitest run         # tests
```

## Publish

```bash
npm install
npm run build
# CI publishes on tag push (v*)
```
