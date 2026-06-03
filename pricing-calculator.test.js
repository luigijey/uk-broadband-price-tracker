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

test('builds static site HTML with both tables and the postcode filter', () => {
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
  assert.match(html, /<th>Details<\/th>/);
  assert.match(html, /href="deals\/OX-EXAMPLE-150.html">View breakdown<\/a>/);
  assert.match(html, /<option value="OX">OX<\/option>/);
  assert.match(html, /<option value="M">M<\/option>/);
  assert.match(html, /<option value="SW">SW<\/option>/);
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
