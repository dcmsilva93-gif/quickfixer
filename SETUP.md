# MinuTrades – Setup & Deployment Guide

## What's included
- `index.html` — main app entry point
- `css/style.css` — all styles
- `js/app.js` — all app logic + sample data

---

## Phase 1: Run locally (no cost)
1. Open `index.html` in any browser — it works immediately
2. Professionals who register are saved in browser localStorage
3. Use this to demo the product to tradespeople and gather feedback

---

## Phase 2: Put it online FREE (15 minutes)

### Option A — Netlify (recommended)
1. Go to https://netlify.com and sign up free
2. Drag and drop your `minutrades` folder onto the Netlify dashboard
3. You get a live URL like `https://minutrades.netlify.app`
4. Later, buy a .lk domain (~Rs. 1,500/year) and connect it

### Option B — GitHub Pages
1. Create a free GitHub account at https://github.com
2. Create a new repository called `minutrades`
3. Upload all files
4. Go to Settings → Pages → Source: main branch
5. Your site goes live at `https://yourusername.github.io/minutrades`

---

## Phase 3: Real database with Supabase (free tier)

When you have 20+ professionals registered, connect a real database:

### Setup Supabase
1. Go to https://supabase.com — sign up free
2. Create a new project (e.g. "minutrades")
3. Run this SQL in the SQL editor to create your tables:

```sql
-- Professionals table
create table professionals (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  trade text not null,
  area text not null,
  phone text not null,
  bio text,
  certification text,
  experience_years int,
  verified boolean default false,
  available boolean default true,
  rating numeric default 0,
  jobs_count int default 0,
  created_at timestamp default now()
);

-- Job requests table
create table job_requests (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  customer_phone text not null,
  trade text not null,
  area text not null,
  description text not null,
  urgency text,
  status text default 'open',
  created_at timestamp default now()
);

-- Reviews table
create table reviews (
  id uuid default gen_random_uuid() primary key,
  professional_id uuid references professionals(id),
  customer_name text,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamp default now()
);
```

### Connect Supabase to the app
In `js/app.js`, replace the `loadSavedPros()` function with:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY'; // safe to use in frontend

async function loadProfessionals() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/professionals?select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  PROFESSIONALS = await res.json();
}
```

---

## Phase 4: Add WhatsApp notifications (optional)

When a job request is posted, send a WhatsApp message to matching pros using:
- **CallMeBot API** (free) — https://www.callmebot.com/blog/free-api-whatsapp-messages/
- **Twilio** (paid but reliable) — https://twilio.com

---

## Future features to add
- [ ] Photo upload for professionals
- [ ] Customer login to leave reviews
- [ ] Admin dashboard to verify professionals
- [ ] SMS alerts for new job requests
- [ ] Sinhala language toggle
- [ ] Google Maps location integration

---

## Monetisation roadmap
| Phase | Feature | Price |
|-------|---------|-------|
| Launch | All listings free | Rs. 0 |
| Month 3+ | "Featured" placement | Rs. 500/month |
| Month 6+ | Verified badge | Rs. 1,000/month |
| Year 1+ | Premium leads | Rs. 2,000/month |

---

## Contact for help
Built by MinuTrades. For technical support, post on Stack Overflow or ask Claude.
