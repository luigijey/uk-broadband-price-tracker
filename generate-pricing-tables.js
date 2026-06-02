// Generate simple broadband pricing tables in the terminal.
//
// Run this file with:
//   npm run table
//
// The script uses fake sample data from sample-deals.js and the existing
// calculator from pricing-calculator.js. There are no external dependencies.

const sampleDeals = require('./sample-deals');
const { calculateBroadbandPrice } = require('./pricing-calculator');

// This order keeps speed tiers grouped from slowest to fastest.
const speedTierOrder = [
  '35-75 Mbps',
  '100-300 Mbps',
  '500-900 Mbps',
  '900 Mbps+',
];

function speedTierRank(speedTier) {
  const index = speedTierOrder.indexOf(speedTier);
  return index === -1 ? speedTierOrder.length : index;
}

function formatMoney(value) {
  return `£${value.toFixed(2)}`;
}

function formatPriceRise(value) {
  return value === 0 ? 'None' : `£${value.toFixed(2)} yearly`;
}

function totalRewards(deal) {
  return deal.voucherValue +
    deal.rewardCardValue +
    deal.cashbackValue +
    deal.billCreditValue +
    deal.freeMonthsDiscountValue +
    deal.otherDiscounts;
}

function totalFees(deal) {
  return deal.setupFee +
    deal.installationFee +
    deal.deliveryFee +
    deal.routerFee +
    deal.activationFee +
    deal.otherUpfrontCosts;
}

function describeBestReward(deal) {
  const rewards = [
    ['Voucher', deal.voucherValue],
    ['Reward card', deal.rewardCardValue],
    ['Cashback', deal.cashbackValue],
    ['Bill credit', deal.billCreditValue],
    ['Free months', deal.freeMonthsDiscountValue],
    ['Other discount', deal.otherDiscounts],
  ];

  const bestReward = rewards
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])[0];

  return bestReward ? `${bestReward[0]} ${formatMoney(bestReward[1])}` : 'None';
}

function describeRewards(deal) {
  const rewardTotal = totalRewards(deal);
  return rewardTotal === 0 ? 'None' : formatMoney(rewardTotal);
}

function describeFees(deal) {
  const feeTotal = totalFees(deal);
  return feeTotal === 0 ? 'None' : formatMoney(feeTotal);
}

function enrichDeal(deal) {
  // The sample data does not include a customer signup date. To keep the first
  // version simple, we use the last checked date as the calculator start date.
  const calculatedPrice = calculateBroadbandPrice({
    ...deal,
    contractStartDate: deal.lastCheckedDate,
  });

  return {
    ...deal,
    calculatedPrice,
  };
}

function buildNationalCheapestRows(enrichedDeals) {
  return speedTierOrder
    .map((speedTier) => {
      const cheapestDeal = enrichedDeals
        .filter((deal) => deal.speedTier === speedTier)
        .sort((a, b) => a.calculatedPrice.effectiveMonthlyPrice - b.calculatedPrice.effectiveMonthlyPrice)[0];

      if (!cheapestDeal) {
        return null;
      }

      return {
        'Speed Tier': cheapestDeal.speedTier,
        'Cheapest Provider': cheapestDeal.provider,
        'Postcode Area': cheapestDeal.postcodeArea,
        'Advertised Monthly Price': formatMoney(cheapestDeal.advertisedMonthlyPrice),
        'Effective Monthly Price': formatMoney(cheapestDeal.calculatedPrice.effectiveMonthlyPrice),
        'Contract Length': `${cheapestDeal.contractLengthMonths} months`,
        'Main Reward or Voucher': describeBestReward(cheapestDeal),
        'April Price Rise': formatPriceRise(cheapestDeal.annualAprilPriceRise),
        Source: cheapestDeal.source,
      };
    })
    .filter(Boolean);
}

function buildPostcodeComparisonRows(enrichedDeals) {
  return enrichedDeals
    .slice()
    .sort((a, b) => {
      const postcodeSort = a.postcodeArea.localeCompare(b.postcodeArea);
      if (postcodeSort !== 0) return postcodeSort;

      const speedTierSort = speedTierRank(a.speedTier) - speedTierRank(b.speedTier);
      if (speedTierSort !== 0) return speedTierSort;

      return a.calculatedPrice.effectiveMonthlyPrice - b.calculatedPrice.effectiveMonthlyPrice;
    })
    .map((deal) => ({
      'Postcode Area': deal.postcodeArea,
      'Speed Tier': deal.speedTier,
      Provider: deal.provider,
      Package: deal.packageName,
      'Speed Mbps': deal.speedMbps,
      'Advertised Monthly Price': formatMoney(deal.advertisedMonthlyPrice),
      'Effective Monthly Price': formatMoney(deal.calculatedPrice.effectiveMonthlyPrice),
      'Voucher/Rewards': describeRewards(deal),
      Fees: describeFees(deal),
      'April Price Rise': formatPriceRise(deal.annualAprilPriceRise),
      'Contract Length': `${deal.contractLengthMonths} months`,
      'Total Contract Cost After Rewards': formatMoney(deal.calculatedPrice.totalContractCostAfterRewards),
      Source: deal.source,
      'Last Checked': deal.lastCheckedDate,
    }));
}

function printTable(title, rows) {
  console.log(`\n${title}`);
  console.log('='.repeat(title.length));

  if (rows.length === 0) {
    console.log('No rows to show.');
    return;
  }

  const columns = Object.keys(rows[0]);
  const columnWidths = columns.map((column) => {
    const rowWidths = rows.map((row) => String(row[column]).length);
    return Math.max(column.length, ...rowWidths);
  });

  const divider = columnWidths.map((width) => '-'.repeat(width)).join('-|-');
  const header = columns.map((column, index) => column.padEnd(columnWidths[index])).join(' | ');

  console.log(header);
  console.log(divider);

  rows.forEach((row) => {
    const line = columns
      .map((column, index) => String(row[column]).padEnd(columnWidths[index]))
      .join(' | ');

    console.log(line);
  });
}

function main() {
  const enrichedDeals = sampleDeals.map(enrichDeal);

  printTable('Table 1: National cheapest by speed tier', buildNationalCheapestRows(enrichedDeals));
  printTable('Table 2: Postcode area comparison table', buildPostcodeComparisonRows(enrichedDeals));
}

main();
