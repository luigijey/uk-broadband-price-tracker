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

### Running online price snippet extraction in GitHub Actions

A GitHub Actions workflow named **Extract online price snippets** can run the same conservative extraction in GitHub's environment. This is useful because a local development or Codex environment may have limited DNS access, blocked network access, or different robots/security responses from public websites.

To run it manually:

1. Open the repository on GitHub.
2. Select the **Actions** tab.
3. Choose **Extract online price snippets** from the workflow list.
4. Click **Run workflow**.
5. Keep the selected branch, then click the green **Run workflow** button.

The workflow also runs automatically once per day on a schedule. Each run checks out the repository, sets up Node.js 20, runs `npm test`, runs `npm run extract-snippets`, confirms that `exports/online-price-snippets.json` was created, and uploads that report as an artifact named **online-price-snippets**.

To download the report after a workflow run:

1. Open the completed **Extract online price snippets** workflow run in the **Actions** tab.
2. Scroll to the **Artifacts** section near the bottom of the run summary.
3. Download the **online-price-snippets** artifact.
4. Open `online-price-snippets.json` from the downloaded artifact files.

This artifact is only a human-review discovery report. It is **not final pricing ingestion**, does not create live broadband deal records, does not change sample deal values, and should not be used as buying advice.

Blocked, unknown, unclear, HTTP 403, CAPTCHA, anti-bot, security-check, failed, or non-200 source results are expected sometimes. They must be recorded and skipped, not bypassed. Do not scrape MoneySuperMarket or Compare the Market if they return HTTP 403 or security checks, and do not add proxies, browser automation, hidden fetch methods, CAPTCHA bypasses, login-wall bypasses, security-check bypasses, or aggressive retries to work around website restrictions.

## Active online candidate deal pipeline

The repository now includes a larger active candidate pipeline for early online deal review. This pipeline is still a working prototype, not final live pricing ingestion. It keeps active online candidates separate from the fake sample data tables.

To collect conservative online price-like snippets, run:

```bash
npm run extract-snippets
```

This runs `node extract-price-snippets.js` and writes `exports/online-price-snippets.json`. It checks `robots.txt`, skips blocked or unclear sources, records HTTP 403/security-check/CAPTCHA-style responses as warnings, and does not bypass website restrictions.

To turn available snippets into structured candidate deals, run:

```bash
npm run extract-providers
```

This runs `node extract-provider-candidates.js`, reads `exports/online-price-snippets.json`, and writes:

- `exports/provider-deal-candidates.json` - all structured provider and comparison-site candidate deal output for audit.
- `exports/provider-deal-candidates.csv` - a flat CSV version for spreadsheet review.
- `exports/provider-deal-candidates-usable.json` - candidates with `extractionQuality` of `usable-calculated` or `usable-source-effective-only`.
- `exports/provider-deal-candidates-review-only.json` - candidates with `extractionQuality` of `review-only-missing-fields` for human follow-up.
- `exports/provider-deal-candidates-discarded.json` - candidates with `extractionQuality` of `discarded-noisy` that are too noisy for the main table.
- `exports/provider-direct-expansion-summary.json` - category counts for fixed broadband, landline, calls package, 5G home broadband, TV bundle, mobile bundle, and unknown product candidates.

The provider candidate extractor currently looks for conservative candidates from TalkTalk, Vodafone, BT, Plusnet, Broadband Genie, and Uswitch where useful snippets are available. Each candidate is marked `candidate-review-only`, requires human review, and uses a not-postcode-checked availability scope such as `provider-landing-page-not-postcode-checked` or `comparison-page-not-postcode-checked`.

Candidate quality is separated as follows:

- `usable-calculated` means the extractor found the core fields needed for this repository to calculate an effective monthly price.
- `usable-source-effective-only` means a source-provided effective monthly price was found, but this repository could not yet calculate its own value from the extracted fields.
- `review-only-missing-fields` means important fields are missing, so the row stays in review artifacts instead of the homepage table.
- `discarded-noisy` means a block was too noisy to show as an active candidate, but remains available as an audit artifact if exported.

The active promotion step reads `provider-deal-candidates-usable.json` and writes `exports/active-online-deals.json` plus `exports/active-online-deals.csv`. Active deals can exist in two roles: high-trust rows for the homepage and review/evidence records for audit. Every promoted active record keeps the backwards-compatible `productType` field and also has `connectionTechnology`, `serviceCategory`, `landlineStatus`, `callsPackageStatus`, `homepageCategory`, and `showOnHomepage` fields. Landline and non-landline versions of a broadband package are separate categories: a fixed broadband-only package is not merged with the same package when a landline is included, and a landline-plus-calls package is separate again. 5G home broadband is also its own category instead of being hidden permanently as a mobile bundle. Homepage-visible categories are Fixed broadband, Fixed broadband with landline, Fixed broadband with calls, and 5G home broadband. Hidden rows are still kept in `active-online-deals.json` and still receive active detail/evidence pages.


