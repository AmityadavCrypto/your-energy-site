# Admin Setup

This is the shortest path to make the live admin panel work at `/admin.html`.

## 1. Run the database schema in Supabase

In your Supabase project:

1. Open `SQL Editor`
2. Copy everything from [supabase/schema.sql](supabase/schema.sql)
3. Run it

This creates:

- the `leads` table
- row-level security policies
- the private `lead-documents` storage bucket

## 2. Create the admin login

In Supabase:

1. Go to `Authentication`
2. Open `Users`
3. Create one user with your admin email and password

You will use this same email/password at `https://yourenergy.co.in/admin.html`.

## 3. Fill the frontend config

Edit [supabase-config.js](supabase-config.js) so it contains your real project values:

```js
window.YourEnergySupabaseConfig = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY",
};
```

Notes:

- the anon key is safe for browser use
- do not put the service role key in this file
- this file should be deployed with the website because the admin page loads it in the browser

## 4. Add Netlify environment variables

In Netlify for the site connected to `yourenergy.co.in`, add:

```txt
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

The service role key should only live in Netlify environment variables.

## 5. Deploy

After updating `supabase-config.js` and Netlify environment variables:

1. deploy the website
2. open `https://yourenergy.co.in/admin.html`
3. sign in using the admin email and password from Supabase Authentication

## 6. Verify the setup

Use this test:

1. submit one lead from the website home page
2. open `/admin.html`
3. sign in
4. confirm the lead appears in the table
5. open the lead and confirm you can update status

## Common failure points

- `admin.html` opens but shows local fallback mode:
  `supabase-config.js` is still empty or missing

- sign-in form appears but login fails:
  the admin user was not created in Supabase Authentication, or the password is wrong

- sign-in works but no leads are saved from the website:
  Netlify environment variables are missing, so `/.netlify/functions/lead-upsert` cannot write to Supabase

- document uploads fail:
  the schema was not run fully, so the `lead-documents` bucket or storage policies do not exist
