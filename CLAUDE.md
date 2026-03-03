# QBAN Mobile

## Auto-commit rule

After every change (file create, edit, or delete), commit and push to origin/main immediately. Use descriptive commit messages. Do not batch unrelated changes — commit each logical unit separately.

## Project

- Mobile app for QBAN Exchange (perpetual futures DEX on Solana)
- Product doc: `PRODUCT_DOC.md` — this is the **source of truth** for all features, screens, and decisions
- Brand kit: `~/Documents/qban-brand-kit.html`
- Web app (reference): `~/Documents/solana-stuff/perp-ui`
- Tech stack: Expo, TypeScript, NativeWind, Privy, TradingView Lightweight Charts (WebView)

## Development Rules

### Source of truth
- `PRODUCT_DOC.md` is the single source of truth for all features, UX, and design decisions
- If there is any ambiguity or missing detail, use `/askuserquestion` to ask the user before proceeding — do NOT guess

### MVP tracker
- After completing each task, update the corresponding row in the MVP Tracker table in `PRODUCT_DOC.md` from `Not Started` → `In Progress` → `Done`
- Do this immediately after the task is finished, before moving to the next task

### Commit discipline
- Commit and push after every completed task (not after every file — after every logical task)
- Commit message should reference the task number (e.g., "1.1: Initialize Expo project with TypeScript")

### Code quality
- Follow the Expo Router file-based routing conventions
- Use TypeScript strict mode — no `any` types
- Use NativeWind for all styling — no inline StyleSheet unless NativeWind can't handle it
- Reuse code from `~/Documents/solana-stuff/perp-ui` wherever possible (API layer, types, trading logic)
- Keep components small and focused — one component per file
- Use the brand kit colors and fonts as defined in `PRODUCT_DOC.md` Brand Kit Reference section

### Phase workflow
1. Read the phase tasks from the MVP Tracker in `PRODUCT_DOC.md`
2. Work through tasks in order (1.1, 1.2, 1.3, etc.)
3. For each task: implement → test that it works → update tracker → commit & push
4. If blocked or unsure, ask the user before proceeding