Product classification is deliberately conservative:

- Sales/contact wording such as `Get deal or call`, `or call`, `call 033`, `call 0800`, `call us`, `customer support`, `support line`, or `sales line` is treated as a sales CTA only. It does **not** mean the broadband product includes a landline or phone line.
- Rows are classified as fixed broadband with landline only when the text clearly says the actual product includes or requires a landline/phone line, for example `landline included`, `line rental included`, `home phone included`, `broadband and phone`, `includes line rental`, or `phone line included`.
- Rows are classified as fixed broadband with calls only when the text clearly includes a calls package, for example `calls included`, `anytime calls`, `weekend calls`, `evening and weekend calls`, `call plan included`, `talk plan included`, or `pay as you talk`.
- Rows that say `5G Broadband`, `5G home broadband`, `Vodafone 5G Broadband`, `Three 5G Broadband`, or `mobile network home broadband` are classified as 5G home broadband when the row is otherwise clean enough.
- TV, Sports, Cinema, Netflix, HBO Max, Apple TV, and channels bundles are kept as review/evidence records for now and hidden from the main homepage table unless a row is clearly broadband-only.

Active feed trust levels are separated as follows:

- `provider-direct-calculated` is the highest-trust homepage path. Provider-direct calculated rows are trusted first when the core numeric fields are present and the source snippet mentions the extracted provider or package.
- `comparison-clean-calculated` can appear on the homepage only when a comparison-site row passes stricter clean-block validation: the snippet must begin with, or very closely begin with, the same provider/package block being extracted and must not contain another provider before that extracted block.
- `comparison-source-effective-only` rows are kept as evidence because a source-provided effective monthly price was found, but they are hidden from the homepage for now.
- `review-artifact-only` rows are active evidence records that are useful for review but are hidden from the homepage, for example when a comparison snippet appears to mix adjacent provider/deal text or starts with the wrong provider.

The all-candidates, review-only, discarded, and active hidden artifacts preserve extracted rows for audit and manual review without promoting lower-trust data into the main live homepage table.

To refresh snippets, extract provider candidates, export the fake sample data, and rebuild the static site in one command, run:

```bash
npm run active-build
```

This runs:

```bash
npm run extract-snippets
npm run extract-providers
npm run promote-active
npm run postcode-area-build
npm run export
npm run build-site
```

Important limits:

- Candidate deals are not postcode checked.
- Candidate deals are not manually approved.
- Candidate deals may be incomplete or wrong and are for review only.
- Blocked, HTTP 403, CAPTCHA, anti-bot, login-wall, security-check, robots-disallowed, or unclear sources are skipped and recorded, not bypassed.
- MoneySuperMarket and Compare the Market must not be used if they return HTTP 403 or security checks.
- The static site displays only high-trust active candidate deals with `showOnHomepage: true` and a homepage-visible `homepageCategory` in the **Active online candidate deals** section, clearly separated from the **Sample data prototype tables** section that still uses fake sample data. Review/evidence active records, including TV/Sports/Cinema/Netflix bundles and unknown rows, remain in `active-online-deals.json` and detail pages but are hidden from the main homepage table.


## Postcode Area V1

Postcode Area V1 is the first postcode-area prototype for active online candidate deals. It is intentionally review-only and simple: it groups active national candidate deals by broad UK postcode area so the homepage can show what a future postcode-area comparison might look like.

Important limits:

- It is **not true postcode-level availability** yet.
- Prices are **not postcode checked**.
- Provider landing-page prices must not be described as postcode checked.
- No postcode-check forms are bypassed.
- No blocked source, CAPTCHA, security check, login wall, or website restriction is bypassed.
- True postcode checking will come later through approved data sources or another compliant availability method.

The starter postcode areas live in `postcode-areas.js`. To build the Postcode Area V1 review files, run:

```bash
npm run postcode-area-build
```

This runs:

```bash
node build-postcode-area-active-comparison.js
```

The script reads `exports/active-online-deals.json` and the enabled rows in `postcode-areas.js`, then writes:

- `exports/postcode-area-active-comparison.json`
- `exports/postcode-area-active-comparison.csv`

Postcode Area V1 can include homepage-visible fixed broadband, fixed broadband with landline, fixed broadband with calls, and 5G home broadband rows. Every generated row is still marked with `availabilityStatus: "not-postcode-checked"`, `availabilityConfidence: "national-candidate-only"`, and `publishStatus: "postcode-area-v1-review-only"`. The homepage shows these rows in a **Postcode Area V1 comparison** section with a clear warning and a simple postcode area dropdown filter.


## Live active deployment pipeline

GitHub Pages deployment now runs the active online pipeline before the static site is published. This means the live site can refresh its online candidate deal section from GitHub Actions, where source access may differ from local development or Codex environments.

On every push to `main`, every manual `workflow_dispatch` run, and once per day on the scheduled deployment run, the GitHub Pages workflow:

