# UK Broadband Price Tracker

UK Broadband Price Tracker is the foundation for a UK residential broadband price comparison website.

The goal is to make broadband prices easier to understand for normal households. Many broadband deals advertise a simple monthly price, but the amount a customer effectively pays can change once fees, rewards, discounts and annual price rises are included.

## First version scope

The first version will compare residential broadband deals by UK postcode area.

For each deal, the site should show:

- the advertised monthly price
- the effective monthly price

The advertised monthly price is the headline price shown by the provider.

The effective monthly price is the realistic average monthly cost across the whole contract. It must include:

- contract length
- April price rises
- setup fees
- delivery fees
- installation fees
- router fees
- activation fees
- vouchers
- reward cards
- cashback
- bill credits
- free months
- other upfront costs
- other discounts

## What is included now

This initial project foundation includes:

- a Next.js app
- TypeScript configuration
- a simple homepage
- a pricing calculator module
- automated tests for the pricing calculator

## What is not included yet

The following features are intentionally not part of this first task:

- scraping
- login
- Supabase
- Vercel deployment setup

## Pricing calculator

The pricing calculator lives in `src/lib/pricing/calculator.ts`.

It accepts:

- advertised monthly price
- contract length in months
- contract start date
- annual April price rise as a fixed GBP amount
- setup fee
- installation fee
- delivery fee
- router fee
- activation fee
- voucher value
- reward card value
- cashback value
- bill credit value
- free months discount value
- other upfront costs
- other discounts

It returns:

- number of April price rises crossed during the contract
- monthly price for every month of the contract
- total monthly payments
- total upfront and extra fees
- total rewards and discounts
- total contract cost before rewards
- total contract cost after rewards
- effective monthly price

## Example calculation

Example deal:

- start date: 2026-01-01
- advertised monthly price: £24
- contract length: 24 months
- annual April price rise: £4
- no voucher

The contract crosses two April price rises:

- April 2026: monthly price increases from £24 to £28
- April 2027: monthly price increases from £28 to £32

The total contract cost is £696 and the effective monthly price is £29.

If the same deal includes a £48 voucher, the total contract cost after voucher is £648 and the effective monthly price is £27.

## Scraping policy for future work

Scraping will be added later, but it must be implemented carefully and ethically.

Future scraping must:

- respect each source website's `robots.txt`
- respect source website terms and conditions
- use sensible rate limits
- identify and document data sources clearly
- avoid unnecessary load on provider websites
- not bypass anti-bot protections
- not evade access controls

## Getting started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run the automated tests:

```bash
npm test
```

Build the project:

```bash
npm run build
```

## Project structure

```text
src/app/                    Next.js app pages and styles
src/lib/pricing/            Broadband pricing calculator and tests
README.md                   Project explanation and setup notes
package.json                Project scripts and dependencies
tsconfig.json               TypeScript configuration
next.config.ts              Next.js configuration
```
