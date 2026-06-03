const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ROW_WARNING,
  buildPostcodeAreaActiveComparisonOutput,
} = require('./build-postcode-area-active-comparison');

const activeDeal = {
  activeDealId: 'active-talktalk-full-fibre-150-provider-page',
  provider: 'TalkTalk',
  packageName: 'Full Fibre 150',
  sourceName: 'TalkTalk',
  sourceType: 'provider-direct',
  advertisedMonthlyPrice: 29,
  effectiveMonthlyPrice: 31.5,
  speedMbps: 150,
  speedTier: '100-300 Mbps',
  contractLengthMonths: 24,
  annualAprilPriceRise: 4,
  productType: 'broadband-only',
  showOnHomepage: true,
};

const postcodeAreas = [
  { postcodeArea: 'OX', regionName: 'South East England', country: 'England', enabled: true },
  { postcodeArea: 'M', regionName: 'North West England', country: 'England', enabled: true },
  { postcodeArea: 'ZZ', regionName: 'Disabled test area', country: 'England', enabled: false },
];

test('postcode-area comparison output has the expected shape and review-only warnings', () => {
  const output = buildPostcodeAreaActiveComparisonOutput({ activeDeals: [activeDeal] }, postcodeAreas, '2026-06-03T00:00:00.000Z');

  assert.deepEqual(output.summary, {
    generatedAt: '2026-06-03T00:00:00.000Z',
    postcodeAreasIncluded: 2,
    activeDealsIncluded: 1,
    rowsCreated: 2,
    warningMessages: output.summary.warningMessages,
  });
  assert.equal(output.rows.length, 2);
  assert.equal(output.rows[0].postcodeArea, 'OX');
  assert.equal(output.rows[0].activeDealId, activeDeal.activeDealId);
  assert.equal(output.rows[0].availabilityStatus, 'not-postcode-checked');
  assert.equal(output.rows[0].availabilityConfidence, 'national-candidate-only');
  assert.equal(output.rows[0].publishStatus, 'postcode-area-v1-review-only');
  assert.equal(output.rows[0].warningMessage, ROW_WARNING);
});

test('postcode-area comparison creates valid empty rows when no homepage broadband-only deals exist', () => {
  const output = buildPostcodeAreaActiveComparisonOutput({
    activeDeals: [{ ...activeDeal, showOnHomepage: false }],
  }, postcodeAreas, '2026-06-03T00:00:00.000Z');

  assert.equal(output.summary.postcodeAreasIncluded, 2);
  assert.equal(output.summary.activeDealsIncluded, 0);
  assert.equal(output.summary.rowsCreated, 0);
  assert.deepEqual(output.rows, []);
  assert.match(output.summary.warningMessages.join(' '), /No active homepage broadband-only deals/);
});
