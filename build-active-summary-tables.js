// Build active demo summary tables from homepage-visible active online deals.
//
// This prefers exports/active-online-deals-with-fallbacks.json when present,
// and falls back to exports/active-online-deals.json. It does not perform provider
// postcode checks, submit forms, or fetch any provider/comparison pages.

const fs = require('node:fs');
const path = require('node:path');

const ACTIVE_DEALS_PATH = path.join(__dirname, 'exports', 'active-online-deals.json');
const ACTIVE_DEALS_WITH_FALLBACKS_PATH = path.join(__dirname, 'exports', 'active-online-deals-with-fallbacks.json');
const JSON_OUTPUT_PATH = path.join(__dirname, 'exports', 'active-cheapest-by-speed-tier.json');
const CSV_OUTPUT_PATH = path.join(__dirname, 'exports', 'active-cheapest-by-speed-tier.csv');

const ACTIVE_CHEAPEST_COLUMNS = [
  'speedTier',
  'provider',
  'packageName',
  'sourceName',
  'advertisedMonthlyPrice',
  'effectiveMonthlyPrice',
  'speedMbps',
  'setupFeeStatus',
  'effectivePriceCaveat',
  'activeDealId',
];

function readJsonFileIfExists(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveActiveDealsPath(preferredPath = ACTIVE_DEALS_WITH_FALLBACKS_PATH, fallbackPath = ACTIVE_DEALS_PATH) {
  return fs.existsSync(preferredPath) ? preferredPath : fallbackPath;
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

function toNumberOrNull(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function isHomepageVisibleActiveDeal(deal) {
  return deal && deal.showOnHomepage === true;
}

function buildCheapestBySpeedTierRows(activeDealOutput) {
  const activeDeals = normalizeActiveDealOutput(activeDealOutput);
  const cheapestByTier = new Map();

  activeDeals
    .filter(isHomepageVisibleActiveDeal)
    .forEach((deal) => {
      const speedTier = deal.speedTier || 'Unknown speed tier';
      const effectiveMonthlyPrice = toNumberOrNull(deal.effectiveMonthlyPrice);
      const existing = cheapestByTier.get(speedTier);
      const existingPrice = existing ? toNumberOrNull(existing.effectiveMonthlyPrice) : null;

      if (!existing || (effectiveMonthlyPrice !== null && (existingPrice === null || effectiveMonthlyPrice < existingPrice))) {
        cheapestByTier.set(speedTier, deal);
      }
    });

  return [...cheapestByTier.entries()]
    .sort(([leftTier], [rightTier]) => String(leftTier).localeCompare(String(rightTier), 'en-GB', { numeric: true }))
    .map(([speedTier, deal]) => ({
      speedTier,
      provider: deal.provider || '',
      packageName: deal.packageName || '',
      sourceName: deal.sourceName || '',
      advertisedMonthlyPrice: deal.advertisedMonthlyPrice ?? null,
      effectiveMonthlyPrice: deal.effectiveMonthlyPrice ?? null,
      speedMbps: deal.speedMbps ?? null,
      setupFeeStatus: deal.setupFeeStatus || '',
      effectivePriceCaveat: deal.effectivePriceCaveat || '',
      activeDealId: deal.activeDealId || '',
    }));
}

function buildActiveCheapestBySpeedTierOutput(activeDealOutput, generatedAt = new Date().toISOString(), sourceFile = 'exports/active-online-deals.json') {
  const activeDeals = normalizeActiveDealOutput(activeDealOutput);
  const homepageVisibleDeals = activeDeals.filter(isHomepageVisibleActiveDeal);
  const rows = buildCheapestBySpeedTierRows(activeDealOutput);
  const warningMessages = [
    'These are active review deals only and are not provider-level postcode availability checks.',
  ];

  if (homepageVisibleDeals.length === 0) {
    warningMessages.push('No active homepage-visible deals were available, so cheapest-by-speed-tier rows are empty.');
  }

  return {
    summary: {
      generatedAt,
      sourceFile,
      homepageVisibleDealsIncluded: homepageVisibleDeals.length,
      speedTierSummaryRows: rows.length,
      hiddenRecordsExcluded: activeDeals.filter((deal) => deal && deal.showOnHomepage !== true).length,
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
    ACTIVE_CHEAPEST_COLUMNS.join(','),
    ...rows.map((row) => ACTIVE_CHEAPEST_COLUMNS.map((column) => csvEscape(row[column])).join(',')),
  ];
  fs.writeFileSync(filePath, `${csvRows.join('\n')}\n`);
}

function buildActiveSummaryTables({
  activeDealsPath = resolveActiveDealsPath(),
  jsonOutputPath = JSON_OUTPUT_PATH,
  csvOutputPath = CSV_OUTPUT_PATH,
  generatedAt = new Date().toISOString(),
} = {}) {
  const activeDealOutput = readJsonFileIfExists(activeDealsPath, { activeDeals: [] });
  const output = buildActiveCheapestBySpeedTierOutput(activeDealOutput, generatedAt, path.relative(__dirname, activeDealsPath));
  writeJsonFile(jsonOutputPath, output);
  writeCsvFile(csvOutputPath, output.rows);
  return output;
}

function main() {
  const output = buildActiveSummaryTables();
  console.log('Active summary tables build complete');
  console.log('====================================');
  console.log(`Homepage-visible active deals included: ${output.summary.homepageVisibleDealsIncluded}`);
  console.log(`Speed-tier summary rows: ${output.summary.speedTierSummaryRows}`);
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
  ACTIVE_CHEAPEST_COLUMNS,
  ACTIVE_DEALS_WITH_FALLBACKS_PATH,
  buildActiveCheapestBySpeedTierOutput,
  buildActiveSummaryTables,
  resolveActiveDealsPath,
  buildCheapestBySpeedTierRows,
  isHomepageVisibleActiveDeal,
};
