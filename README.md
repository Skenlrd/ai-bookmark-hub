
AI Bookmark Hub — Dev Setup and Run
===================================

Quick start (Windows, PowerShell)
- Prereqs: Node 18+ (or Bun), Git, Supabase account.

1) Install dependencies
```
npm install
```

2) Create .env
- Copy the example below into `.env` at the project root and replace with YOUR Supabase project values.
```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Optional (Google OAuth used inside the app)
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_CLIENT_SECRET=
```

3) Start the dev server
```
npm run dev
```
- Open the URL Vite prints (usually http://localhost:5173).

4) Prepare your Supabase project
- Create a new Supabase project in the dashboard.
- Run the SQL migrations from the `supabase/migrations` folder (SQL Editor → run each file in order). This creates `profiles` and `bookmarks` with RLS policies and triggers.
- If you already signed up a user before the triggers existed, ensure a matching profile row exists. Run this once to backfill:
```
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
```

5) Edge Functions (optional features)
- The app calls Supabase Edge Functions like `groq-categorize`, `export-bookmarks`, `ai-summary`, `notion-sync`.
- To use them, deploy with the Supabase CLI:
```
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy groq-categorize
supabase functions deploy create-bookmark
supabase functions deploy export-bookmarks
supabase functions deploy ai-summary
supabase functions deploy notion-sync
```
- Without these deployed, AI categorization/export will fail, but basic bookmark saving can still work.

Common issues
- DNS error when opening `https://<ref>.supabase.co` directly: This URL is meant for API calls from the app. It’s normal to see errors in a browser tab. Ensure your `.env` uses a valid project ref and that your network allows `*.supabase.co`.
- Import shows “All bookmarks encountered an error”: Most commonly caused by missing `profiles` row for the signed-in user (foreign key on `bookmarks.user_id`). Fix by running the backfill SQL above or sign out and sign back in after triggers are created.
- `npm start` fails: This project uses Vite’s `dev` script. Use `npm run dev`.

AI Categorization
- The app can auto-categorize bookmarks via a Supabase Edge Function `groq-categorize`.
- To enable it:
	1. Deploy the function: `supabase functions deploy groq-categorize`
	2. Set the secret: `supabase secrets set --project-ref <your-ref> GROQ_API_KEY=<your-key>`
	3. In your `.env`, set `VITE_ENABLE_AI_CATEGORIZATION=true` and restart `npm run dev`.
- If disabled or if the function fails, bookmarks default to `Uncategorized / General`.

Build and preview
```
npm run build
npm run preview
```

Notes
- Environment variables must start with `VITE_` to be exposed to the browser (already used here).
- If using Bun: `bun install; bun dev` also works.

