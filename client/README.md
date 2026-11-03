# FluxOne Inventory — Client

React + Vite admin / inventory / branch portals.

- **Language:** JavaScript / JSX only (no TypeScript unless the team decides later)
- **Architecture & conventions:** see **[ARCHITECTURE.md](./ARCHITECTURE.md)** (folder map, data-fetching rules, golden examples, cross-links)
- **Hooks live under** `src/hooks/{admin|inventory|branch|shared}/` — pages/layouts must not call `apiClient` directly
- **Lib helpers** under `src/lib/{products|control|orders|export|…}/` (shared utils stay at `lib/` root)
- **PR checklist:** [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md)

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173 (proxies /api → :5000)
npm run build
npm run lint
npm run preview
```

## React Compiler

The React Compiler is enabled via the Vite React plugin. See [React Compiler docs](https://react.dev/learn/react-compiler).
