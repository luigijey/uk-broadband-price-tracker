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

The repository can generate a very simple static website from the calculated export files. This page is plain HTML with a little CSS and browser JavaScript. It does not use Next.js, React, TypeScript, Supabase, Vercel, scraping, or external packages.

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

- `site/index.html`

To view the page, open `site/index.html` directly in your web browser. For example, you can double-click the file in your file browser, or use your browser's **File > Open File** menu.

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
