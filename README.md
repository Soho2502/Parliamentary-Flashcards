# Parliament Quiz

A gamified flashcard app for learning UK MPs, Lords, and Government Ministers.

## Running locally

```bash
npm install
npm run dev
```

## Refreshing Parliament data

The data file (`src/data/members.json`) is pre-built from the Parliament Members API. To refresh it:

```bash
npm run fetch-data
```

This fetches all current MPs (~650) and Lords (~868), checks each for government posts, and saves to `src/data/members.json`. Takes ~10 minutes due to rate-limiting delays.

## Building for production

```bash
npm run build
```

Output is in `dist/`.

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import the project in Vercel — set the **Root Directory** to `parliament-quiz`.
3. Vercel will auto-detect Vite and use the `vercel.json` config.

## Auto-refresh via GitHub Actions

The workflow at `.github/workflows/refresh-data.yml` runs every Sunday at 02:00 UTC:

1. Fetches fresh data from the Parliament API.
2. Commits any changes to `src/data/members.json`.
3. Triggers a Vercel redeploy via a deploy hook.

**Setup required:**
- Add a `VERCEL_DEPLOY_HOOK_URL` secret in your GitHub repo settings.
  - Get the URL from: Vercel project → Settings → Git → Deploy Hooks.
- The workflow uses `contents: write` permission (already set) to commit and push.

You can also trigger it manually from the GitHub Actions tab using **workflow_dispatch**.

## Data sources

- **UK Parliament Members API** — `https://members-api.parliament.uk/` (free, no auth)
- Photos served under the [Open Parliament Licence](https://www.parliament.uk/site-information/copyright-parliament/open-parliament-licence/)