1. checks out the repository
2. sets up Node.js 20
3. runs `npm test`
4. runs `npm run extract-snippets` to extract conservative online price snippets into `exports/online-price-snippets.json`
5. runs `npm run extract-providers` to turn available snippets into provider candidate deals in `exports/provider-deal-candidates.json`, `exports/provider-deal-candidates.csv`, and the usable/review-only/discarded JSON files
6. runs `npm run promote-active` to write active review/evidence deals
7. runs `npm run postcode-area-build` to write Postcode Area V1 review-only comparison files
8. runs `npm run export` to refresh the fake sample-data exports
9. runs `npm run build-site` to rebuild `site/index.html` and the static deal pages
10. confirms the required generated files exist
11. uploads the `site` folder and deploys it to GitHub Pages
12. uploads review artifacts named **active-pricing-review-data** for the extracted snippet and candidate files

The review artifact includes:

- `exports/online-price-snippets.json`
- `exports/provider-deal-candidates.json`
- `exports/provider-deal-candidates.csv`
- `exports/provider-deal-candidates-usable.json`
- `exports/provider-deal-candidates-review-only.json`
- `exports/provider-deal-candidates-discarded.json`
- `exports/provider-direct-expansion-summary.json`
- `exports/source-access-report.json`, when that file exists in the workflow run
- `exports/active-online-deals.json`
- `exports/active-online-deals.csv`
- `exports/postcode-area-active-comparison.json`
- `exports/postcode-area-active-comparison.csv`

Important live deployment limits:

- Candidate deals are not postcode checked.
- Candidate deals are not manually approved.
- Candidate deals remain marked for human review only.
- Blocked, unknown, unclear, HTTP 403, CAPTCHA, anti-bot, login-wall, security-check, robots-disallowed, or failed sources are skipped and recorded, not bypassed.
- MoneySuperMarket and Compare the Market must not be used if they return HTTP 403 or security checks.
- The live site separates the **Active online candidate deals** section from the fake **Sample data prototype tables** and uses only active records with `showOnHomepage: true` and a homepage-visible `homepageCategory` for the main active table. Source-effective-only and review-artifact-only rows remain hidden evidence records with detail pages.

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

## Structured provider deal candidates

TalkTalk is the first structured provider extraction prototype. The prototype reads the human-review snippet report at `exports/online-price-snippets.json` and attempts to turn clearly named TalkTalk package snippets into structured candidate deal records.

Run the TalkTalk candidate extractor with:

```bash
npm run extract-talktalk
```

This runs:

```bash
node extract-talktalk-deals.js
```

The extractor currently targets these TalkTalk packages only:

- Fibre 35
- Fibre 65
- Full Fibre 150
- Full Fibre 500
- Full Fibre 900

The generated records are marked `candidate-review-only`. They are provider landing-page observations, not postcode-checked availability or postcode-checked prices. They are not automatically published to the static website, and they do not change the fake sample deal values used by the existing site and examples.

The script writes:

- `exports/talktalk-deal-candidates.json` - TalkTalk-only candidate deal output.
- `exports/provider-deal-candidates.json` - combined provider candidate output for audit.
- `exports/provider-deal-candidates-usable.json` - calculated or source-effective candidates shown by default on the homepage.
- `exports/provider-deal-candidates-review-only.json` - missing-field candidates kept for review.
- `exports/provider-deal-candidates-discarded.json` - noisy extracted rows kept out of the homepage table.

A human must review every extracted candidate deal before it can become live pricing data. These candidate files are discovery and review artifacts only; they should not be used as buying advice.

## Active Pricing V1

Active Pricing V1 introduces a stricter review-only active feed for online broadband deal evidence.

The pipeline is deliberately conservative:

- Provider candidates are extracted from already-collected public snippets and are quality-gated before promotion.
- Candidates with unrealistic April price rises, ambiguous April price sequences, or mixed-provider comparison-site blocks are kept out of the live active table.
- Clean usable candidates are promoted into `exports/active-online-deals.json` and `exports/active-online-deals.csv` by running:

```bash
npm run promote-active
```

This runs:

```bash
node promote-usable-candidates.js
```

Active deals are still **review-only**:

- they are not postcode checked
- they are not manually approved
- they may be incomplete
- they are not final checkout prices
- they must not be used as fully approved live broadband prices

Each active deal gets a generated evidence/detail page under `site/active-deals/`. The homepage's **Active online deal feed** table links to these pages from the **Details** column so a reviewer can inspect the source snippet, extracted fields, extraction quality, and warnings.

The daily GitHub Pages workflow refreshes the source snippets, provider candidates, active online deals, fake sample exports, and static site. Review artifacts remain available from GitHub Actions, including provider candidate usable/review-only/discarded files and the active online deals JSON/CSV.

The active pipeline does not add browser automation, proxies, security-check bypassing, login-wall bypassing, or CAPTCHA bypassing. If a source is blocked or returns a security check, it is recorded in review artifacts instead of being bypassed.
