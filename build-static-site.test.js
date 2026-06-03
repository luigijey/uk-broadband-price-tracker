// Tests for active online candidate rendering in the generated static site.

const assert = require('node:assert/strict');
const test = require('node:test');

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildActiveCheapestBySpeedTierSection, buildActiveDealDetailHtml, buildCandidateSection, buildHtml, createActiveDealDetailPages, resolveActiveOnlineDealsPath } = require('./build-static-site');

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



test('generated homepage includes embedded Postcode Check V1 controls and messages', () => {
  const html = buildHtml([], [], { activeDeals: [], summary: { generatedAt: '2026-06-03T00:00:00.000Z' } }, { rows: [], summary: {} });

  assert.match(html, /Check broadband deals by postcode/);
  assert.match(html, /id="full-postcode-input"/);
  assert.match(html, />Check postcode<\/button>/);
  assert.match(html, /Please enter a valid UK postcode\./);
  assert.match(html, /Postcode area detected:/);
  assert.match(html, /These results are not provider-level availability checks yet\. They are active national candidate deals grouped by postcode area\./);
  assert.match(html, />Show all postcode areas<\/button>/);
  assert.match(html, /id="postcode-area-v1-filter"/);
});

test('homepage active feed includes details link to active deal page', () => {
  const html = buildCandidateSection([candidate], '2026-06-03T00:00:00.000Z');

  assert.match(html, /active-deals\/active-talktalk-full-fibre-150-provider-page\.html/);
  assert.match(html, /View evidence/);
});

