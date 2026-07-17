# Your Energy

Customer-facing solar website and lightweight admin workflow for `Your Energy`, the premium front-end brand for FLYINGAPES TECHNOLOGIES PRIVATE LIMITED.

This repository combines:

- a public marketing site for residential and commercial solar customers
- an in-browser solar assessment calculator
- a lead capture flow backed by Netlify Functions and Supabase
- an admin panel for managing leads, documents, statuses, and quotations

## What The Product Does

The public site helps potential customers:

- learn about the brand and solar offerings
- calculate a rough solar system estimate from their monthly bill
- request a final quote over WhatsApp

The admin side helps the business team:

- review captured leads
- sign in securely with Supabase Auth
- manage project/application status
- upload customer documents
- build a detailed quotation
- export lead data
- generate a printable quotation PDF from the browser

## Tech Stack

- Static HTML for pages
- Plain CSS for styling
- Vanilla JavaScript for UI, calculations, admin logic, and integrations
- Netlify Functions for server-side lead upserts
- Supabase for database, auth, and storage
- Python helper script for DOCX quotation generation in `document-work/`

## Repository Structure

```text
.
├── index.html                      # Public marketing website
├── styles.css                      # Shared site + admin styling
├── script.js                       # Public site interactions and estimate flow
├── admin.html                      # Admin panel UI
├── admin.js                        # Admin dashboard, auth, docs, quotation logic
├── netlify/functions/lead-upsert.js# Serverless lead capture endpoint
├── supabase/schema.sql             # Database and storage setup
├── supabase/README.md              # Supabase setup notes
├── supabase-config.example.js      # Browser-side Supabase config template
├── assets/                         # Logos, favicons, brand assets
└── document-work/                  # Offline quotation document tooling
```

## Local Development

### Prerequisites

- Node.js
- Python 3

### Start The Site

```bash
npm start
```

This serves the repo with Python's built-in server on:

- `http://localhost:4173/`

Useful pages:

- Public site: `http://localhost:4173/`
- Admin panel: `http://localhost:4173/admin.html`

### Syntax Check

```bash
npm run check
```

This validates:

- `script.js`
- `admin.js`
- `netlify/functions/lead-upsert.js`

## Public-Site Flow

The public experience lives in `index.html`, `styles.css`, and `script.js`.

Main behaviors:

- mobile navigation toggle
- solar estimate calculation based on customer type, bill, property type, and city
- lead persistence in browser `localStorage`
- background sync to `/.netlify/functions/lead-upsert`
- WhatsApp deep link for final quote requests

## Lead And Admin Flow

The lead journey works like this:

1. A visitor fills the free assessment form on the homepage.
2. `script.js` calculates an estimate and saves the lead locally.
3. The site attempts to sync that lead to the Netlify function.
4. `netlify/functions/lead-upsert.js` writes the lead into Supabase.
5. An admin signs into `admin.html`.
6. `admin.js` loads leads from Supabase and exposes document, status, and quotation tools.

Admin capabilities currently include:

- sign in and sign out
- view lead table and stats
- update application/project status
- upload and remove supporting documents
- export CSV
- save quotation details
- open a print window for PDF download
- send quotation summary on WhatsApp

## Supabase Setup

See [supabase/README.md](supabase/README.md) for the detailed flow.

Short version:

1. Create a Supabase project.
2. Run [supabase/schema.sql](supabase/schema.sql).
3. Create an admin email/password in Supabase Auth.
4. Copy `supabase-config.example.js` to `supabase-config.js`.
5. Fill in:

```js
window.YourEnergySupabaseConfig = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY",
};
```

6. Configure Netlify environment variables:

```text
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

Important notes:

- never put the service role key in browser JavaScript
- the anon key is intended for browser use with Row Level Security enabled

## Important Files To Learn First

If you're starting work on this repo, begin here:

- [index.html](index.html): content structure and public-site sections
- [styles.css](styles.css): visual system for both site and admin
- [script.js](script.js): estimate logic and lead capture
- [admin.html](admin.html): admin layout and controls
- [admin.js](admin.js): lead management, auth, documents, quotation builder
- [netlify/functions/lead-upsert.js](netlify/functions/lead-upsert.js): lead upsert endpoint
- [supabase/schema.sql](supabase/schema.sql): database model and policies

## Branding Assets

Logos and brand exports live under [assets](assets).

For asset usage guidance, see [assets/brand/README.md](assets/brand/README.md).

## Document Tooling

The repo also contains a DOCX quotation generator in:

- [document-work/build_corrected_quotation.py](document-work/build_corrected_quotation.py)

That script produces a branded quotation document using `python-docx`. It is separate from the browser-based quotation flow in `admin.js`.

## Good First Contribution Areas

- improve homepage copy and conversion flow
- refine the estimate model and assumptions
- harden validation for phone, bill amount, and city inputs
- improve admin table filtering and search
- add clearer error states for Supabase and Netlify failures
- split large JavaScript files into smaller modules if the project grows

## Notes For Safe Changes

- `admin.js` is the heaviest file in the repo and handles several responsibilities
- the current architecture is simple and easy to ship, but it will benefit from modularization as features grow
- changes to lead shape should stay aligned across `script.js`, the Netlify function, `admin.js`, and `supabase/schema.sql`
