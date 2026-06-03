// Tests for the simple broadband pricing calculator.
//
// These tests use Node's built-in test runner, so no test library is needed.

const assert = require('node:assert/strict');
const test = require('node:test');

const { calculateBroadbandPrice } = require('./pricing-calculator');

test('calculates effective monthly price with April price rises and no voucher', () => {
  const result = calculateBroadbandPrice({
    contractStartDate: '2026-01-01',
    advertisedMonthlyPrice: 24,
    contractLengthMonths: 24,
    annualAprilPriceRise: 4,
    voucherValue: 0,
  });

  assert.equal(result.aprilsCrossed, 2);
  assert.equal(result.totalContractCostAfterRewards, 696);
  assert.equal(result.effectiveMonthlyPrice, 29);
});

test('calculates effective monthly price with April price rises and a voucher', () => {
  const result = calculateBroadbandPrice({
    contractStartDate: '2026-01-01',
    advertisedMonthlyPrice: 24,
    contractLengthMonths: 24,
    annualAprilPriceRise: 4,
    voucherValue: 48,
  });

  assert.equal(result.aprilsCrossed, 2);
  assert.equal(result.totalContractCostAfterRewards, 648);
  assert.equal(result.effectiveMonthlyPrice, 27);
});


test('throws when contractLengthMonths is zero', () => {
  assert.throws(() => calculateBroadbandPrice({
    contractStartDate: '2026-01-01',
    advertisedMonthlyPrice: 24,
    contractLengthMonths: 0,
  }), /contractLengthMonths must be a positive whole number of months/);
});

test('throws when contractLengthMonths is negative', () => {
  assert.throws(() => calculateBroadbandPrice({
    contractStartDate: '2026-01-01',
    advertisedMonthlyPrice: 24,
    contractLengthMonths: -1,
  }), /contractLengthMonths must be a positive whole number of months/);
});

test('throws when contractLengthMonths is fractional', () => {
  assert.throws(() => calculateBroadbandPrice({
    contractStartDate: '2026-01-01',
    advertisedMonthlyPrice: 24,
    contractLengthMonths: 1.5,
  }), /contractLengthMonths must be a positive whole number of months/);
});

test('throws when contractLengthMonths is a string', () => {
  assert.throws(() => calculateBroadbandPrice({
    contractStartDate: '2026-01-01',
    advertisedMonthlyPrice: 24,
    contractLengthMonths: '24',
  }), /contractLengthMonths must be a positive whole number of months/);
});

test('calculates every fake sample deal without throwing', () => {
  const sampleDeals = require('./sample-deals');

  sampleDeals.forEach((deal) => {
    const result = calculateBroadbandPrice({
      ...deal,
      contractStartDate: deal.lastCheckedDate,
    });

    assert.equal(typeof result.effectiveMonthlyPrice, 'number');
    assert.ok(result.effectiveMonthlyPrice > 0);
  });
});


test('every fake sample deal has a unique readable deal ID', () => {
  const sampleDeals = require('./sample-deals');
  const dealIds = sampleDeals.map((deal) => deal.dealId);
  const uniqueDealIds = new Set(dealIds);

  assert.equal(uniqueDealIds.size, sampleDeals.length);

  dealIds.forEach((dealId) => {
    assert.match(dealId, /^[A-Z]+-[A-Z]+-[0-9]+$/);
  });
});

