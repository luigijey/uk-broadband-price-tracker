const assert = require('node:assert/strict');
const test = require('node:test');

const { buildActiveOnlineDealsOutput, isPromotableCandidate } = require('./promote-usable-candidates');

const baseCandidate = {
  candidateId: 'talktalk-full-fibre-150-provider-page',
  provider: 'TalkTalk',
  packageName: 'Full Fibre 150',
  sourceName: 'TalkTalk',
  sourceType: 'provider-direct',
  sourceUrl: 'https://www.talktalk.co.uk/broadband',
  advertisedMonthlyPrice: 29,
  effectiveMonthlyPrice: 31.5,
  sourceEffectiveMonthlyPrice: null,
  contractLengthMonths: 24,
  annualAprilPriceRise: 4,
  setupFee: 0,
  voucherValue: null,
  rewardCardValue: null,
  cashbackValue: null,
  billCreditValue: null,
  speedMbps: 150,
  speedTier: '100-300 Mbps',
  extractionConfidence: 'high',
  extractionQuality: 'usable-calculated',
  availabilityScope: 'provider-landing-page-not-postcode-checked',
  publishStatus: 'candidate-review-only',
  requiresHumanReview: true,
  sourceSnippet: 'TalkTalk Full Fibre 150 £29 a month. Price rises by £4 each April. 24 month contract.',
  extractionWarnings: [],
};

function candidate(overrides = {}) {
  return { ...baseCandidate, ...overrides };
}

test('promotes usable-calculated candidate into active review-only shape', () => {
  const output = buildActiveOnlineDealsOutput({ candidates: [candidate()] }, '2026-06-03T00:00:00.000Z');

  assert.equal(output.summary.totalActiveDeals, 1);
  assert.equal(output.summary.usableCalculatedCount, 1);
  assert.equal(output.activeDeals[0].activeDealId, 'active-talktalk-full-fibre-150-provider-page');
  assert.equal(output.activeDeals[0].publishStatus, 'active-review-only');
  assert.equal(output.activeDeals[0].requiresHumanReview, true);
  assert.equal(output.activeDeals[0].generatedAt, '2026-06-03T00:00:00.000Z');
});

test('promotes usable-source-effective-only candidate', () => {
  const output = buildActiveOnlineDealsOutput({ candidates: [candidate({
    candidateId: 'source-effective-only',
    effectiveMonthlyPrice: null,
    sourceEffectiveMonthlyPrice: 28.75,
    annualAprilPriceRise: null,
    extractionQuality: 'usable-source-effective-only',
  })] }, '2026-06-03T00:00:00.000Z');

  assert.equal(output.summary.totalActiveDeals, 1);
  assert.equal(output.summary.sourceEffectiveOnlyCount, 1);
  assert.equal(output.activeDeals[0].sourceEffectiveMonthlyPrice, 28.75);
});

test('review-only missing-field candidates are not promoted', () => {
  assert.equal(isPromotableCandidate(candidate({ extractionQuality: 'review-only-missing-fields' })), false);
});

test('discarded noisy candidates are not promoted', () => {
  assert.equal(isPromotableCandidate(candidate({ extractionQuality: 'discarded-noisy' })), false);
});

test('noisy Uswitch mixed-provider rows are not promoted', () => {
  const output = buildActiveOnlineDealsOutput({ candidates: [candidate({
    sourceName: 'Uswitch',
    sourceType: 'comparison-site',
    extractionWarnings: ['Quality gate: comparison-site snippet mentions multiple providers (Sky, Virgin Media).'],
  })] }, '2026-06-03T00:00:00.000Z');

  assert.equal(output.summary.totalActiveDeals, 0);
});

test('annual April price rise above 6 is not promoted', () => {
  assert.equal(isPromotableCandidate(candidate({ annualAprilPriceRise: 20.99 })), false);
});

test('active-online-deals output shape includes summary and required fields', () => {
  const output = buildActiveOnlineDealsOutput({ candidates: [candidate()] }, '2026-06-03T00:00:00.000Z');

  assert.deepEqual(Object.keys(output.summary), [
    'generatedAt',
    'totalActiveDeals',
    'usableCalculatedCount',
    'sourceEffectiveOnlyCount',
    'providerCount',
    'sourceCount',
    'warningMessages',
  ]);
  ['activeDealId', 'candidateId', 'provider', 'packageName', 'sourceName', 'sourceType', 'sourceUrl', 'advertisedMonthlyPrice', 'effectiveMonthlyPrice', 'sourceEffectiveMonthlyPrice', 'contractLengthMonths', 'annualAprilPriceRise', 'setupFee', 'voucherValue', 'rewardCardValue', 'cashbackValue', 'billCreditValue', 'speedMbps', 'speedTier', 'extractionConfidence', 'extractionQuality', 'availabilityScope', 'publishStatus', 'requiresHumanReview', 'sourceSnippet', 'extractionWarnings', 'generatedAt'].forEach((field) => {
    assert.ok(Object.hasOwn(output.activeDeals[0], field), field);
  });
});

test('empty active deal output remains valid and includes warning message', () => {
  const output = buildActiveOnlineDealsOutput({ candidates: [] }, '2026-06-03T00:00:00.000Z');

  assert.equal(output.summary.totalActiveDeals, 0);
  assert.deepEqual(output.activeDeals, []);
  assert.match(output.summary.warningMessages.join(' '), /No usable active online deals were created/);
});
