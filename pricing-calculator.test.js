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