test('builds export rows with the required calculated pricing fields', () => {
  const sampleDeals = require('./sample-deals');
  const { calculateDeal } = require('./export-pricing-data');

  const calculatedDeal = calculateDeal(sampleDeals[0]);

  const requiredFields = [
    'dealId',
    'postcodeArea',
    'provider',
    'packageName',
    'source',
    'speedMbps',
    'speedTier',
    'advertisedMonthlyPrice',
    'effectiveMonthlyPrice',
    'contractLengthMonths',
    'annualAprilPriceRise',
    'voucherValue',
    'rewardCardValue',
    'cashbackValue',
    'billCreditValue',
    'freeMonthsDiscountValue',
    'totalFees',
    'totalRewardsAndDiscounts',
    'totalContractCostBeforeRewards',
    'totalContractCostAfterRewards',
    'lastCheckedDate',
  ];

  requiredFields.forEach((fieldName) => {
    assert.ok(Object.hasOwn(calculatedDeal, fieldName));
  });

  assert.equal(typeof calculatedDeal.effectiveMonthlyPrice, 'number');
  assert.equal(typeof calculatedDeal.totalContractCostAfterRewards, 'number');
});

test('builds static site HTML with tables and combined homepage filters', () => {
  const { buildHtml } = require('./build-static-site');

  const nationalDeals = [{
    dealId: 'OX-EXAMPLE-150',
    postcodeArea: 'OX',
    provider: 'Example Fibre',
    packageName: 'Example 150',
    source: 'Sample Source',
    speedMbps: 150,
    speedTier: '100-300 Mbps',
    advertisedMonthlyPrice: 29,
    effectiveMonthlyPrice: 26.83,
    contractLengthMonths: 24,
    annualAprilPriceRise: 3,
    voucherValue: 75,
    rewardCardValue: 0,
    cashbackValue: 0,
    billCreditValue: 0,
    freeMonthsDiscountValue: 0,
    totalFees: 0,
    totalContractCostAfterRewards: 644,
    lastCheckedDate: '2026-06-01',
  }];

  const html = buildHtml(nationalDeals, nationalDeals);

  assert.match(html, /id="national-cheapest-table"/);
  assert.match(html, /id="postcode-area-table"/);
  assert.match(html, /id="postcode-filter"/);
  assert.match(html, /id="provider-filter"/);
  assert.match(html, /id="speed-tier-filter"/);
  assert.match(html, /id="reset-filters"/);
  assert.match(html, /id="postcode-result-count"/);
  assert.match(html, /No deals match these filters\./);
  assert.match(html, /postcodeMatches && providerMatches && speedTierMatches/);
  assert.match(html, /data-provider="Example Fibre"/);
  assert.match(html, /data-speed-tier="100-300 Mbps"/);
  assert.match(html, /<th>Details<\/th>/);
  assert.match(html, /href="deals\/OX-EXAMPLE-150.html">View breakdown<\/a>/);
  assert.match(html, /<option value="OX">OX<\/option>/);
  assert.match(html, /<option value="M">M<\/option>/);
  assert.match(html, /<option value="SW">SW<\/option>/);
  assert.match(html, /<option value="BT">BT<\/option>/);
  assert.match(html, /<option value="Sky">Sky<\/option>/);
  assert.match(html, /<option value="Virgin Media">Virgin Media<\/option>/);
  assert.match(html, /<option value="Vodafone">Vodafone<\/option>/);
  assert.match(html, /<option value="TalkTalk">TalkTalk<\/option>/);
  assert.match(html, /<option value="35-75 Mbps">35-75 Mbps<\/option>/);
  assert.match(html, /<option value="500-900 Mbps">500-900 Mbps<\/option>/);
  assert.match(html, /<option value="900 Mbps\+">900 Mbps\+<\/option>/);
  assert.match(html, /Sample data only/);
});


test('builds static deal detail HTML with a price summary and monthly breakdown', () => {
  const sampleDeals = require('./sample-deals');
  const { buildDealDetailHtml } = require('./build-static-site');

  const html = buildDealDetailHtml(sampleDeals[0]);

  assert.match(html, /OX-BT-36/);
  assert.match(html, /Price summary/);
  assert.match(html, /Month-by-month breakdown/);
  assert.match(html, /Assumed contract start date/);
  assert.match(html, /Total contract cost after rewards/);
  assert.match(html, /<th>Month number<\/th>/);
  assert.match(html, /href="\.\.\/index.html"/);
});

