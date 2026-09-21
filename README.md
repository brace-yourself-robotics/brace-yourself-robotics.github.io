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
remains hidden with `showAuthors: false`. The PDF is included; the arXiv link remains
unset until its public URL is available.

## Deployment

Deployment is disabled. `.github/workflows/deploy.yml.disabled` is an inactive template,
not an executable GitHub Actions workflow. Building or pushing this repository does
not enable GitHub Pages through that template.

When publication is authorized:

1. In Settings → Pages, select GitHub Actions as the publishing source. Leave Custom
   domain empty.
2. Rename `.github/workflows/deploy.yml.disabled` to `deploy.yml`, commit and push to main.
3. In Actions, select Deploy static site to GitHub Pages; enable it if prompted, then
   select Run workflow on main. Approve any required environment review.
4. Wait for build and deploy to succeed and verify the website URL above.

Only `dist/` is uploaded. No repository subpath or custom DNS is required.

## Materials

The included PDF, figures and videos retain their existing rights. This repository
makes no blanket open-source or Creative Commons license grant for those materials.
The asset manifest records checksums of the distributed files without private source
paths. No original research datasets, checkpoints or raw experiment logs are included.
