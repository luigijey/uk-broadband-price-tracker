# UK Broadband Price Tracker

This project will become a UK residential broadband price comparison website.

For now, the project is intentionally very small and beginner-friendly. The first goal is to prove that the broadband price calculation works correctly before adding a website, database, login, or scraping.

## First goal

Broadband deals often show an advertised monthly price, but the real cost can be different once the full contract is considered.

This first version calculates:

- the advertised monthly price
- April price rises during the contract
- setup fees
- installation fees
- delivery fees
- router fees
- activation fees
- other upfront costs
- vouchers
- reward cards
- cashback
- bill credits
- free-month discounts
- other discounts

The main result is the **effective monthly price**.

The effective monthly price is the total cost of the contract after fees, rewards, cashback, vouchers and discounts, divided by the contract length.


## Sample comparison tables

The repository now includes fake sample residential broadband deals in `sample-deals.js`. These records are example data only. They are not live provider prices, they are not scraped from provider websites, and they should not be used to make a buying decision.

To print the sample comparison tables in your terminal, run:

```bash
npm run table
```

This runs:

```bash
node generate-pricing-tables.js
```

The table script imports the fake sample deals and the existing pricing calculator, then prints:

- a national cheapest-by-speed-tier table
- a postcode area comparison table sorted by postcode area, speed tier, and effective monthly price

Real scraping or data collection is intentionally not included yet. It may be added later after the calculator and simple comparison output are easy to understand and test.

## How to print a deal breakdown

The repository also includes a simple terminal breakdown script in `generate-deal-breakdown.js`. It uses the fake sample deals and the pricing calculator to show how one deal's effective monthly price is calculated.

To list the available sample deal IDs, run:

```bash
npm run breakdown
```

This runs:

```bash
node generate-deal-breakdown.js
```

To print a detailed breakdown for one sample deal, add the deal ID after `--`:

```bash
npm run breakdown -- OX-BT-36
```

The breakdown shows:

- the deal details, such as postcode area, provider, package name, speed, source, and last checked date
- the main price summary, including monthly payments, fees, rewards, discounts, total contract cost, and effective monthly price
- a simple month-by-month table showing when April price rises change the monthly price

The breakdown assumes the contract starts today, using the date when you run the command. The sample deals are still fake example records only, not live broadband prices.


## How to export calculated pricing data

The repository can also save the calculated fake sample pricing results as JSON and CSV files.

To create the export files, run:

```bash
npm run export
```

This runs:

```bash
node export-pricing-data.js
```

The export script creates the `exports` folder if it does not already exist, then writes these generated files:

- `exports/all-deals-calculated.json` - every fake sample deal with the calculated pricing fields added, including effective monthly price, total fees, rewards, discounts, and total contract costs.
- `exports/national-cheapest-by-speed-tier.json` - the cheapest calculated effective monthly price for each speed tier nationally.
- `exports/postcode-area-comparison.json` - every calculated deal sorted by postcode area, speed tier, and effective monthly price, cheapest first.
- `exports/postcode-area-comparison.csv` - the same postcode area comparison data in CSV format so it can be opened in a spreadsheet.

These export files are generated from fake sample data for now. They are not live broadband prices and should not be used to make a buying decision.

Later, the website will read from calculated or exported data instead of recalculating everything directly in the page code.

## How to build the first static website page

The repository can generate a simple static website from the calculated export files. This page is plain HTML with built-in CSS and browser JavaScript. It includes basic responsive styling, summary cards, homepage filters for postcode area, provider, and speed tier, a visible filtered result count, and horizontally scrollable tables for smaller screens. It does not use Next.js, React, TypeScript, Supabase, Vercel, scraping, or external packages.

First, create or refresh the calculated export files:

```bash
npm run export
```

This runs:

```bash
node export-pricing-data.js
```

Then build the static website page:

```bash
npm run build-site
```

This runs:

```bash
node build-static-site.js
```

The build script refreshes the export files again, reads:

- `exports/national-cheapest-by-speed-tier.json`
- `exports/postcode-area-comparison.json`

Then it creates:

- `site/index.html` - the main static tracker page with summary cards, the national cheapest table, the postcode comparison table, postcode area/provider/speed tier filters, a filtered result count, and "View breakdown" links.
- `site/deals/` - one static deal detail page for every fake sample deal.
- `site/deals/DEAL_ID.html` - each deal's readable price breakdown page, for example `site/deals/OX-BT-36.html`.

Each generated deal detail page shows the provider, package, postcode area, source, speed, last checked date, a price summary, and a month-by-month breakdown of the contract payments. The postcode comparison table links to these pages from its **Details** column.

To view the site, open `site/index.html` directly in your web browser. For example, you can double-click the file in your file browser, or use your browser's **File > Open File** menu. From there, use a **View breakdown** link to open a generated deal detail page.

This website is **not hosted yet**. It is only a local static HTML file for now.

The page still uses **fake sample data only**. It is not live broadband pricing, it is not scraped from provider websites, and it should not be used to make a buying decision.


## Publishing the static site with GitHub Pages

This repository includes a GitHub Actions workflow that can publish the generated static website from the `site` folder to GitHub Pages.

When code is pushed to the `main` branch, or when you run the workflow manually from the GitHub Actions tab, the workflow:

1. checks out the repository
2. sets up Node.js
3. runs `npm test` first, so the pricing calculator tests must pass before publishing
4. runs `npm run export` to export the calculated pricing data from the fake sample deals
5. runs `npm run build-site` to build `site/index.html`
6. uploads the `site` folder as a GitHub Pages artifact
7. deploys that uploaded artifact to GitHub Pages

