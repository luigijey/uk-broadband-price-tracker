import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateBroadbandPricing,
  type PricingCalculatorInput,
} from "./calculator.ts";

const baseInput: PricingCalculatorInput = {
  advertisedMonthlyPrice: 24,
  contractLengthMonths: 24,
  contractStartDate: "2026-01-01",
  annualAprilPriceRise: 4,
  setupFee: 0,
  installationFee: 0,
  deliveryFee: 0,
  routerFee: 0,
  activationFee: 0,
  voucherValue: 0,
  rewardCardValue: 0,
  cashbackValue: 0,
  billCreditValue: 0,
  freeMonthsDiscountValue: 0,
  otherUpfrontCosts: 0,
  otherDiscounts: 0,
};

describe("calculateBroadbandPricing", () => {
  it("calculates monthly rises, total contract cost and effective monthly price without a voucher", () => {
    const result = calculateBroadbandPricing(baseInput);

    assert.equal(result.aprilPriceRisesCrossed, 2);
    assert.equal(result.monthlyPrices.length, 24);
    assert.deepEqual(result.monthlyPrices.slice(0, 3).map((month) => month.monthlyPrice), [
      24, 24, 24,
    ]);
    assert.deepEqual(
      result.monthlyPrices.slice(3, 15).map((month) => month.monthlyPrice),
      Array(12).fill(28),
    );
    assert.deepEqual(
      result.monthlyPrices.slice(15).map((month) => month.monthlyPrice),
      Array(9).fill(32),
    );
    assert.equal(result.totalMonthlyPayments, 696);
    assert.equal(result.totalUpfrontAndExtraFees, 0);
    assert.equal(result.totalRewardsAndDiscounts, 0);
    assert.equal(result.totalContractCostBeforeRewards, 696);
    assert.equal(result.totalContractCostAfterRewards, 696);
    assert.equal(result.effectiveMonthlyPrice, 29);
  });

  it("subtracts a voucher from the total contract cost and effective monthly price", () => {
    const result = calculateBroadbandPricing({
      ...baseInput,
      voucherValue: 48,
    });

    assert.equal(result.totalContractCostBeforeRewards, 696);
    assert.equal(result.totalRewardsAndDiscounts, 48);
    assert.equal(result.totalContractCostAfterRewards, 648);
    assert.equal(result.effectiveMonthlyPrice, 27);
  });

  it("adds upfront and extra fees before subtracting rewards and discounts", () => {
    const result = calculateBroadbandPricing({
      ...baseInput,
      contractLengthMonths: 12,
      setupFee: 10,
      installationFee: 20,
      deliveryFee: 5,
      routerFee: 15,
      activationFee: 10,
      otherUpfrontCosts: 30,
      rewardCardValue: 25,
      cashbackValue: 20,
      billCreditValue: 10,
      freeMonthsDiscountValue: 24,
      otherDiscounts: 11,
    });

    assert.equal(result.totalUpfrontAndExtraFees, 90);
    assert.equal(result.totalRewardsAndDiscounts, 90);
    assert.equal(result.totalContractCostAfterRewards, result.totalMonthlyPayments);
  });

  it("rejects invalid contract lengths", () => {
    assert.throws(
      () =>
        calculateBroadbandPricing({
          ...baseInput,
          contractLengthMonths: 0,
        }),
      /contractLengthMonths must be a positive whole number\./,
    );
  });
});
