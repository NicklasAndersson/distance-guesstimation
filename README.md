# Distance Guesstimation

Estimate distance using a plastic card on a string. Print the card, attach a string of the correct length (default 60 cm), hold the card at arm's length, and compare the silhouettes to real-world objects.

Includes a browser-based card editor for customising objects, positions, images, and angular circles.

## Getting started

```bash
npm install
npm start          # http://localhost:3000
```

Open the editor in a browser. When done, click **🖨 Förhandsgranska A4** or use `Ctrl+P` to print.

## Formulas

### Distance estimation (objects)

The card works by projecting a known real-world size onto the card at a fixed cord length:

```text
paperLength (mm) = (objectSize (m) / distance (m)) × cordLength (mm)
```

Rearranged to estimate distance:

```text
distance (m) = (objectSize (m) / paperLength (mm)) × cordLength (mm)
```

Based on: <https://www.exploratorium.edu/snacks/handy-measuring-tool>

### Angular circles (Mils)

A milliradian (mil) is an angular unit. **1 mil = 1 m at 1 000 m distance.**

Since the cord provides a fixed angular reference, a mil circle's paper size is **constant regardless of distance**:

```text
paperDiameter (mm) = (milDiameter / 1000) × cordLength (mm)
```

Useful relationships:

| Distance | 1 mil covers |
| -------- | ------------ |
| 100 m    | 10 cm        |
| 300 m    | 30 cm        |
| 500 m    | 50 cm        |
| 1 000 m  | 1 m          |

Range estimation with mils:

```text
distance (m) = (targetSize (cm) × 10) / mils
distance (m) = targetSize (m) × 1000 / mils
```

### MOA ↔ Mil conversion

```text
1 MOA ≈ 0.2909 mil
mils  = MOA × 0.29089
MOA   = mils / 0.29089
```

The editor supports entering circle diameter in either unit; the other updates automatically.

## Features

- **Object cards** – define objects by name, height, width, and optional image; scaled silhouettes are drawn for each configured distance
- **Mil / MOA circles** – angular reference circles with crosshair, constant size on card
- **Drag & drop** – reposition any element on the card by dragging
- **Image upload** – attach a silhouette image (auto-resized if > 200 KB)
- **Undo / Redo** – `Ctrl+Z` / `Ctrl+Shift+Z` (up to 50 steps)
- **Persistence** – auto-saves to localStorage
- **JSON export / import** – download or load full card configurations
- **Print preview** – exact A4 layout preview; one design × 4 copies per page
- **PDF export** – server-side via Puppeteer (`GET /export/pdf`)

## Tech stack

- Vanilla JS (no framework)
- Express 4 + Puppeteer (server / PDF)
- CSS `mm` units for print-accurate rendering
- paper.css for A4 sheet layout

## License

See [LICENSE](LICENSE).

