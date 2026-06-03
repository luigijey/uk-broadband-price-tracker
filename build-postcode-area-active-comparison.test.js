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
  connectionTechnology: 'fixed-line-broadband',
  serviceCategory: 'broadband-only',
  landlineStatus: 'not-included',
  callsPackageStatus: 'not-included',
  homepageCategory: 'Fixed broadband',
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
  assert.equal(output.rows[0].connectionTechnology, 'fixed-line-broadband');
  assert.equal(output.rows[0].serviceCategory, 'broadband-only');
  assert.equal(output.rows[0].landlineStatus, 'not-included');
  assert.equal(output.rows[0].callsPackageStatus, 'not-included');
  assert.equal(output.rows[0].homepageCategory, 'Fixed broadband');
  assert.equal(output.rows[0].warningMessage, ROW_WARNING);
});

test('postcode-area comparison creates valid empty rows when no homepage-visible deals exist', () => {
  const output = buildPostcodeAreaActiveComparisonOutput({
    activeDeals: [{ ...activeDeal, showOnHomepage: false }],
  }, postcodeAreas, '2026-06-03T00:00:00.000Z');

  assert.equal(output.summary.postcodeAreasIncluded, 2);
  assert.equal(output.summary.activeDealsIncluded, 0);
  assert.equal(output.summary.rowsCreated, 0);
  assert.deepEqual(output.rows, []);
  assert.match(output.summary.warningMessages.join(' '), /No active homepage-visible deals/);
});


test('postcode-area comparison includes homepage-visible 5G home broadband rows as not postcode checked', () => {
  const output = buildPostcodeAreaActiveComparisonOutput({
    activeDeals: [{
      ...activeDeal,
      activeDealId: 'active-vodafone-5g-broadband-50',
      provider: 'Vodafone',
      packageName: 'Vodafone 5G Broadband 50',
      connectionTechnology: '5g-home-broadband',
      homepageCategory: '5G home broadband',
    }],
  }, postcodeAreas, '2026-06-03T00:00:00.000Z');

  assert.equal(output.summary.activeDealsIncluded, 1);
  assert.equal(output.rows[0].connectionTechnology, '5g-home-broadband');
  assert.equal(output.rows[0].homepageCategory, '5G home broadband');
  assert.equal(output.rows[0].availabilityStatus, 'not-postcode-checked');
  assert.equal(output.rows[0].availabilityConfidence, 'national-candidate-only');
  assert.equal(output.rows[0].publishStatus, 'postcode-area-v1-review-only');
});

test('postcode-area rows include setupFeeStatus and effectivePriceCaveat', () => {
  const output = buildPostcodeAreaActiveComparisonOutput({
    activeDeals: [{
      ...activeDeal,
      setupFeeStatus: 'unknown',
      effectivePriceCaveat: 'Effective monthly price excludes any unknown upfront/setup fee.',
    }],
  }, postcodeAreas, '2026-06-03T00:00:00.000Z');

  assert.equal(output.rows[0].setupFeeStatus, 'unknown');
  assert.equal(output.rows[0].effectivePriceCaveat, 'Effective monthly price excludes any unknown upfront/setup fee.');
});
