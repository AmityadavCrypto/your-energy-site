# Your Energy Admin Backend Setup

This folder contains the production database setup for the admin panel.

## 1. Create Supabase project

Create a Supabase project and open the SQL Editor.

## 2. Run database schema

Copy everything from `schema.sql` into Supabase SQL Editor and run it. This creates:

- `leads` table for website assessment leads
- Row Level Security policies for authenticated admin users
- Private `lead-documents` storage bucket for Aadhaar, PAN, passbook, electricity bill, and miscellaneous images

## 3. Create admin login

In Supabase, go to Authentication > Users and create your admin user email/password.

## 4. Configure website admin panel

Copy `supabase-config.example.js` to `supabase-config.js`, then paste:

```js
window.YourEnergySupabaseConfig = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY",
};
```

The anon key is safe to use in the browser because Row Level Security protects the data.

## 5. Configure Netlify Function

In Netlify, add these environment variables:

```txt
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

Never put the service role key in browser JavaScript or GitHub.

## 6. Deploy

Commit and push the changes. Netlify will deploy:

- `/.netlify/functions/lead-upsert` for public lead capture
- `admin.html` for authenticated admin management

After deploy, submit one test assessment from the home page, then open `admin.html`, sign in, and confirm the lead appears.
