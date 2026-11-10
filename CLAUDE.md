# Notes for Claude

- The live site is deployed by Vercel from the `main` branch (production URL stays the same).
- The owner asked that every finished change goes live right away: after committing on the
  working branch, also push the same commit to `main` (fast-forward only, never force):
  `git push origin HEAD:main`. The `Publish to main` GitHub Action does the same after
  tests and build pass, as a safety net.
- Before pushing run `npm test` and `npm run build`.
- UI language is Traditional Chinese; the team is holyman (guide), 勳, ㄓㄒ and 33.
