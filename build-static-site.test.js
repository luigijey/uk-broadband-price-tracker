// Tests for active online candidate rendering in the generated static site.

const assert = require('node:assert/strict');
const test = require('node:test');

const { buildCandidateSection, buildHtml } = require('./build-static-site');

const candidate = {
  provider: 'TalkTalk',
  packageName: 'Full Fibre 150',
  sourceName: 'TalkTalk',
  speedMbps: 150,
  advertisedMonthlyPrice: 29,
  effectiveMonthlyPrice: 31.5,
  contractLengthMonths: 24,
  annualAprilPriceRise: 4,
  voucherValue: null,
  rewardCardValue: null,
  cashbackValue: null,
  billCreditValue: null,
  setupFee: 0,
  extractionConfidence: 'high',
  publishStatus: 'candidate-review-only',
  availabilityScope: 'provider-landing-page-not-postcode-checked',
  requiresHumanReview: true,
};

test('candidate section renders empty state and status summary when no candidates exist', () => {
  const html = buildCandidateSection([], null);

  assert.match(html, /Active online candidate deals/);
  assert.match(html, /Online candidates:<\/strong> 0/);
  assert.match(html, /Candidate data generated:<\/strong> Not available/);
  assert.match(html, /No online candidate deals have been extracted yet/);
  assert.doesNotMatch(html, /active-candidate-table/);
});

test('candidate section renders active candidate table with review-only markings', () => {
  const html = buildCandidateSection([candidate], '2026-06-03T00:00:00.000Z');

  assert.match(html, /active-candidate-table/);
  assert.match(html, /Full Fibre 150/);
  assert.match(html, /Advertised Monthly Price/);
  assert.match(html, /Effective Monthly Price/);
  assert.match(html, /candidate-review-only/);
  assert.match(html, /not postcode checked/);
  assert.match(html, /requires human review/);
  assert.match(html, /Online candidates:<\/strong> 1/);
  assert.match(html, /2026-06-03T00:00:00.000Z/);
});

test('full generated homepage includes active online candidate section', () => {
  const html = buildHtml([], [], {
    candidates: [candidate],
    generatedAt: '2026-06-03T00:00:00.000Z',
  });

  assert.match(html, /<h2 id="active-candidates-heading">Active online candidate deals<\/h2>/);
  assert.match(html, /<table id="active-candidate-table">/);
  assert.match(html, /Sample data prototype tables/);
});
