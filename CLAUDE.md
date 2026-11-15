# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Daily Hub is a Romanian-language, offline-capable PWA for a family of 4 (2 adults + 2 children): a budget tracker plus a recipe book with a weekly meal plan and shopping list. All UI text is Romanian (with diacritics); dates and money use the `ro-RO` locale and amounts are in lei.

There is no build step, package manager, framework or test suite. The whole app is `index.html` (inline CSS + one inline `<script>`); `sw.js` is the service worker and `manifest.webmanifest` the PWA manifest.

## Running

Serve the folder over HTTP, e.g. `python3 -m http.server 8000`, and open `http://localhost:8000`. Opening `index.html` as a `file://` URL works but the service worker is not registered (it is only registered on http/https).

## Workflow rules

- Commit every logical change with a clear message and `git push` (remote `origin`, branch `main`, private repo). The user wants every change backed up so it can be rolled back.
- Whenever `index.html` (or any cached file) changes, bump `VERSION` in `sw.js` (`daily-hub-vN`) so installed phones pick up the new version. The cached file list is `FILES` in `sw.js`; add new assets there.
- The JS is typed with JSDoc and kept clean under strict TypeScript checking (`checkJs`), with no config file in the repo. Keep new code annotated: typedefs for the data model live at the top of the `Data` section of the script (`Expense`, `BudgetData`, `Recipe`, `PlanDay`, `Settings`, `RecipeData`, `ShopItem`); use the `$`, `up`, `tgt` helpers and casts in the existing style.

## Architecture (inside index.html)

- **Views**: three `<section class="view">` elements (`view-home`, `view-budget`, `view-recipes`) switched by `go(v)` and synced with `location.hash` (`#home`, `#budget`, `#recipes`; the manifest shortcuts rely on these). The recipes view has sub-tabs (`rSeg` buttons / `data-rsub` panels) switched by `rSub()`.
- **State**: two global objects persisted to `localStorage` via `load()`/`store()`:
  - `B` (key `K.budget` = `budget-tracker-v1`): expenses and categories, saved with `saveB()`.
  - `R` (key `K.food` = `recipe-book-v1`): recipes, picked/checked shopping state, `settings` (food budget, persons, reserve %, snacks), the weekly `plan` and `libVersion`, saved with `saveR()`.
  The storage keys are kept from two earlier separate apps that were merged, so existing user data still loads; don't rename them.
- **Rendering**: there is no reactivity. After mutating state, call the relevant render functions (`bRender*`, `rRender*`, `renderPlan`, `renderHome`) or `renderEverything()`. HTML is built from template strings, so always escape user data with `esc()`.
- **Recipe library and migrations**: `LIBRARY` is the built-in recipe collection (ids ≥ 1001, with `meal`, `cost` in lei for all servings, and `kid` = how to make the portion spicy for one child). `rMigrate()` runs at startup and after an import: it fills defaults and, when `R.libVersion < LIB_VERSION`, merges in missing library recipes without touching user edits. Bump `LIB_VERSION` when you add library recipes.
- **Budget ↔ recipes link**: buying the shopping list records an expense with `source: 'retete'` in the food category (`foodCategory()` creates "Mâncare" if missing). `isFood()`/`foodSpent()` drive the "already spent this month" figure in the meal plan and budget views.
- **Meal plan**: `generatePlan()` fills 7 days × slots `b`/`l`/`d`/`s` (breakfast, lunch, dinner, snack) from recipes grouped by `meal` (`'mic dejun' | 'principal' | 'gustare'`). `buildShopList()` aggregates ingredients via `parseIngredient()` (Romanian/English unit aliases in `UNITS`, singularisation via `IRREGULAR`).
- **Backup**: export/import of one JSON file (`{app: 'daily-hub', version: 1, budget, recipes}`); import also accepts backups from the old single apps.
- **Service worker**: network-first with cache fallback, same-origin GET only; old caches are deleted on activate.
