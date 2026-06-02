// A very small broadband pricing calculator.
//
// This file uses plain JavaScript so it is easy to read for beginners.
// There are no external packages and no framework code.

/**
 * Convert a value to a number.
 *
 * If the value is missing, we treat it as 0 because most fees and discounts
 * are optional.
 */
function numberOrZero(value) {
  return Number(value || 0);
}

/**
 * Add a number of months to a date.
 *
 * This lets us look at each month in the broadband contract one by one.
 */
function addMonths(date, monthsToAdd) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + monthsToAdd,
    date.getUTCDate()
  ));
}

/**
 * Check whether a contract month starts on or after 1 April.
 *
 * UK broadband providers often increase prices every April. In this simple
 * first version, each 1 April crossed by the contract adds the fixed annual
 * April price rise to all following monthly payments.
 */
function isAprilOrLater(date) {
  // JavaScript months start at 0, so April is month number 3.
  return date.getUTCMonth() >= 3;
}

/**
 * Count how many 1 Aprils have been crossed by a given contract month.
 */
function countAprilsCrossed(contractStartDate, monthDate) {
  let aprilsCrossed = 0;

  // We check each year from the contract start year up to the current month.
  for (let year = contractStartDate.getUTCFullYear(); year <= monthDate.getUTCFullYear(); year += 1) {
    const aprilFirst = new Date(Date.UTC(year, 3, 1));

    // If 1 April is after the start date and on or before this contract month,
    // the contract has crossed that April price rise.
    if (aprilFirst > contractStartDate && aprilFirst <= monthDate) {
      aprilsCrossed += 1;
    }
  }

  return aprilsCrossed;
}

/**
 * Calculate the full broadband contract cost.
 */
function calculateBroadbandPrice(input) {
  const advertisedMonthlyPrice = numberOrZero(input.advertisedMonthlyPrice);
  const contractLengthMonths = Number(input.contractLengthMonths);
  const contractStartDate = new Date(input.contractStartDate);
  const annualAprilPriceRise = numberOrZero(input.annualAprilPriceRise);

  const monthlyPrices = [];

  // Build a list showing the price for every month of the contract.
  for (let monthNumber = 0; monthNumber < contractLengthMonths; monthNumber += 1) {
    const monthDate = addMonths(contractStartDate, monthNumber);
    const aprilsCrossedSoFar = countAprilsCrossed(contractStartDate, monthDate);
    const monthlyPrice = advertisedMonthlyPrice + (aprilsCrossedSoFar * annualAprilPriceRise);

    monthlyPrices.push({
      monthNumber: monthNumber + 1,
      date: monthDate.toISOString().slice(0, 10),
      isAprilOrLater: isAprilOrLater(monthDate),
      aprilsCrossedSoFar,
      monthlyPrice,
    });
  }

  const aprilsCrossed = monthlyPrices.length === 0
    ? 0
    : monthlyPrices[monthlyPrices.length - 1].aprilsCrossedSoFar;

  const totalMonthlyPayments = monthlyPrices.reduce((total, month) => total + month.monthlyPrice, 0);

  const totalFees =
    numberOrZero(input.setupFee) +
    numberOrZero(input.installationFee) +
    numberOrZero(input.deliveryFee) +
    numberOrZero(input.routerFee) +
    numberOrZero(input.activationFee) +
    numberOrZero(input.otherUpfrontCosts);

  const totalRewardsAndDiscounts =
    numberOrZero(input.voucherValue) +
    numberOrZero(input.rewardCardValue) +
    numberOrZero(input.cashbackValue) +
    numberOrZero(input.billCreditValue) +
    numberOrZero(input.freeMonthsDiscountValue) +
    numberOrZero(input.otherDiscounts);

  const totalContractCostBeforeRewards = totalMonthlyPayments + totalFees;
  const totalContractCostAfterRewards = totalContractCostBeforeRewards - totalRewardsAndDiscounts;
  const effectiveMonthlyPrice = totalContractCostAfterRewards / contractLengthMonths;

  return {
    monthlyPrices,
    aprilsCrossed,
    totalMonthlyPayments,
    totalFees,
    totalRewardsAndDiscounts,
    totalContractCostBeforeRewards,
    totalContractCostAfterRewards,
    effectiveMonthlyPrice,
  };
}

module.exports = {
  calculateBroadbandPrice,
};
