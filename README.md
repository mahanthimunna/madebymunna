# Mahanthi Kannapalli — 3D Editorial Portfolio

This version preserves the written portfolio content and project structure from the supplied site, while replacing the presentation layer with a 3D interactive editorial system.

## Run locally
Open `index.html` directly, or serve the folder with any static server (recommended for the smoothest browser behavior).

Example:
```bash
python -m http.server 8000
```
Then open `http://localhost:8000/index.html`.

## Deploy to GitHub Pages
Replace the files in the existing GitHub Pages repository with the contents of this folder, keeping the same relative paths. No build step is required.

## Main design files
- `style.css` — responsive editorial layout, project pages, interaction styling.
- `portfolio.js` — WebGL ambient sculpture, depth/tilt interactions, reveal motion, scroll progress, lightbox, and parallax.
- Existing `.html` pages and `images/` remain the content source.

The WebGL layer loads Three.js from a CDN. If it cannot load, the site still works with the CSS interaction layer.
