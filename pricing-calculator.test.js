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
