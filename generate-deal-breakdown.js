// Print a beginner-friendly price breakdown for one fake sample broadband deal.
//
// This script does not fetch live prices. It only uses the example deals in
// sample-deals.js and the simple calculator in pricing-calculator.js.

const sampleDeals = require('./sample-deals');
const { calculateBroadbandPrice } = require('./pricing-calculator');

function formatMoney(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function formatPriceRise(value) {
  return `${formatMoney(value)} each April`;
}

function getTodayAsIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function printRows(rows) {
  const labelWidth = Math.max(...rows.map((row) => row[0].length));

  rows.forEach(([label, value]) => {
    console.log(`${label.padEnd(labelWidth)} : ${value}`);
  });
}

function printAvailableDeals() {
  console.log('Available sample broadband deals');
  console.log('================================');
  console.log('Use one of these deal IDs with: npm run breakdown -- DEAL_ID');
  console.log('');

  console.table(sampleDeals.map((deal) => ({
    dealId: deal.dealId,
    'Postcode Area': deal.postcodeArea,
    Provider: deal.provider,
    Package: deal.packageName,
    'Speed Mbps': deal.speedMbps,
    'Advertised Monthly Price': formatMoney(deal.advertisedMonthlyPrice),
  })));
}

function getMonthNote(month) {
  if (month.aprilsCrossedSoFar === 0) {
    return 'Starting advertised price';
  }

  return `Price after April rise ${month.aprilsCrossedSoFar}`;
}

function printDealBreakdown(deal) {
  const contractStartDate = getTodayAsIsoDate();
  const result = calculateBroadbandPrice({
    ...deal,
    contractStartDate,
  });

  console.log(`Deal breakdown for ${deal.dealId}`);
  console.log('='.repeat(`Deal breakdown for ${deal.dealId}`.length));
  console.log('');

  console.log('Header');
  console.log('------');
  printRows([
    ['Deal ID', deal.dealId],
    ['Postcode area', deal.postcodeArea],
    ['Provider', deal.provider],
    ['Package name', deal.packageName],
    ['Source', deal.source],
    ['Speed Mbps', `${deal.speedMbps}`],
    ['Speed tier', deal.speedTier],
    ['Last checked date', deal.lastCheckedDate],
  ]);
  console.log('');

  console.log('Price summary');
  console.log('-------------');
  printRows([
    ['Advertised monthly price', formatMoney(deal.advertisedMonthlyPrice)],
    ['Contract length', `${deal.contractLengthMonths} months`],
    ['Assumed contract start date', contractStartDate],
    ['Annual April price rise', formatPriceRise(deal.annualAprilPriceRise)],
    ['Number of April price rises crossed', `${result.aprilsCrossed}`],
    ['Total monthly payments', formatMoney(result.totalMonthlyPayments)],
    ['Setup fee', formatMoney(deal.setupFee)],
    ['Installation fee', formatMoney(deal.installationFee)],
    ['Delivery fee', formatMoney(deal.deliveryFee)],
    ['Router fee', formatMoney(deal.routerFee)],
    ['Activation fee', formatMoney(deal.activationFee)],
    ['Other upfront costs', formatMoney(deal.otherUpfrontCosts)],
    ['Total fees', formatMoney(result.totalFees)],
    ['Voucher value', formatMoney(deal.voucherValue)],
    ['Reward card value', formatMoney(deal.rewardCardValue)],
    ['Cashback value', formatMoney(deal.cashbackValue)],
    ['Bill credit value', formatMoney(deal.billCreditValue)],
    ['Free months discount value', formatMoney(deal.freeMonthsDiscountValue)],
    ['Other discounts', formatMoney(deal.otherDiscounts)],
    ['Total rewards and discounts', formatMoney(result.totalRewardsAndDiscounts)],
    ['Total contract cost before rewards', formatMoney(result.totalContractCostBeforeRewards)],
    ['Total contract cost after rewards', formatMoney(result.totalContractCostAfterRewards)],
    ['Effective monthly price', formatMoney(result.effectiveMonthlyPrice)],
  ]);
  console.log('');

  console.log('Month-by-month breakdown');
  console.log('------------------------');
  console.table(result.monthlyPrices.map((month) => ({
    'Month Number': month.monthNumber,
    'Month Date': month.date,
    'Monthly Price': formatMoney(month.monthlyPrice),
    Note: getMonthNote(month),
  })));
}

function findDealById(dealId) {
  return sampleDeals.find((deal) => deal.dealId === dealId);
}

function main() {
  const dealId = process.argv[2];

  if (!dealId) {
    printAvailableDeals();
    return;
  }

  const deal = findDealById(dealId);

  if (!deal) {
    console.log(`Sorry, I could not find a sample deal with the ID "${dealId}".`);
    console.log('Please choose one of the available deal IDs below.');
    console.log('');
    printAvailableDeals();
    process.exitCode = 1;
    return;
  }

  printDealBreakdown(deal);
}

main();
