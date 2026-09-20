# Copilot instructions for `my-first-app`

説明やユーザー向けの案内は日本語で表示してください。

## Project shape

This is a dependency-free static browser game: **STARBOUND RUNNER**, a neon-themed side-scrolling action MVP. The application is intentionally kept to three runtime files:

- `index.html` owns the semantic shell, HUD, start/result overlays, controls legend, and the `#gameCanvas` mount point.
- `style.css` owns the visual system, layout, responsive behavior, and overlay presentation. It imports the Barlow Condensed and Space Mono fonts from Google Fonts.
- `game.js` owns all game state, input, physics, collision checks, scoring, camera movement, particle effects, and Canvas 2D rendering.

The HTML/CSS UI and the Canvas scene are two layers of the same screen. `game.js` updates the HTML HUD (`score`, `distance`, and `energy`) while drawing world entities on the Canvas. There is no framework, bundler, package manifest, asset pipeline, or server-side code.

## Run and validate

There are currently no `package.json` scripts, build command, lint command, or automated test suite. There is consequently no single-test command yet.

Serve the repository root over HTTP for local browser testing:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. Serving rather than opening the file directly keeps browser behavior consistent and allows the external font stylesheet to load normally.

The available JavaScript syntax check is:

```bash
node --check game.js
```

For a change affecting gameplay, manually smoke-test starting/restarting, left/right movement, jump, X-shot, core collection, enemy damage, falling, reaching the gate, HUD updates, and the narrow responsive layout.

## Architecture and game-loop conventions

- `resetGame()` is the single place that initializes a run. Keep level geometry and entity seed data there unless a reusable data module is introduced.
- `state` is the run state (`ready`, `playing`, `won`, or `lost`). `startGame()` resets state and starts `requestAnimationFrame`; `finish()` stops the loop by changing state and shows the result overlay.
- `update(dt)` is simulation-only: input, player physics, platform landing, collection, enemy movement/collision, shots, particles, camera, distance, and win/lose checks. Keep time-based movement multiplied by `dt`.
- `draw()` is rendering-only and paints the entire frame in world order: background/stars, parallax skyline, platforms, collectibles, enemies, shots, particles, player, and gate label.
- World coordinates are larger than the viewport (`worldWidth` is 6600). Most world drawing goes through `rect()`, which subtracts `camera`; preserve that camera convention when adding entities.
- Canvas coordinates are CSS-size based and scaled for `devicePixelRatio` in `resize()`. Use `width` and `height` for viewport dimensions, not the backing pixel dimensions.
- Entity collections are plain arrays of small objects (`platforms`, `cores`, `enemies`, `shots`, `particles`, and `stars`). Existing collision checks are simple axis-aligned bounds/proximity checks; follow that style for MVP additions.
- Keyboard input is tracked in the shared `keys` object. Existing bindings are Arrow keys/A-D for movement, Space/ArrowUp/W for jump, and X for shooting. Prevent default browser behavior for gameplay keys when adding bindings.
- Gameplay values are updated in JavaScript and reflected in the DOM through `updateHud()`. Update that function when introducing a new HUD value rather than manipulating HUD elements throughout the loop.
- Visual styling uses the existing cyan/violet neon palette, CSS variables, compact one-line rule style, and a single `@media (max-width: 700px)` breakpoint. Keep game presentation changes in `style.css`; do not add inline styles to the HTML.
- Keep the runtime dependency-free and preserve the three-file application boundary unless the user explicitly requests a build system, framework, assets, or additional runtime files.
