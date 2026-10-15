# Everyone a Data Scientist

A minimal research gallery for Hyeon Jeon. White background and Arial type. A compact title, two research area names, paper cards, and a shared description area.

## Run locally

```sh
npm run dev
```

Open http://127.0.0.1:5173. No dependency installation is needed. `PORT=8080 npm run dev` changes the port.

To access the gallery from another device on the same Wi-Fi, run `npm run dev:lan` and open `http://<this-computer-Wi-Fi-IP>:5173` on that device. The server keeps serving only `dist/`; localhost remains available too.

## Presentation and interaction

- X and Y axis selectors support Category (coarse), Category (fine), Year, Venue, and Authorship. Y can also be None. The same dimension cannot be selected for both axes.
- Axis menus render directly beneath their buttons inside the page. Arrow keys, Home/End, Enter, and Escape work; clicking outside closes the menu.
- The default Category/None view puts Analysis left and Communication right on every screen, including portrait mobile. Selecting Y creates an intersection grid, with X labels across the top and horizontal Y labels along the right edge.
- Category (fine) keeps Analysis / Communication parent labels. With only X selected, all six groups stay in columns across the top on every screen. Fine categories are provisional and editable through each paper's `fineCategory` field:
  - Understanding Problem: High-dimensional Backstage, Stop Misusing t-SNE & UMAP, Navigating Backstage, Perceptual Bias in DR.
  - Evaluation: Clustering Validation, CLAMS, Steadiness & Cohesiveness, Classes are not Clusters, ZADU, Metric Design ≠ Behavior.
  - Optimization: Dataset-Adaptive DR and both UMATO papers.
  - Interaction: Distortion-aware Brushing, ClusterSense.
  - Chart Authoring: Visualization Autocomplete, TailVis, ggaction, VL2NL.
  - Perception & Cognition: Misleading Visual Elements, DR in Four Domains.
- “Data Analysis for Everyone” and “Data Communication for Everyone” share a line count on the same axis: both one line when they fit, otherwise both two lines, with “for Everyone” on the second line. Labels on the same axis and hierarchy level share one font size, fitted to the longest label; fine labels stay smaller than every visible coarse label.
- Venue groups: ACM CHI (CHI and related SIGCHI venues), IEEE VIS (VIS, VAST, and TVCG), and Others (EuroVis, Information Visualization, PacificVis, TPAMI, the Perceptual Bias VisComm workshop paper, and CHI 2027 under-review papers). Year uses the publication year in the paper record; authorship includes co-first authors with first authors.
- Axis changes preserve every selected paper exactly once, including empty intersections. Inner card columns are optimized to fit the available matrix space.
- Row labels reserve their text height so fine-category parent labels do not overlap. If a dense matrix cannot fit a very short viewport, it scrolls vertically with all cards present.
- Cards are always square and share one size across groups and cells. One-axis groups share the same number of row tracks, with empty slots allowed in shorter groups so uneven paper counts do not force extra columns and smaller cards. The layout searches column counts to maximize visible card area and recalculates on viewport and container size changes.
- Each card has a navy (`#263c87`) or dark red (`#872f3c`) boundary. Leading-author papers (first/co-first author) use a 2px solid border; other co-authored papers use a 1px dashed border on both faces. The legend sits beside Show venue and uses “Leading author,” as does the Authorship axis. There is no border around the research areas.
- Fronts show the paper figure with its representative name in the upper-left corner and venue in the lower-right corner (e.g. CHI 2024 or VIS 2023 / TVCG). TVCG labels use the recorded VIS presentation year, including invited presentations; under-review status remains explicit. Backs show only venue logos.
- Show venue flips every card together. The button changes to Show thumbnails to restore the fronts; the selected face persists when changing axes or resizing. Hover/tap still shows the paper details in venue mode.
- Mouse hover or keyboard focus flips a card and shows its title, authors, and venue. Clicking or pressing Enter opens the paper PDF from the author’s homepage in a new tab. Touch/pen input handles the release event directly, suppresses follow-up compatibility clicks, and uses one tap to flip and two nearby taps within 400ms to open the paper; this follows the actual pointer type even on a touchscreen desktop. Escape or a tap outside dismisses details.
- The description area follows the card grid with a 16–24px margin and always shows an English mouse/touch instruction below the paper details. Remaining height stays below the description, with bottom padding. No custom zoom or panning.
- Initial fitting uses the visible viewport height, including mobile browser toolbar changes, and reserves the actual height of the wrapped interaction instruction. Selecting a card expands its details below the gallery without shrinking or moving the cards; longer details can extend the page vertically.
- Native two-finger pinch zoom preserves the current layout and card sizes. Visual viewport changes at a non-default zoom scale do not trigger fitting; actual layout-width changes and normal-scale browser toolbar changes still do.
- The title is “Everyone a Data Scientist” with “Hyeon Jeon” beside it.
- TVCG paper backs show the CV-listed VIS presentation logo above the journal masthead, including invited presentations.

## Edit and validate

`dist/papers.json` controls the selection, order, figures, metadata, and logos. `dist/style.css`, `dist/app.js`, `dist/layout.js`, and `dist/facets.js` control layout, interaction, and grouping. Run `npm run build` to validate data, assets, link formats, and requested classifications. `npm test` checks facet routing, venue/authorship grouping, layout efficiency, and fit across viewport shapes. `dist/` is the finished static output; compilation is unnecessary.

## Sources and scope

Records were checked against https://www.hyeonjeon.com/ and https://hyeonword.com/cv/cv.pdf on 2026-10-14. The selected 21 papers include 15 Analysis and 6 Communication papers. CloChat, CLeVer, Extensive Reading, the visual artists' text-to-image study, Issue Propagation, IoLens, VANT, HookLens, MoNetExplorer, Githru, PhenoFlow, DirectVis, and Seeing Graphs Like Humans are excluded.

Venue source URLs are in `dist/assets/venues/sources.json`. PacificVis uses the official general conference logo; CHI and VIS use official conference assets. CHI 2024 keeps only the left logo from its original banner; EuroVis 2025 uses the user-supplied Luxembourg logo. TVCG and TPAMI use the journal mastheads isolated through SVG viewports from cover images reproduced by research groups. Information Visualization uses the large text “SAGE InfoVis.” ggaction shows the official CHI 2027 logo above “under review,” as requested. Perceptual Bias in DR shows “VisComm Workshop” below the VIS 2025 logo. Figure assets are from the homepage except for Githru's static teaser, extracted from https://www.hyeonjeon.com/assets/pdf/kim21tvcg.pdf. The original animated GIF is not used.

## Serverless deployment

All application behavior runs in the browser. No backend, database, API key, or runtime service is required. `scripts/serve.mjs` is only the local development server.

GitHub Pages publishes `dist/` through [.github/workflows/pages.yml](.github/workflows/pages.yml) after tests and asset validation pass. Pushes to `main` deploy automatically; the workflow can also be run manually. No dependency installation or compilation is needed.

- Repository: https://github.com/hj-n/everyone-data-scientist
- Site: https://hyeonword.com/everyone-data-scientist/
- GitHub Pages URL: https://hj-n.github.io/everyone-data-scientist/

The project inherits the custom domain configured on `hj-n.github.io`; it does not have a separate `CNAME`. Application modules, data, and assets use relative paths so the project subdirectory works unchanged. Local screenshots in `artifacts/` are excluded from the repository and deployment.
