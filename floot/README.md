# Marquee
        
Personal watch tracker for viewing history, watchlists, progress, and insights.

Marquee is a Floot-native TV, movie, and anime tracker. Use the approved Premiere cinematic identity (aubergine/peach, Archivo, complete 2:3 posters and coherent spacing) documented in static/__dev/design-principles.md, while preserving the Floot App Studio family behavior contract. Keep canonical watch history, source evidence, manual statuses, ratings, progress, and watchlist state distinct. Preserve established source-matching and deduplication behavior when changing ingestion or history logic.

Before database/auth/schema or ingestion changes, read static/__dev/notes/database-consolidation.md and its current production handoff. The specifically approved consolidation is complete: Marquee keeps native Auth and native-only Trakt production routing. Original source writers remain paused; original services and credentials are retained. Dated rehearsals remain historical evidence. Preserve timing deviations and recovery records; future migration/recovery needs fresh gates and its own applicable authorization. Retirement, revocation and native/EAS builds remain excluded. Revalidate relevant baselines after normal development changes.


Signed-in visual review: read Studio static/__dev/notes/signed-in-visual-review.md before authenticated UI work. Use secure browserAuth handoff; inspect the actual staged screens before publication and record login blockers rather than skipping the app. Never store actual passwords in documentation.


Made with Floot.

# Instructions

For security reasons, the `env.json` file is not pre-populated — you will need to generate or retrieve the values yourself.  

For **JWT secrets**, generate a value with:  

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then paste the generated value into the appropriate field.  

For the **Floot Database**, download your database content as a gzipped pg_dump (.sql.gz) from the cog icon in the database view (right pane -> data -> floot data base -> cog icon on the left of the name), restore it into your own PostgreSQL database (gunzip -c database-dump.sql.gz | psql <connection string>), and then fill in the connection string value.  

**Note:** Floot OAuth will not work in self-hosted environments.  

For other external services, retrieve your API keys and fill in the corresponding values.  

Once everything is configured, you can build and start the service with:  

```
npm install -g pnpm
pnpm install
pnpm vite build
pnpm tsx server.ts
```
