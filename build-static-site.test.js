// Tests for active online candidate rendering in the generated static site.

const assert = require('node:assert/strict');
const test = require('node:test');

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildActiveDealDetailHtml, buildCandidateSection, buildHtml, createActiveDealDetailPages } = require('./build-static-site');

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
  activeFeedTrustLevel: 'provider-direct-calculated',
  productType: 'broadband-only',
  connectionTechnology: 'fixed-line-broadband',
  serviceCategory: 'broadband-only',
  landlineStatus: 'not-included',
  callsPackageStatus: 'not-included',
  homepageCategory: 'Fixed broadband',
  showOnHomepage: true,
  publishStatus: 'active-review-only',
  availabilityScope: 'provider-landing-page-not-postcode-checked',
  requiresHumanReview: true,
  sourceSnippet: 'TalkTalk Full Fibre 150 evidence snippet',
  extractionWarnings: [],
};

test('candidate section renders empty state and status summary when no candidates exist', () => {
  const html = buildCandidateSection([], null, { homepageActiveDeals: 0, hiddenReviewDeals: 0 });

  assert.match(html, /Active online deal feed/);
  assert.match(html, /Active deals shown on homepage:<\/strong> 0/);
  assert.match(html, /Active deal data generated:<\/strong> Not available/);
  assert.match(html, /No usable active online deals were created in this run/);
  assert.doesNotMatch(html, /active-candidate-table/);
});

test('candidate section renders active deal table with review-only markings', () => {
  const html = buildCandidateSection([candidate], '2026-06-03T00:00:00.000Z', { homepageActiveDeals: 1, hiddenReviewDeals: 2 });

  assert.match(html, /active-candidate-table/);
  assert.match(html, /Full Fibre 150/);
  assert.match(html, /Advertised Monthly Price/);
  assert.match(html, /Effective Monthly Price/);
  assert.match(html, /Homepage Category/);
  assert.match(html, /Fixed broadband/);
  assert.match(html, /active-review-only/);
  assert.match(html, /Lower-confidence extracted rows are kept in review artifacts and are not shown in this main table\./);
  assert.match(html, /not postcode checked/);
  assert.match(html, /requires human review/);
  assert.match(html, /Active deals shown on homepage:<\/strong> 1/);
  assert.match(html, /Review\/evidence active records hidden from homepage:<\/strong> 2/);
  assert.match(html, /2026-06-03T00:00:00.000Z/);
});

test('full generated homepage includes active online candidate and Postcode Area V1 sections', () => {
  const html = buildHtml([], [], {
    activeDeals: [candidate],
    summary: { generatedAt: '2026-06-03T00:00:00.000Z', homepageActiveDeals: 1, hiddenReviewDeals: 0 },
  }, {
    summary: { postcodeAreasIncluded: 1, activeDealsIncluded: 1, rowsCreated: 1 },
    rows: [{
      postcodeArea: 'OX',
      regionName: 'South East England',
      country: 'England',
      activeDealId: candidate.activeDealId,
      provider: candidate.provider,
      packageName: candidate.packageName,
      sourceName: candidate.sourceName,
      sourceType: candidate.sourceType,
      advertisedMonthlyPrice: candidate.advertisedMonthlyPrice,
      effectiveMonthlyPrice: candidate.effectiveMonthlyPrice,
      speedMbps: candidate.speedMbps,
      speedTier: candidate.speedTier,
      contractLengthMonths: candidate.contractLengthMonths,
      annualAprilPriceRise: candidate.annualAprilPriceRise,
      productType: 'broadband-only',
      connectionTechnology: 'fixed-line-broadband',
      serviceCategory: 'broadband-only',
      landlineStatus: 'not-included',
      callsPackageStatus: 'not-included',
      homepageCategory: 'Fixed broadband',
      availabilityStatus: 'not-postcode-checked',
      availabilityConfidence: 'national-candidate-only',
      publishStatus: 'postcode-area-v1-review-only',
      warningMessage: 'This active deal is shown for postcode-area comparison only and has not been checked against this postcode area.',
    }],
  });

  assert.match(html, /<h2 id="active-candidates-heading">Active online deal feed<\/h2>/);
  assert.match(html, /<table id="active-candidate-table">/);
  assert.match(html, /Postcode Area V1 comparison/);
  assert.match(html, /id="postcode-area-v1-filter"/);
  assert.match(html, /These rows are not true postcode-checked availability results yet/);
  assert.match(html, /not-postcode-checked/);
  assert.match(html, /Homepage Category/);
  assert.match(html, /active-deals\/active-talktalk-full-fibre-150-provider-page\.html/);
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
  assert.match(html, /Connection technology/);
  assert.match(html, /Service category/);
  assert.match(html, /Landline status/);
  assert.match(html, /Calls package status/);
  assert.match(html, /Homepage category/);
  assert.match(html, /Homepage visible/);
  assert.match(html, /Hidden reason/);
  assert.match(html, /← Back to homepage/);
});


