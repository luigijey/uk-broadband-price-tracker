// Tests for active online candidate rendering in the generated static site.

const assert = require('node:assert/strict');
const test = require('node:test');

const { buildActiveDealDetailHtml, buildCandidateSection, buildHtml } = require('./build-static-site');

const candidate = {
  activeDealId: 'active-talktalk-full-fibre-150-provider-page',
  candidateId: 'talktalk-full-fibre-150-provider-page',
  provider: 'TalkTalk',
  packageName: 'Full Fibre 150',
  sourceName: 'TalkTalk',
  sourceType: 'provider-direct',
  sourceUrl: 'https://www.talktalk.co.uk/broadband',
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
  extractionQuality: 'usable-calculated',
  publishStatus: 'active-review-only',
  availabilityScope: 'provider-landing-page-not-postcode-checked',
  requiresHumanReview: true,
  sourceSnippet: 'TalkTalk Full Fibre 150 evidence snippet',
  extractionWarnings: [],
};

test('candidate section renders empty state and status summary when no candidates exist', () => {
  const html = buildCandidateSection([], null);

  assert.match(html, /Active online deal feed/);
  assert.match(html, /Active online deals:<\/strong> 0/);
  assert.match(html, /Active deal data generated:<\/strong> Not available/);
  assert.match(html, /No usable active online deals were created in this run/);
  assert.doesNotMatch(html, /active-candidate-table/);
});

test('candidate section renders active deal table with review-only markings', () => {
  const html = buildCandidateSection([candidate], '2026-06-03T00:00:00.000Z');

  assert.match(html, /active-candidate-table/);
  assert.match(html, /Full Fibre 150/);
  assert.match(html, /Advertised Monthly Price/);
  assert.match(html, /Effective Monthly Price/);
  assert.match(html, /active-review-only/);
  assert.match(html, /Lower-confidence extracted rows are kept in review artifacts and are not shown in this main table\./);
  assert.match(html, /not postcode checked/);
  assert.match(html, /requires human review/);
  assert.match(html, /Active online deals:<\/strong> 1/);
  assert.match(html, /2026-06-03T00:00:00.000Z/);
});

test('full generated homepage includes active online candidate section', () => {
  const html = buildHtml([], [], {
    activeDeals: [candidate],
    summary: { generatedAt: '2026-06-03T00:00:00.000Z' },
  });

  assert.match(html, /<h2 id="active-candidates-heading">Active online deal feed<\/h2>/);
  assert.match(html, /<table id="active-candidate-table">/);
  assert.match(html, /Sample data prototype tables/);
});


test('homepage active feed includes details link to active deal page', () => {
  const html = buildCandidateSection([candidate], '2026-06-03T00:00:00.000Z');

  assert.match(html, /active-deals\/active-talktalk-full-fibre-150-provider-page\.html/);
  assert.match(html, /View evidence/);
});

test('active deal detail page is generated as a review evidence page', () => {
  const html = buildActiveDealDetailHtml(candidate);

  assert.match(html, /Active review evidence page/);
  assert.match(html, /not postcode checked and requires human review/);
  assert.match(html, /TalkTalk Full Fibre 150 evidence snippet/);
  assert.match(html, /← Back to homepage/);
});