test('source access helper reads simple robots.txt allow and disallow rules', () => {
  const { isPathAllowedByRobots } = require('./check-source-access');
  const robotsTxt = `
User-agent: *
Disallow: /private
Allow: /private/public
`;

  assert.equal(isPathAllowedByRobots(robotsTxt, '/broadband'), true);
  assert.equal(isPathAllowedByRobots(robotsTxt, '/private/deals'), false);
  assert.equal(isPathAllowedByRobots(robotsTxt, '/private/public/broadband'), true);
});

test('source access helper handles simple robots.txt wildcard rules', () => {
  const { isPathAllowedByRobots } = require('./check-source-access');
  const robotsTxt = `
User-agent: *
Disallow: /*checkout
Allow: /broadband$
`;

  assert.equal(isPathAllowedByRobots(robotsTxt, '/deals/checkout'), false);
  assert.equal(isPathAllowedByRobots(robotsTxt, '/broadband'), true);
});

test('every broadband source has the required source definition fields', () => {
  const broadbandSources = require('./broadband-sources');
  const sourceIds = new Set();

  assert.ok(broadbandSources.length >= 14);

  broadbandSources.forEach((source) => {
    ['sourceId', 'name', 'sourceType', 'baseUrl', 'candidateBroadbandUrl', 'notes', 'enabled'].forEach((fieldName) => {
      assert.ok(Object.hasOwn(source, fieldName));
    });

    assert.match(source.sourceId, /^[a-z0-9-]+$/);
    assert.ok(!sourceIds.has(source.sourceId));
    sourceIds.add(source.sourceId);
    assert.ok(['provider-direct', 'comparison-site'].includes(source.sourceType));
    assert.doesNotThrow(() => new URL(source.baseUrl));
    assert.doesNotThrow(() => new URL(source.candidateBroadbandUrl));
    assert.equal(typeof source.enabled, 'boolean');
  });
});

test('price snippet helper extracts simple pound price-like text', () => {
  const { findPriceLikeText } = require('./extract-price-snippets');

  const prices = findPriceLikeText('Plans from £24, premium at £24.99, and annual value £1,000.');

  assert.deepEqual(prices, ['£24', '£24.99', '£1,000']);
});

test('price snippet helper detects speed-like text near snippets', () => {
  const { findSpeedLikeText } = require('./extract-price-snippets');

  const speeds = findSpeedLikeText('Full Fibre 150 Mbps and Gig1 packages can also show 500Mb text.');

  assert.deepEqual(speeds, ['150 Mbps', 'Gig1', '500Mb']);
});

test('price snippet helper detects contract-like text near snippets', () => {
  const { findContractLikeText } = require('./extract-price-snippets');

  const contracts = findContractLikeText('£29 per month on a 24 months plan or 12 month plan.');

  assert.deepEqual(contracts, ['24 months', '12 month']);
});

test('price snippet helper detects reward, voucher, and cashback text near snippets', () => {
  const { findRewardLikeText } = require('./extract-price-snippets');

  const rewards = findRewardLikeText('Includes a voucher, cashback, reward card, and bill credit.');

  assert.deepEqual(rewards, ['voucher', 'cashback', 'reward', 'bill credit']);
});

test('price snippet helper extracts nearby speed, contract, and reward context', () => {
  const { extractPriceSnippetsFromText } = require('./extract-price-snippets');

  const snippets = extractPriceSnippetsFromText('Full Fibre 150 Mbps costs £29.99 per month for 24 months with a voucher.', 5);

  assert.equal(snippets.length, 1);
  assert.equal(snippets[0].priceText, '£29.99');
  assert.deepEqual(snippets[0].possibleSpeedText, ['150 Mbps']);
  assert.deepEqual(snippets[0].possibleContractText, ['24 months']);
  assert.deepEqual(snippets[0].possibleRewardText, ['voucher']);
});
