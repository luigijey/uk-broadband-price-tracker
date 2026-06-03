const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildActiveCheapestBySpeedTierOutput, buildActiveSummaryTables } = require('./build-active-summary-tables');

const baseDeal = {
  activeDealId: 'active-provider-150',
  provider: 'Provider A',
  packageName: 'Fibre 150',
  sourceName: 'Provider A',
  sourceType: 'provider-direct',
  speedTier: '100-300 Mbps',
  advertisedMonthlyPrice: 30,
  effectiveMonthlyPrice: 32,
  speedMbps: 150,
  setupFeeStatus: 'known-zero',
  showOnHomepage: true,
};

test('active cheapest-by-speed-tier JSON output has expected shape', () => {
  const output = buildActiveCheapestBySpeedTierOutput({ activeDeals: [baseDeal] }, '2026-06-03T00:00:00.000Z');

  assert.equal(output.summary.generatedAt, '2026-06-03T00:00:00.000Z');
  assert.equal(output.summary.homepageVisibleDealsIncluded, 1);
  assert.equal(output.summary.speedTierSummaryRows, 1);
  assert.deepEqual(Object.keys(output.rows[0]), [
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
  ]);
});

test('cheapest deal per speed tier is selected by effectiveMonthlyPrice', () => {
  const output = buildActiveCheapestBySpeedTierOutput({
    activeDeals: [
      baseDeal,
      { ...baseDeal, activeDealId: 'active-provider-150-cheaper', provider: 'Provider B', effectiveMonthlyPrice: 28 },
      { ...baseDeal, activeDealId: 'active-provider-900', speedTier: '900 Mbps+', speedMbps: 910, effectiveMonthlyPrice: 40 },
    ],
  });

  assert.equal(output.rows.length, 2);
  assert.equal(output.rows.find((row) => row.speedTier === '100-300 Mbps').activeDealId, 'active-provider-150-cheaper');
});

test('hidden active records are excluded from cheapest-by-speed-tier output', () => {
  const output = buildActiveCheapestBySpeedTierOutput({
    activeDeals: [
      baseDeal,
      { ...baseDeal, activeDealId: 'hidden-cheapest', effectiveMonthlyPrice: 1, showOnHomepage: false },
    ],
  });

  assert.equal(output.rows.length, 1);
  assert.equal(output.rows[0].activeDealId, 'active-provider-150');
  assert.equal(output.summary.hiddenRecordsExcluded, 1);
});

test('active summary tables writes JSON and CSV, including empty warning output', () => {
  const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'active-summary-'));
  const activeDealsPath = path.join(tempFolder, 'active-online-deals.json');
  const jsonOutputPath = path.join(tempFolder, 'active-cheapest-by-speed-tier.json');
  const csvOutputPath = path.join(tempFolder, 'active-cheapest-by-speed-tier.csv');
  fs.writeFileSync(activeDealsPath, JSON.stringify({ activeDeals: [] }));

  const output = buildActiveSummaryTables({ activeDealsPath, jsonOutputPath, csvOutputPath, generatedAt: '2026-06-03T00:00:00.000Z' });
  const json = JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'));
  const csv = fs.readFileSync(csvOutputPath, 'utf8');

  assert.equal(output.rows.length, 0);
  assert.equal(json.rows.length, 0);
  assert.match(json.summary.warningMessages.join(' '), /No active homepage-visible deals/);
  assert.match(csv, /^speedTier,provider,packageName,sourceName,advertisedMonthlyPrice,effectiveMonthlyPrice,speedMbps,setupFeeStatus,effectivePriceCaveat,activeDealId\n$/);
});