test('active deal detail page is generated as a review evidence page', () => {
  const html = buildActiveDealDetailHtml(candidate);

  assert.match(html, /Active review evidence page/);
  assert.match(html, /does not confirm postcode-level availability/);
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

test('homepage active feed demo filters, sorting, count, and reset controls exist', () => {
  const html = buildCandidateSection([candidate], '2026-06-03T00:00:00.000Z');

  assert.match(html, /id="active-provider-filter"/);
  assert.match(html, /id="active-speed-tier-filter"/);
  assert.match(html, /id="active-homepage-category-filter"/);
  assert.match(html, /id="active-source-type-filter"/);
  assert.match(html, /id="active-sort"/);
  assert.match(html, /Effective monthly price low to high/);
  assert.match(html, /Advertised monthly price low to high/);
  assert.match(html, /Speed high to low/);
  assert.match(html, /id="active-result-count"/);
  assert.match(html, /Showing 1 active deals/);
  assert.match(html, /id="reset-active-filters"/);
});

test('postcode input includes example placeholder', () => {
  const html = buildHtml([], [], { activeDeals: [], summary: { generatedAt: '2026-06-03T00:00:00.000Z' } }, { rows: [], summary: {} });

  assert.match(html, /id="full-postcode-input"[^>]*placeholder="e\.g\. OX14 1AA"/);
});

test('active deal detail page includes setup fee status, caveat, and ordinary source link', () => {
  const html = buildActiveDealDetailHtml({
    ...candidate,
    setupFee: null,
    setupFeeStatus: 'unknown',
    effectivePriceCaveat: 'Effective monthly price excludes any unknown upfront/setup fee.',
  });

  assert.match(html, /Setup fee status/);
  assert.match(html, /Effective price caveat/);
  assert.match(html, /Effective monthly price excludes any unknown upfront\/setup fee\./);
  assert.match(html, /Open provider\/source page to check availability/);
  assert.match(html, /ordinary link only/);
});


test('active homepage summary cards render', () => {
  const html = buildCandidateSection([
    candidate,
    { ...candidate, activeDealId: 'active-uswitch-500', sourceType: 'comparison-site', speedMbps: 500, effectiveMonthlyPrice: 27, setupFeeStatus: 'unknown' },
  ], '2026-06-03T00:00:00.000Z');

  assert.match(html, /Homepage active deals/);
  assert.match(html, /Provider-direct deals/);
  assert.match(html, /Comparison-site deals/);
  assert.match(html, /Lowest effective monthly price/);
  assert.match(html, /Fastest speed/);
  assert.match(html, /Deals with unknown setup fee/);
});

test('cheapest-by-speed-tier homepage section renders setup fee status and evidence links', () => {
  const html = buildActiveCheapestBySpeedTierSection({
    rows: [{
      speedTier: '900 Mbps+',
      provider: 'Vodafone',
      packageName: 'Full Fibre 910',
      sourceName: 'Vodafone',
      advertisedMonthlyPrice: 35,
      effectiveMonthlyPrice: 37.5,
      speedMbps: 910,
      setupFeeStatus: 'unknown',
      activeDealId: 'active-vodafone-full-fibre-910',
    }],
  });

  assert.match(html, /Cheapest active deals by speed tier/);
  assert.match(html, /These are active review deals only and are not provider-level postcode availability checks\./);
  assert.match(html, /<table id="active-cheapest-speed-tier-table">/);
  assert.match(html, /Setup Fee Status/);
  assert.match(html, /unknown/);
  assert.match(html, /active-deals\/active-vodafone-full-fibre-910\.html/);
});

test('full generated homepage includes cheapest active deals by speed tier above active feed', () => {
  const html = buildHtml([], [], { activeDeals: [candidate], summary: { generatedAt: '2026-06-03T00:00:00.000Z' } }, { rows: [], summary: {} }, {
    rows: [{
      speedTier: candidate.speedTier,
      provider: candidate.provider,
      packageName: candidate.packageName,
      sourceName: candidate.sourceName,
      advertisedMonthlyPrice: candidate.advertisedMonthlyPrice,
      effectiveMonthlyPrice: candidate.effectiveMonthlyPrice,
      speedMbps: candidate.speedMbps,
      setupFeeStatus: 'known-zero',
      activeDealId: candidate.activeDealId,
    }],
  });

  assert.ok(html.indexOf('Cheapest active deals by speed tier') < html.indexOf('Active online deal feed'));
});

test('effectivePriceCaveat appears as visible warning text in active feed row when present', () => {
  const html = buildCandidateSection([{ ...candidate, setupFeeStatus: 'unknown', effectivePriceCaveat: 'Effective monthly price excludes any unknown upfront/setup fee.' }]);

  assert.match(html, /<th>Caveat<\/th>/);
  assert.match(html, /⚠ Caveat: Effective monthly price excludes any unknown upfront\/setup fee\./);
});

test('postcode check result message includes postcode area, region, and active row count', () => {
  const html = buildHtml([], [], { activeDeals: [], summary: { generatedAt: '2026-06-03T00:00:00.000Z' } }, { rows: [], summary: {} });

  assert.match(html, /countPostcodeAreaV1Rows\(postcodeArea\)/);
  assert.match(html, /Postcode area detected: ' \+ postcodeArea \+ ' — ' \+ match\.regionName/);
  assert.match(html, /Showing ' \+ activeCandidateRowCount \+ ' active national candidate deals for this postcode area/);
});


test('fallback caveat text renders on homepage active feed', () => {
  const html = buildCandidateSection([{ ...candidate, dataFreshnessStatus: 'last-known-good-fallback' }], '2026-06-03T00:00:00.000Z');

  assert.match(html, /Data Freshness/);
  assert.match(html, /Last-known-good fallback/);
  assert.match(html, /Last-known-good fallback: provider source was unavailable in the latest run\./);
  assert.match(html, /If a provider cannot be fetched in the latest run/);
});

test('active detail page labels fallback rows', () => {
  const html = buildActiveDealDetailHtml({
    ...candidate,
    dataFreshnessStatus: 'last-known-good-fallback',
    fallbackReason: 'Provider source was unavailable in the latest run, so this row uses the last-known-good extracted review data.',
  });

  assert.match(html, /Data freshness/);
  assert.match(html, /Last-known-good fallback/);
  assert.match(html, /Fallback reason/);
  assert.match(html, /provider source was unavailable in the latest run/i);
});

test('active detail pages are generated for fallback rows', () => {
  const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'active-detail-fallback-'));
  const created = createActiveDealDetailPages([{ ...candidate, activeDealId: 'active-fallback-talktalk-full-fibre-150', dataFreshnessStatus: 'last-known-good-fallback' }], tempFolder);

  assert.equal(created.length, 1);
  assert.ok(fs.existsSync(path.join(tempFolder, 'active-fallback-talktalk-full-fibre-150.html')));
});

test('homepage active feed prefers active-online-deals-with-fallbacks.json when present', () => {
  const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'active-feed-prefer-'));
  const freshPath = path.join(tempFolder, 'active-online-deals.json');
  const fallbackPath = path.join(tempFolder, 'active-online-deals-with-fallbacks.json');
  fs.writeFileSync(freshPath, JSON.stringify({ activeDeals: [] }));
  fs.writeFileSync(fallbackPath, JSON.stringify({ activeDeals: [{ ...candidate, dataFreshnessStatus: 'last-known-good-fallback' }] }));

  assert.equal(resolveActiveOnlineDealsPath({ activeOnlineDeals: freshPath, activeOnlineDealsWithFallbacks: fallbackPath }), fallbackPath);
});
