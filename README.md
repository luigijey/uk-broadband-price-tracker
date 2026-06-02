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
