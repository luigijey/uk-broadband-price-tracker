const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { FALLBACK_CAVEAT, buildActiveDealsWithFallbacksOutput, mergeActiveFallbacks } = require('./merge-active-fallbacks');

const currentDeal = {
  activeDealId: 'active-provider-a-150',
  provider: 'Provider A',
  packageName: 'Fibre 150',
  sourceName: 'Provider A',
  sourceType: 'provider-direct',
  homepageCategory: 'Fixed broadband',
  showOnHomepage: true,
  effectiveMonthlyPrice: 30,
};

const fallbackRecord = {
  provider: 'TalkTalk',
  packageName: 'Full Fibre 150',
  sourceName: 'TalkTalk',
  sourceType: 'provider-direct',
  sourceUrl: 'https://www.talktalk.co.uk/broadband',
  advertisedMonthlyPrice: 24,
  effectiveMonthlyPrice: 26.67,
  contractLengthMonths: 24,
  annualAprilPriceRise: 4,
  setupFee: 0,
  setupFeeStatus: 'known-zero',
  speedMbps: 150,
  speedTier: '100-300 Mbps',
  homepageCategory: 'Fixed broadband',
  connectionTechnology: 'fixed-line-broadband',
  serviceCategory: 'broadband-only',
  landlineStatus: 'not-included',
  callsPackageStatus: 'not-included',
  fallbackReason: 'Provider source was unavailable in the latest run, so this row uses the last-known-good extracted review data.',
  fallbackSource: 'last-known-good',
  lastKnownGoodCheckedAt: 'previous-successful-run',
  requiresHumanReview: true,
  publishStatus: 'active-review-only',
  availabilityScope: 'provider-landing-page-not-postcode-checked',
};

const unavailableCandidates = {
  sourceSummary: [{ sourceName: 'TalkTalk', sourceId: 'talktalk', snippetsAvailable: 0, warningMessages: ['Candidate page returned HTTP 403 and was not retried or bypassed.'] }],
  warningMessages: ['TalkTalk (talktalk): Candidate page returned HTTP 403 and was not retried or bypassed.'],
};

test('fallback rows are added when provider is missing from current homepage deals and source is unavailable', () => {
  const output = buildActiveDealsWithFallbacksOutput({
    activeDealOutput: { activeDeals: [currentDeal], summary: { warningMessages: [] } },
    fallbackDealOutput: { records: [fallbackRecord] },
    providerCandidatesOutput: unavailableCandidates,
    generatedAt: '2026-06-03T00:00:00.000Z',
  });

  const fallback = output.activeDeals.find((deal) => deal.provider === 'TalkTalk');
  assert.ok(fallback);
  assert.equal(output.summary.fallbackDealsAdded, 1);
  assert.equal(fallback.showOnHomepage, true);
  assert.equal(fallback.dataFreshnessStatus, 'last-known-good-fallback');
  assert.equal(fallback.activeFeedTrustLevel, 'provider-direct-fallback-calculated');
  assert.equal(fallback.extractionQuality, 'usable-calculated');
  assert.equal(fallback.extractionConfidence, 'fallback');
  assert.equal(fallback.effectivePriceCaveat, FALLBACK_CAVEAT);
  assert.match(fallback.extractionWarnings.join(' '), /last-known-good extracted review data/);
  assert.deepEqual(output.summary.providersRestoredByFallback, ['TalkTalk']);
});

test('fallback rows are not added when current provider/package is already present', () => {
  const output = buildActiveDealsWithFallbacksOutput({
    activeDealOutput: { activeDeals: [{ ...currentDeal, provider: 'TalkTalk', packageName: 'Full Fibre 150' }] },
    fallbackDealOutput: { records: [fallbackRecord] },
    providerCandidatesOutput: unavailableCandidates,
  });

  assert.equal(output.summary.fallbackDealsAdded, 0);
  assert.equal(output.activeDeals.length, 1);
});

test('current rows get fresh-current-run freshness', () => {
  const output = buildActiveDealsWithFallbacksOutput({
    activeDealOutput: { activeDeals: [currentDeal] },
    fallbackDealOutput: { records: [] },
  });

  assert.equal(output.activeDeals[0].dataFreshnessStatus, 'fresh-current-run');
});

test('mergeActiveFallbacks writes JSON and CSV files', () => {
  const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-fallbacks-'));
  const activeDealsPath = path.join(tempFolder, 'active-online-deals.json');
  const fallbackDealsPath = path.join(tempFolder, 'last-known-good-active-deals.json');
  const providerCandidatesPath = path.join(tempFolder, 'provider-deal-candidates.json');
  const jsonOutputPath = path.join(tempFolder, 'active-online-deals-with-fallbacks.json');
  const csvOutputPath = path.join(tempFolder, 'active-online-deals-with-fallbacks.csv');

  fs.writeFileSync(activeDealsPath, JSON.stringify({ activeDeals: [currentDeal], summary: {} }));
  fs.writeFileSync(fallbackDealsPath, JSON.stringify({ records: [fallbackRecord] }));
  fs.writeFileSync(providerCandidatesPath, JSON.stringify(unavailableCandidates));

  const output = mergeActiveFallbacks({ activeDealsPath, fallbackDealsPath, providerCandidatesPath, onlineSnippetsPath: path.join(tempFolder, 'missing.json'), jsonOutputPath, csvOutputPath });

  assert.equal(output.summary.fallbackDealsAdded, 1);
  assert.ok(fs.existsSync(jsonOutputPath));
  assert.ok(fs.existsSync(csvOutputPath));
});
