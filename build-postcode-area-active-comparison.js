// Build Postcode Area V1 active comparison review files.
//
// These rows are not true postcode-checked availability results. They repeat
// active national candidate broadband-only homepage deals across enabled
// postcode areas for the first postcode-area prototype only.

const fs = require('node:fs');
const path = require('node:path');

const postcodeAreas = require('./postcode-areas');

const ACTIVE_DEALS_PATH = path.join(__dirname, 'exports', 'active-online-deals.json');
const JSON_OUTPUT_PATH = path.join(__dirname, 'exports', 'postcode-area-active-comparison.json');
const CSV_OUTPUT_PATH = path.join(__dirname, 'exports', 'postcode-area-active-comparison.csv');
const ROW_WARNING = 'This active deal is shown for postcode-area comparison only and has not been checked against this postcode area.';
const { isHomepageVisibleCategory } = require('./product-classification');

const POSTCODE_AREA_COLUMNS = [
  'postcodeArea',
  'regionName',
  'country',
  'activeDealId',
  'provider',
  'packageName',
  'sourceName',
  'sourceType',
  'advertisedMonthlyPrice',
  'effectiveMonthlyPrice',
  'speedMbps',
  'speedTier',
  'contractLengthMonths',
  'annualAprilPriceRise',
  'productType',
  'connectionTechnology',
  'serviceCategory',
  'landlineStatus',
  'callsPackageStatus',
  'homepageCategory',
  'availabilityStatus',
  'availabilityConfidence',
  'publishStatus',
  'warningMessage',
];

function readJsonFileIfExists(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeActiveDealOutput(activeDealOutput) {
  if (Array.isArray(activeDealOutput)) {
    return activeDealOutput;
  }

  if (!activeDealOutput || typeof activeDealOutput !== 'object') {
    return [];
  }

  return Array.isArray(activeDealOutput.activeDeals) ? activeDealOutput.activeDeals : [];
}

function enabledPostcodeAreas(areas = postcodeAreas) {
  return areas.filter((area) => area && area.enabled === true);
}

function activeHomepageBroadbandOnlyDeals(activeDeals) {
  return activeDeals.filter((deal) => deal && deal.showOnHomepage === true && isHomepageVisibleCategory(deal.homepageCategory));
}

function buildPostcodeAreaRows(activeDeals, areas = postcodeAreas) {
  const enabledAreas = enabledPostcodeAreas(areas);
  const homepageDeals = activeHomepageBroadbandOnlyDeals(activeDeals);

  return enabledAreas.flatMap((area) => homepageDeals.map((deal) => ({
    postcodeArea: area.postcodeArea,
    regionName: area.regionName,
    country: area.country,
    activeDealId: deal.activeDealId,
    provider: deal.provider,
    packageName: deal.packageName,
    sourceName: deal.sourceName,
    sourceType: deal.sourceType,
    advertisedMonthlyPrice: deal.advertisedMonthlyPrice,
    effectiveMonthlyPrice: deal.effectiveMonthlyPrice,
    speedMbps: deal.speedMbps,
    speedTier: deal.speedTier,
    contractLengthMonths: deal.contractLengthMonths,
    annualAprilPriceRise: deal.annualAprilPriceRise,
    productType: deal.productType,
    connectionTechnology: deal.connectionTechnology,
    serviceCategory: deal.serviceCategory,
    landlineStatus: deal.landlineStatus,
    callsPackageStatus: deal.callsPackageStatus,
    homepageCategory: deal.homepageCategory,
    availabilityStatus: 'not-postcode-checked',
    availabilityConfidence: 'national-candidate-only',
    publishStatus: 'postcode-area-v1-review-only',
    warningMessage: ROW_WARNING,
  })));
}

function buildPostcodeAreaActiveComparisonOutput(activeDealOutput, areas = postcodeAreas, generatedAt = new Date().toISOString()) {
  const activeDeals = normalizeActiveDealOutput(activeDealOutput);
  const enabledAreas = enabledPostcodeAreas(areas);
  const homepageDeals = activeHomepageBroadbandOnlyDeals(activeDeals);
  const rows = buildPostcodeAreaRows(activeDeals, areas);
  const warningMessages = [
    'These rows are not true postcode-checked availability results yet. They show active national candidate deals grouped by postcode area for the first postcode-area prototype.',
  ];

  if (homepageDeals.length === 0) {
    warningMessages.push('No active homepage-visible deals were available, so postcode-area comparison rows are empty.');
  }

  return {
    summary: {
      generatedAt,
      postcodeAreasIncluded: enabledAreas.length,
      activeDealsIncluded: homepageDeals.length,
      rowsCreated: rows.length,
      warningMessages,
    },
    rows,
  };
}

function csvEscape(value) {
  const stringValue = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeCsvFile(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const csvRows = [
    POSTCODE_AREA_COLUMNS.join(','),
    ...rows.map((row) => POSTCODE_AREA_COLUMNS.map((column) => csvEscape(row[column])).join(',')),
  ];
  fs.writeFileSync(filePath, `${csvRows.join('\n')}\n`);
}

function buildPostcodeAreaActiveComparison({
  activeDealsPath = ACTIVE_DEALS_PATH,
  jsonOutputPath = JSON_OUTPUT_PATH,
  csvOutputPath = CSV_OUTPUT_PATH,
  areas = postcodeAreas,
  generatedAt = new Date().toISOString(),
} = {}) {
  const activeDealOutput = readJsonFileIfExists(activeDealsPath, { activeDeals: [] });
  const output = buildPostcodeAreaActiveComparisonOutput(activeDealOutput, areas, generatedAt);
  writeJsonFile(jsonOutputPath, output);
  writeCsvFile(csvOutputPath, output.rows);
  return output;
}

function main() {
  const output = buildPostcodeAreaActiveComparison();
  console.log('Postcode Area V1 comparison build complete');
  console.log('==========================================');
  console.log(`Postcode areas included: ${output.summary.postcodeAreasIncluded}`);
  console.log(`Active homepage-visible deals included: ${output.summary.activeDealsIncluded}`);
  console.log(`Rows created: ${output.summary.rowsCreated}`);
  console.log(`JSON created: ${path.relative(__dirname, JSON_OUTPUT_PATH)}`);
  console.log(`CSV created: ${path.relative(__dirname, CSV_OUTPUT_PATH)}`);
  if (output.summary.warningMessages.length > 0) {
    console.log('Warnings:');
    output.summary.warningMessages.forEach((warning) => console.log(`- ${warning}`));
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  POSTCODE_AREA_COLUMNS,
  ROW_WARNING,
  activeHomepageBroadbandOnlyDeals,
  buildPostcodeAreaActiveComparison,
  buildPostcodeAreaActiveComparisonOutput,
  buildPostcodeAreaRows,
  enabledPostcodeAreas,
};
