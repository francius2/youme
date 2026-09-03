This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in the project URL and publishable/anon key from **Project Settings > API**.
3. Run `supabase/schema.sql` in the Supabase SQL Editor to create the profiles, conversations, members, and messages tables with Row Level Security.
4. Enable **Email** authentication under **Authentication > Providers**.
5. Enable **Google** authentication under **Authentication > Providers**, add your Google OAuth client ID and secret, and add both `http://localhost:3000/auth/callback` and `https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback` to Supabase's allowed redirect URLs.

The browser client is available from `lib/supabase/client.ts` for interactive components. Use `lib/supabase/server.ts` in Server Components, Server Functions, and Route Handlers for authenticated database queries. Never expose a Supabase service-role key to the browser.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

1. Import this repository into [Vercel](https://vercel.com/new).
2. In **Project Settings > Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for **Production** (and Preview if needed), using the values from Supabase **Project Settings > API**.
3. Deploy with the default Next.js framework preset and build command (`npm run build`).
4. Copy the deployed URL into Supabase **Authentication > URL Configuration** as the **Site URL**, and add `https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback` to the allowed redirect URLs.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
