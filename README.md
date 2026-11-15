# Portfolio

An interactive static site with 3D elements. No build step. All content comes from `resume.json`.

## Files

- `index.html`, `styles.css`, `script.js`: the site.
- `three.min.js`: the 3D library used by the hero scene and the table tennis game.
- `resume.json`: all the content.
- `assets/`: `resume.pdf` and `credit-card-research.pdf`.

All of these must sit at the top level of the GitHub repository, not inside a folder.

## Update the site

1. On GitHub, open `resume.json`, click the pencil icon, edit, then Commit changes.
2. If your resume PDF changes, upload the new file to `assets/` with the same name, `resume.pdf`.
3. Vercel redeploys automatically within about a minute.

## How resume.json is organised

- `basics`: name, rotating role titles, summary, email, LinkedIn, and the tools in the scrolling strip.
- `impact`: the six result cards and the "how I did it" panel behind each one. Only use real numbers.
- `lenses`: the "Hiring for" buttons. Each bullet in `experience` and `projects` has a `lens` list (`fpa`, `bi`, `data`) that controls what gets highlighted.
- `projects`, `skills`, `education`, `tableTennis`: the remaining sections.
- `playground`: sample numbers and defaults for the two demos.

## Vercel settings

Framework Preset: Other. Root Directory, Build Command and Output Directory: empty.

## Preview on your computer

Opening `index.html` directly will not work. Run `python -m http.server 8000` in this folder and open http://localhost:8000.
