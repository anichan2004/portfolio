# Portfolio

An interactive static site. No build step. All content comes from `resume.json`.

## What is on the page

- Instrument-cluster dials in the hero. Tap one to read how the result was achieved.
- A "What are you hiring for?" switch that highlights the most relevant experience and skills.
- Two demos: a budget vs. actuals explorer and a Monte Carlo planner.
- A table tennis rally game and the 918 Spyder card.
- A small gauge in the corner that tracks scroll position.

## Update the site from your resume

1. Edit `resume.json`.
2. If your resume PDF changed, replace `assets/resume.pdf` with the new file, keeping the same name.
3. Commit and push:

   git add .
   git commit -m "Update resume"
   git push

Vercel redeploys automatically within about a minute.

### How resume.json is organised

- `basics`: name, role, summary, email, links, and the status line in the hero.
- `lenses`: the hiring-focus buttons and their one-line pitches.
- `gauges`: the dials and the "how I did it" card behind each one.
- `experience`, `projects`: each bullet has `"lens": ["fpa", "bi", "data"]`. Those tags decide what gets highlighted when a recruiter picks a focus.
- `skills`: each group has a `lens` list too.
- `playground`: the line items, presets and default inputs for the two demos.
- `beyond`: the table tennis and 918 Spyder text.

When you add a new bullet, give it a `lens` list so it responds to the focus switch.

## First-time setup

1. Create an empty repository on GitHub.
2. In this folder, run:

   git init
   git add .
   git commit -m "Initial portfolio"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main

3. Go to vercel.com, choose Add New > Project, and import the repository.
4. Leave Framework Preset as "Other". Leave the build command and output directory empty. Click Deploy.

To keep your existing address, remove `anirudh-chandramouleeswaran.vercel.app` from the old Vercel project and add it to this one.

## Preview on your computer

Opening `index.html` directly will not work, because the page loads `resume.json`. Run a local server instead:

   python3 -m http.server 8000

Then open http://localhost:8000.

## Links and files

- `basics.links`: LinkedIn is set. Add a GitHub link here later if you want one.
- `projects[].links`: FinScope points to the live Streamlit app. The research paper points to `assets/credit-card-research.pdf`.
- Your phone number is not shown on the site on purpose.