To use it, enable GitHub Pages in your repository settings and choose **GitHub Actions** as the Pages source. After that, the workflow named **Deploy static broadband price tracker site** can publish the static site for you.

This is still based on **fake sample data only**. It is not live broadband pricing, it is not scraped from provider websites, and it is not the final production hosting setup.


## Online source access checks

The repository now includes the first online data collection foundation. This is still beginner-friendly and intentionally conservative: it checks whether public broadband source pages can be accessed safely before any future real pricing ingestion is attempted.

Source definitions live in `broadband-sources.js`. They include provider-direct sources and comparison/marketplace sources, with each source storing a source ID, name, source type, base URL, candidate broadband URL, notes, and whether the source is enabled.

To run the source access check, use:

```bash
npm run check-sources
```

This runs:

```bash
node check-source-access.js
```

The check script:

- fetches each enabled source's `robots.txt` first
- parses `robots.txt` in a simple beginner-friendly way
- checks whether the candidate broadband page appears allowed for the clear custom user agent `UKBroadbandPriceTrackerBot/0.1`
- does **not** fetch candidate pages that appear blocked or unclear
- does **not** bypass anti-bot systems, CAPTCHAs, login walls, or website restrictions
- does **not** use browser automation, proxies, hidden scraping tools, or aggressive retries
- waits briefly between source requests
- records blocked, failed, or unclear sources without crashing the whole run

The script writes its results to:

- `exports/source-access-report.json`

Each report row records the source details, robots.txt status, whether the candidate path appeared allowed, candidate page fetch status if fetched, any detected page title, a simple count of pound-price-like text, warnings, and the time the source was checked.

This is **not yet real pricing ingestion**. It does not turn provider or comparison pages into deal records, and it should not be treated as live broadband pricing data.

### Running the source access check in GitHub Actions

A GitHub Actions workflow named **Check broadband source access** can run the same conservative source access check in GitHub's environment. This is useful because a local development or Codex environment may have unclear DNS or network access.

To run it manually:

1. Open the repository on GitHub.
2. Select the **Actions** tab.
3. Choose **Check broadband source access** from the workflow list.
4. Click **Run workflow**.
5. Keep the selected branch, then click the green **Run workflow** button.

The workflow also runs automatically once per day on a schedule. Each run checks out the repository, sets up Node.js, runs `npm test`, runs `npm run check-sources`, confirms that `exports/source-access-report.json` was created, and uploads that report as an artifact named **source-access-report**.

To download the report after a workflow run:

1. Open the completed workflow run in the **Actions** tab.
2. Scroll to the **Artifacts** section near the bottom of the run summary.
3. Download the **source-access-report** artifact.
4. Open `source-access-report.json` from the downloaded artifact files.

The downloaded file is only a source access report. It shows whether source pages appeared accessible from the workflow environment, along with warnings and HTTP status information. It is **not final pricing data**, does not create live broadband deal records, and should not be used as buying advice.

Blocked, unknown, unclear, failed, or non-200 source results are expected sometimes. They should be recorded in the report, not bypassed. Do not add scraping bypasses, browser automation, proxies, hidden fetch methods, or aggressive retries to work around blocked or unclear sources.

## Online price snippet extraction

The repository also includes a safe online price snippet extraction step for early price discovery. This is a **human-review discovery step only**. It does not create final broadband deals, does not update the sample deal values, and does not change the pricing calculator or static website.

To run the extraction, use:

```bash
npm run extract-snippets
```

This runs:

```bash
node extract-price-snippets.js
```

The snippet extraction script:

- reads enabled source definitions from `broadband-sources.js`
- fetches each source's `robots.txt` before any candidate broadband page
- checks whether the candidate broadband page path appears allowed for `UKBroadbandPriceTrackerBot/0.1`
- skips sources where `robots.txt` is unavailable, unclear, or disallows the candidate path
- records blocked, security-check, CAPTCHA, anti-bot, failed, and HTTP 403 pages instead of bypassing them
- uses a small delay between requests and does not retry aggressively
- extracts simple price-like `£` snippets from allowed HTTP 200 pages for human review
- looks near each price-like snippet for possible speed, contract, reward, voucher, cashback, or bill-credit text

The output is saved to:

- `exports/online-price-snippets.json`

Each source result includes the source ID, source name, source type, candidate broadband URL, robots permission result, page fetch status, HTTP status code, page title, snippet count, extracted snippets, warnings, and the time checked. Each snippet includes the matched price-like text, nearby surrounding text, and any possible speed, contract, or reward text found nearby.

The output is **not live pricing data** and should not be used as buying advice. It is only a structured report to help a human decide what, if anything, may be safe and useful to model later.

## What will be added later

Later versions may add:

- a simple website
- broadband provider data
- deal comparison pages
- scraping or data collection tools

## Important scraping rules for later

Scraping is **not included** in this first version.

If scraping is added later, it must be done responsibly. Any scraping must:

- respect `robots.txt`
- respect website terms and conditions
- use sensible rate limits
- avoid overloading websites
- not bypass anti-bot protections
- not access data that is not meant to be public

## How to run the tests

Install Node.js, then run:

```bash
npm test
```

The tests use Node.js's built-in test runner, so no extra test package is needed.

## How to print the sample tables

Run:

```bash
npm run table
```

Remember: the table output is based on fake example deals only. Live provider prices and real data collection will be added later.