test('homepage active feed only renders homepage-visible rows', () => {
  const hiddenCandidate = {
    ...candidate,
    activeDealId: 'active-uswitch-plusnet-fibre-66',
    candidateId: 'uswitch-plusnet-fibre-66',
    provider: 'Plusnet',
    packageName: 'Fibre 66',
    activeFeedTrustLevel: 'review-artifact-only',
    showOnHomepage: false,
    extractionWarnings: ['Active feed trust gate: known noisy Uswitch comparison row is hidden from homepage.'],
  };

  const bundleCandidate = {
    ...candidate,
    activeDealId: 'active-uswitch-virgin-media-virgin-media-516-mbps-broadband',
    candidateId: 'uswitch-virgin-media-virgin-media-516-mbps-broadband',
    provider: 'Virgin Media',
    packageName: 'Virgin Media M500 Sport HD + Cinema + Netflix',
    activeFeedTrustLevel: 'comparison-clean-calculated',
    productType: 'broadband-tv-bundle',
    serviceCategory: 'broadband-tv-bundle',
    homepageCategory: 'Bundles and review-only',
    showOnHomepage: false,
    extractionWarnings: ['Active feed product gate: hidden from homepage because homepageCategory is Bundles and review-only.'],
  };

  const html = buildHtml([], [], {
    activeDeals: [candidate, hiddenCandidate, bundleCandidate],
    summary: { generatedAt: '2026-06-03T00:00:00.000Z', homepageActiveDeals: 1, hiddenReviewDeals: 1 },
  });

  assert.match(html, /Full Fibre 150/);
  assert.doesNotMatch(html, /Fibre 66/);
  assert.doesNotMatch(html, /Virgin Media M500 Sport HD \+ Cinema \+ Netflix/);
  assert.match(html, /Active deals shown on homepage:<\/strong> 1/);
  assert.match(html, /Review\/evidence active records hidden from homepage:<\/strong> 1/);
});

test('active deal detail pages are generated for hidden evidence rows', () => {
  const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'active-detail-pages-'));
  const hiddenCandidate = {
    ...candidate,
    activeDealId: 'active-uswitch-plusnet-fibre-66',
    candidateId: 'uswitch-plusnet-fibre-66',
    provider: 'Plusnet',
    packageName: 'Fibre 66',
    activeFeedTrustLevel: 'review-artifact-only',
    showOnHomepage: false,
    extractionWarnings: ['Active feed trust gate: known noisy Uswitch comparison row is hidden from homepage.'],
  };

  const createdFiles = createActiveDealDetailPages([hiddenCandidate], tempFolder);
  assert.equal(createdFiles.length, 1);
  assert.equal(path.basename(createdFiles[0]), 'active-uswitch-plusnet-fibre-66.html');
  assert.match(fs.readFileSync(createdFiles[0], 'utf8'), /Fibre 66/);
  assert.match(fs.readFileSync(createdFiles[0], 'utf8'), /Homepage visible/);
});
