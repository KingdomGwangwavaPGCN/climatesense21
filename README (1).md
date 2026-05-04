# ClimateSense 21
**PGCN Climate Intelligence Platform**  
Peace, Gender and Climate Network · Zimbabwe

Real-time weather intelligence for Chivi District (Ward 3), Southlea Park (Harare) and Mount Darwin — three locations spanning Zimbabwe's major climate zones.

---

## Deploy to Netlify in 5 Steps

### Step 1 — Create GitHub Repository
1. Go to **github.com** and sign in
2. Click the **+** icon → **New repository**
3. Name it: `climatesense21`
4. Set to **Public**
5. Click **Create repository**

### Step 2 — Upload Files
On the new repository page:
1. Click **uploading an existing file**
2. Upload ALL files from this zip, preserving the folder structure:
   ```
   climatesense21/
   ├── index.html
   ├── package.json
   ├── vite.config.js
   ├── netlify.toml
   ├── .gitignore
   ├── public/
   │   └── favicon.svg
   └── src/
       ├── main.jsx
       └── App.jsx
   ```
3. Click **Commit changes**

### Step 3 — Connect to Netlify
1. Go to **netlify.com** and sign in (free account)
2. Click **Add new site** → **Import an existing project**
3. Click **Deploy with GitHub**
4. Authorise Netlify to access GitHub
5. Select the `climatesense21` repository

### Step 4 — Configure Build Settings
Netlify reads `netlify.toml` automatically. Confirm these settings:
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- Click **Deploy site**

### Step 5 — Set Your Custom Domain (Optional)
1. In Netlify → **Domain management** → **Add custom domain**
2. Suggested domain: `climatesense.peacegenderandclimatenetwork.com`
3. Follow Netlify's DNS instructions

---

## What Happens After Deploy
- The live Open-Meteo API activates automatically (no API key needed)
- The amber SIMULATED badge switches to green LIVE
- localStorage stores up to 144 weather snapshots (24 hours at 10-min intervals)
- CSV export works on all devices

---

## Locations
| Site | Coordinates | Province |
|------|-------------|----------|
| Chivi District (Ward 3) | -20.58°S, 30.40°E | Masvingo |
| Southlea Park | -17.92°S, 31.07°E | Harare |
| Mount Darwin | -16.78°S, 31.58°E | Mashonaland Central |

---

## Tech Stack
- React 18 + Vite
- Open-Meteo API (free, no key required)
- localStorage for data persistence
- CSS-in-JS (no external CSS framework)

---

## PGCN Contact
**Kingdom Gwangwava**  
Founder and Executive Director  
Peace, Gender and Climate Network  
Ward 3, Chivi District, Masvingo Province, Zimbabwe  
peacegenderandclimatenetwork.com
