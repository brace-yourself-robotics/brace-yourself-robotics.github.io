# Brace Yourself

Project website for **Brace Yourself: Task-Conditioned Environmental Bracing for
Forceful Humanoid Manipulation**.

Expected website: https://brace-yourself-robotics.github.io/

This repository contains the static website source and prepared publication assets.
It is not the robot training or deployment code release. Development experiments,
original recordings and private research records are maintained separately.

## Build and preview

Requires Node.js 24 or newer. No dependency installation is required.

```sh
npm run build
npm run check
npm run dev
# http://127.0.0.1:4321/
```

The production output is `dist/`, served from `/`. The build verifies local references,
root-domain metadata and the SHA-256 hashes in `ASSET_MANIFEST.json`.

`src/site-config.js` controls resource links and site metadata. Author information
remains hidden with `showAuthors: false`. The PDF is included; the arXiv and Code
buttons are shown as "soon" until `links.arxiv` / `links.code` are set.

## Deployment

GitHub Pages is built by `.github/workflows/deploy.yml` (Settings → Pages → Source:
GitHub Actions). The workflow runs on manual dispatch: Actions → Deploy static site to
GitHub Pages → Run workflow on `main`. It builds with Node.js 24, runs the checks and
uploads only `dist/`, served from `/`.

## Materials

The included PDF, figures and videos retain their existing rights. This repository
makes no blanket open-source or Creative Commons license grant for those materials.
The asset manifest records checksums of the distributed files without private source
paths. No original research datasets, checkpoints or raw experiment logs are included.
