/**
 * Pricing calculator for residential broadband contracts.
 *
 * All money inputs and outputs are GBP values. The calculator deliberately uses
 * plain numbers because this early project only needs pound-level comparison
 * logic. If pence-level billing rules become important later, we can switch to
 * storing integer pence instead.
 */
export type PricingCalculatorInput = {
  advertisedMonthlyPrice: number;
  contractLengthMonths: number;
  contractStartDate: string | Date;
  annualAprilPriceRise: number;
  setupFee: number;
  installationFee: number;
  deliveryFee: number;
  routerFee: number;
  activationFee: number;
  voucherValue: number;
  rewardCardValue: number;
  cashbackValue: number;
  billCreditValue: number;
  freeMonthsDiscountValue: number;
  otherUpfrontCosts: number;
  otherDiscounts: number;
};

export type MonthlyPrice = {
  monthNumber: number;
  monthStartDate: string;
  aprilPriceRisesApplied: number;
  monthlyPrice: number;
};

export type PricingCalculatorResult = {
  aprilPriceRisesCrossed: number;
  monthlyPrices: MonthlyPrice[];
  totalMonthlyPayments: number;
  totalUpfrontAndExtraFees: number;
  totalRewardsAndDiscounts: number;
  totalContractCostBeforeRewards: number;
  totalContractCostAfterRewards: number;
  effectiveMonthlyPrice: number;
};

const MONTHS_IN_YEAR = 12;
const APRIL_MONTH_INDEX = 3;

export function calculateBroadbandPricing(
  input: PricingCalculatorInput,
): PricingCalculatorResult {
  validateInput(input);

  const contractStartDate = toUtcDate(input.contractStartDate);
  const monthlyPrices: MonthlyPrice[] = [];

  for (let monthOffset = 0; monthOffset < input.contractLengthMonths; monthOffset += 1) {
    const monthStartDate = addMonths(contractStartDate, monthOffset);
    const aprilPriceRisesApplied = countAprilPriceRisesCrossed(
      contractStartDate,
      monthStartDate,
    );

    monthlyPrices.push({
      monthNumber: monthOffset + 1,
      monthStartDate: formatDate(monthStartDate),
      aprilPriceRisesApplied,
      monthlyPrice:
        input.advertisedMonthlyPrice +
        aprilPriceRisesApplied * input.annualAprilPriceRise,
    });
  }

  const aprilPriceRisesCrossed = Math.max(
    0,
    ...monthlyPrices.map((month) => month.aprilPriceRisesApplied),
  );
  const totalMonthlyPayments = sum(monthlyPrices.map((month) => month.monthlyPrice));
  const totalUpfrontAndExtraFees = sum([
    input.setupFee,
    input.installationFee,
    input.deliveryFee,
    input.routerFee,
    input.activationFee,
    input.otherUpfrontCosts,
  ]);
  const totalRewardsAndDiscounts = sum([
    input.voucherValue,
    input.rewardCardValue,
    input.cashbackValue,
    input.billCreditValue,
    input.freeMonthsDiscountValue,
    input.otherDiscounts,
  ]);
  const totalContractCostBeforeRewards = totalMonthlyPayments + totalUpfrontAndExtraFees;
  const totalContractCostAfterRewards =
    totalContractCostBeforeRewards - totalRewardsAndDiscounts;

  return {
    aprilPriceRisesCrossed,
    monthlyPrices,
    totalMonthlyPayments,
    totalUpfrontAndExtraFees,
    totalRewardsAndDiscounts,
    totalContractCostBeforeRewards,
    totalContractCostAfterRewards,
    effectiveMonthlyPrice:
      totalContractCostAfterRewards / input.contractLengthMonths,
  };
}

function validateInput(input: PricingCalculatorInput) {
  const numericFields: Array<keyof Omit<PricingCalculatorInput, "contractStartDate">> = [
    "advertisedMonthlyPrice",
    "contractLengthMonths",
    "annualAprilPriceRise",
    "setupFee",
    "installationFee",
    "deliveryFee",
    "routerFee",
    "activationFee",
    "voucherValue",
    "rewardCardValue",
    "cashbackValue",
    "billCreditValue",
    "freeMonthsDiscountValue",
    "otherUpfrontCosts",
    "otherDiscounts",
  ];

  for (const field of numericFields) {
    if (!Number.isFinite(input[field])) {
      throw new Error(`${field} must be a finite number.`);
    }
  }

  if (!Number.isInteger(input.contractLengthMonths) || input.contractLengthMonths < 1) {
    throw new Error("contractLengthMonths must be a positive whole number.");
  }

  toUtcDate(input.contractStartDate);
}

function toUtcDate(date: string | Date) {
  const parsedDate = typeof date === "string" ? parseDateString(date) : date;

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("contractStartDate must be a valid date.");
  }

  return new Date(
    Date.UTC(
      parsedDate.getUTCFullYear(),
      parsedDate.getUTCMonth(),
      parsedDate.getUTCDate(),
    ),
  );
}

function parseDateString(date: string) {
  const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = date.match(dateOnlyPattern);

  if (!match) {
    return new Date(date);
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function addMonths(date: Date, monthsToAdd: number) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + monthsToAdd,
      date.getUTCDate(),
    ),
  );
}

function countAprilPriceRisesCrossed(contractStartDate: Date, monthStartDate: Date) {
  let rises = 0;

  for (
    let year = contractStartDate.getUTCFullYear();
    year <= monthStartDate.getUTCFullYear();
    year += 1
  ) {
    const aprilRiseDate = new Date(Date.UTC(year, APRIL_MONTH_INDEX, 1));

    if (aprilRiseDate > contractStartDate && aprilRiseDate <= monthStartDate) {
      rises += 1;
    }
  }

  return rises;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
