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
