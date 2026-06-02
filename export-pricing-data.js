// Export calculated broadband pricing data to JSON and CSV files.
//
// Run this file with:
//   npm run export
//
// The script uses fake sample data from sample-deals.js and the existing
// calculator from pricing-calculator.js. There are no external dependencies.

const fs = require('node:fs');
const path = require('node:path');

const sampleDeals = require('./sample-deals');
const { calculateBroadbandPrice } = require('./pricing-calculator');

// This order keeps speed tiers grouped from slowest to fastest.
const speedTierOrder = [
  '35-75 Mbps',
  '100-300 Mbps',
  '500-900 Mbps',
  '900 Mbps+',
];

const exportFolder = path.join(__dirname, 'exports');

const exportFiles = {
  allDealsCalculated: path.join(exportFolder, 'all-deals-calculated.json'),
  nationalCheapestBySpeedTier: path.join(exportFolder, 'national-cheapest-by-speed-tier.json'),
  postcodeAreaComparisonJson: path.join(exportFolder, 'postcode-area-comparison.json'),
  postcodeAreaComparisonCsv: path.join(exportFolder, 'postcode-area-comparison.csv'),
};

function speedTierRank(speedTier) {
  const index = speedTierOrder.indexOf(speedTier);
  return index === -1 ? speedTierOrder.length : index;
}

function roundMoney(value) {
  return Number(value.toFixed(2));
}

function calculateDeal(deal) {
  // The sample data does not include a customer signup date. To keep the export
  // simple, we use the last checked date as the calculator start date.
  const calculatedPrice = calculateBroadbandPrice({
    ...deal,
    contractStartDate: deal.lastCheckedDate,
  });

  return {
    dealId: deal.dealId,
    postcodeArea: deal.postcodeArea,
    provider: deal.provider,
    packageName: deal.packageName,
    source: deal.source,
    speedMbps: deal.speedMbps,
    speedTier: deal.speedTier,
    advertisedMonthlyPrice: roundMoney(deal.advertisedMonthlyPrice),
    effectiveMonthlyPrice: roundMoney(calculatedPrice.effectiveMonthlyPrice),
    contractLengthMonths: deal.contractLengthMonths,
    annualAprilPriceRise: roundMoney(deal.annualAprilPriceRise),
    voucherValue: roundMoney(deal.voucherValue),
    rewardCardValue: roundMoney(deal.rewardCardValue),
    cashbackValue: roundMoney(deal.cashbackValue),
    billCreditValue: roundMoney(deal.billCreditValue),
    freeMonthsDiscountValue: roundMoney(deal.freeMonthsDiscountValue),
    totalFees: roundMoney(calculatedPrice.totalFees),
    totalRewardsAndDiscounts: roundMoney(calculatedPrice.totalRewardsAndDiscounts),
    totalContractCostBeforeRewards: roundMoney(calculatedPrice.totalContractCostBeforeRewards),
    totalContractCostAfterRewards: roundMoney(calculatedPrice.totalContractCostAfterRewards),
    lastCheckedDate: deal.lastCheckedDate,
  };
}

function sortByPostcodeSpeedAndPrice(deals) {
  return deals.slice().sort((a, b) => {
    const postcodeSort = a.postcodeArea.localeCompare(b.postcodeArea);
    if (postcodeSort !== 0) return postcodeSort;

    const speedTierSort = speedTierRank(a.speedTier) - speedTierRank(b.speedTier);
    if (speedTierSort !== 0) return speedTierSort;

    return a.effectiveMonthlyPrice - b.effectiveMonthlyPrice;
  });
}

function buildNationalCheapestBySpeedTier(calculatedDeals) {
  return speedTierOrder
    .map((speedTier) => {
      const cheapestDeal = calculatedDeals
        .filter((deal) => deal.speedTier === speedTier)
        .sort((a, b) => a.effectiveMonthlyPrice - b.effectiveMonthlyPrice)[0];

      return cheapestDeal || null;
    })
    .filter(Boolean);
}

function escapeCsvValue(value) {
  const text = String(value);

  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function convertDealsToCsv(deals) {
  if (deals.length === 0) {
    return '';
  }

  const columns = Object.keys(deals[0]);
  const header = columns.join(',');
  const rows = deals.map((deal) => columns
    .map((column) => escapeCsvValue(deal[column]))
    .join(','));

  return [header, ...rows].join('\n');
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function exportPricingData() {
  const calculatedDeals = sampleDeals.map(calculateDeal);
  const nationalCheapestBySpeedTier = buildNationalCheapestBySpeedTier(calculatedDeals);
  const postcodeAreaComparison = sortByPostcodeSpeedAndPrice(calculatedDeals);

  fs.mkdirSync(exportFolder, { recursive: true });

  writeJsonFile(exportFiles.allDealsCalculated, calculatedDeals);
  writeJsonFile(exportFiles.nationalCheapestBySpeedTier, nationalCheapestBySpeedTier);
  writeJsonFile(exportFiles.postcodeAreaComparisonJson, postcodeAreaComparison);
  fs.writeFileSync(exportFiles.postcodeAreaComparisonCsv, `${convertDealsToCsv(postcodeAreaComparison)}\n`);

  return {
    dealCount: calculatedDeals.length,
    speedTierCount: nationalCheapestBySpeedTier.length,
    createdFiles: Object.values(exportFiles),
  };
}

function printSummary(summary) {
  console.log('Broadband pricing export complete');
  console.log('=================================');
  console.log(`Deals exported: ${summary.dealCount}`);
  console.log(`Speed tiers exported: ${summary.speedTierCount}`);
  console.log('Files created:');
  summary.createdFiles.forEach((filePath) => {
    console.log(`- ${path.relative(__dirname, filePath)}`);
  });
}

function main() {
  const summary = exportPricingData();
  printSummary(summary);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildNationalCheapestBySpeedTier,
  calculateDeal,
  convertDealsToCsv,
  exportPricingData,
  sortByPostcodeSpeedAndPrice,
};
