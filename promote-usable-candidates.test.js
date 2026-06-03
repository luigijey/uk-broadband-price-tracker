const assert = require('node:assert/strict');
const test = require('node:test');

const { ACTIVE_COLUMNS, buildActiveOnlineDealsOutput, classifyProductType, isPromotableCandidate } = require('./promote-usable-candidates');
const { classifyProductModel } = require('./product-classification');

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

function byId(output, candidateId) {
  return output.activeDeals.find((deal) => deal.candidateId === candidateId);
}

function buildRequiredActiveFixture() {
  return [
    candidate({
      candidateId: 'bt-full-fibre-150-provider-page',
      provider: 'BT',
      sourceName: 'BT',
      sourceSnippet: 'BT Full Fibre 150 £30.99 a month. Price rises by £4 each April. 24 month contract.',
    }),
    candidate({
      candidateId: 'talktalk-full-fibre-150-provider-page',
      provider: 'TalkTalk',
      sourceName: 'TalkTalk',
      sourceSnippet: 'TalkTalk Full Fibre 150 £29 a month. Price rises by £4 each April. 24 month contract.',
    }),
    candidate({
      candidateId: 'uswitch-virgin-media-gig1-fibre-broadband',
      provider: 'Virgin Media',
      packageName: 'Gig1 Fibre Broadband',
      sourceName: 'Uswitch',
      sourceType: 'comparison-site',
      advertisedMonthlyPrice: 39.99,
      effectiveMonthlyPrice: 42.49,
      speedMbps: 1130,
      speedTier: '900 Mbps+',
      availabilityScope: 'comparison-page-not-postcode-checked',
      sourceSnippet: 'Virgin Media Gig1 Fibre Broadband 1130 Mbps £39.99 a month. Price rises each April by £4.00. No setup cost. 24 month contract.',
    }),
    candidate({
      candidateId: 'uswitch-virgin-media-broadband-132',
      provider: 'Virgin Media',
      packageName: 'Broadband 132',
      sourceName: 'Uswitch',
      sourceType: 'comparison-site',
      advertisedMonthlyPrice: 28.99,
      effectiveMonthlyPrice: 31.49,
      speedMbps: 132,
      availabilityScope: 'comparison-page-not-postcode-checked',
      sourceSnippet: 'Virgin Media Broadband 132 132 Mbps £28.99 a month. Price rises each April by £4.00. No setup cost. 24 month contract.',
    }),
    candidate({
      candidateId: 'uswitch-virgin-media-superfast-broadband',
      provider: 'Virgin Media',
      packageName: 'Superfast Broadband',
      sourceName: 'Uswitch',
      sourceType: 'comparison-site',
      advertisedMonthlyPrice: 23,
      effectiveMonthlyPrice: 25.5,
      speedMbps: 67,
      availabilityScope: 'comparison-page-not-postcode-checked',
      sourceSnippet: 'Sky Superfast Broadband 67 Mbps £23 a month. Virgin Media Superfast Broadband 67 Mbps £23 a month. Price rises each April by £4.00. 24 month contract.',
    }),
    candidate({
      candidateId: 'uswitch-plusnet-fibre-66',
      provider: 'Plusnet',
      packageName: 'Fibre 66',
      sourceName: 'Uswitch',
      sourceType: 'comparison-site',
      advertisedMonthlyPrice: 24.99,
      effectiveMonthlyPrice: 27.49,
      speedMbps: 66,
      availabilityScope: 'comparison-page-not-postcode-checked',
      sourceSnippet: 'Vodafone Fibre 67 Mbps £24 a month. Plusnet Fibre 66 66 Mbps £24.99 a month. Price rises each April by £4.00. 24 month contract.',
    }),
    candidate({
      candidateId: 'uswitch-virgin-media-virgin-media-516-mbps-broadband',
      provider: 'Virgin Media',
      packageName: 'Virgin Media M500 Sport HD + Cinema + Netflix',
      sourceName: 'Uswitch',
      sourceType: 'comparison-site',
      advertisedMonthlyPrice: 34.99,
      effectiveMonthlyPrice: 37.49,
      speedMbps: 516,
      speedTier: '500-900 Mbps',
      availabilityScope: 'comparison-page-not-postcode-checked',
      sourceSnippet: 'Virgin Media M500 Sport HD + Cinema + Netflix 516 Mbps £34.99 a month. Price rises each April by £4.00. 24 month contract.',
    }),
    candidate({
      candidateId: 'broadband-genie-bt-full-fibre-150',
      provider: 'BT',
      packageName: 'Full Fibre 150',
      sourceName: 'Broadband Genie',
      sourceType: 'comparison-site',
      effectiveMonthlyPrice: null,
      sourceEffectiveMonthlyPrice: 29.75,
      annualAprilPriceRise: null,
      extractionQuality: 'usable-source-effective-only',
      availabilityScope: 'comparison-page-not-postcode-checked',
      sourceSnippet: 'BT Full Fibre 150 monthly cost £30.99. Effective monthly cost £29.75.',
    }),
    candidate({
      candidateId: 'broadband-genie-plusnet-fibre-66',
      provider: 'Plusnet',
      packageName: 'Fibre 66',
      sourceName: 'Broadband Genie',
      sourceType: 'comparison-site',
      effectiveMonthlyPrice: null,
      sourceEffectiveMonthlyPrice: 25.25,
      annualAprilPriceRise: null,
      extractionQuality: 'usable-source-effective-only',
      availabilityScope: 'comparison-page-not-postcode-checked',
      sourceSnippet: 'Plusnet Fibre 66 monthly cost £24.99. Effective monthly cost £25.25.',
    }),
  ];
}

test('adds homepage trust metadata to provider-direct calculated rows', () => {
  const output = buildActiveOnlineDealsOutput({ candidates: [candidate()] }, '2026-06-03T00:00:00.000Z');

  assert.equal(output.summary.totalActiveDeals, 1);
  assert.equal(output.summary.homepageActiveDeals, 1);
  assert.equal(output.summary.providerDirectHomepageCount, 1);
  assert.equal(output.activeDeals[0].activeDealId, 'active-talktalk-full-fibre-150-provider-page');
  assert.equal(output.activeDeals[0].activeFeedTrustLevel, 'provider-direct-calculated');
  assert.equal(output.activeDeals[0].productType, 'broadband-only');
  assert.equal(output.activeDeals[0].showOnHomepage, true);
  assert.equal(output.activeDeals[0].publishStatus, 'active-review-only');
  assert.equal(output.activeDeals[0].requiresHumanReview, true);
  assert.equal(output.activeDeals[0].generatedAt, '2026-06-03T00:00:00.000Z');
});

test('classifies product types from package names and source snippets', () => {
  assert.equal(classifyProductType(candidate({ packageName: 'Full Fibre 150' })), 'broadband-only');
  assert.equal(classifyProductType(candidate({ packageName: 'Virgin Media M500 Sport HD + Cinema + Netflix' })), 'broadband-tv-bundle');
  assert.equal(classifyProductType(candidate({ packageName: 'Full Fibre 150 with SIM' })), 'broadband-mobile-bundle');
  assert.equal(classifyProductType(candidate({ packageName: 'Broadband and phone' })), 'broadband-phone-bundle');
  assert.equal(classifyProductType(candidate({ packageName: 'Starter plan', sourceSnippet: 'Starter plan £20 a month' })), 'unknown');
});

test('keeps source-effective-only candidates as hidden evidence records', () => {
  const output = buildActiveOnlineDealsOutput({ candidates: [candidate({
    candidateId: 'source-effective-only',
    sourceType: 'comparison-site',
    effectiveMonthlyPrice: null,
    sourceEffectiveMonthlyPrice: 28.75,
    annualAprilPriceRise: null,
    extractionQuality: 'usable-source-effective-only',
  })] }, '2026-06-03T00:00:00.000Z');

  assert.equal(output.summary.totalActiveDeals, 1);
  assert.equal(output.summary.homepageActiveDeals, 0);
  assert.equal(output.summary.hiddenReviewDeals, 1);
  assert.equal(output.summary.sourceEffectiveOnlyHiddenCount, 1);
  assert.equal(output.activeDeals[0].sourceEffectiveMonthlyPrice, 28.75);
  assert.equal(output.activeDeals[0].activeFeedTrustLevel, 'comparison-source-effective-only');
  assert.equal(output.activeDeals[0].showOnHomepage, false);
});

test('review-only missing-field candidates are not exported as active records', () => {
  assert.equal(isPromotableCandidate(candidate({ extractionQuality: 'review-only-missing-fields' })), false);
});

test('discarded noisy candidates are not exported as active records', () => {
  assert.equal(isPromotableCandidate(candidate({ extractionQuality: 'discarded-noisy' })), false);
});

test('required active feed examples are classified into homepage and hidden evidence records', () => {
  const output = buildActiveOnlineDealsOutput({ candidates: buildRequiredActiveFixture() }, '2026-06-03T00:00:00.000Z');

  assert.equal(byId(output, 'bt-full-fibre-150-provider-page').showOnHomepage, true);
  assert.equal(byId(output, 'talktalk-full-fibre-150-provider-page').showOnHomepage, true);
  assert.equal(byId(output, 'uswitch-virgin-media-gig1-fibre-broadband').showOnHomepage, true);
  assert.equal(byId(output, 'uswitch-virgin-media-broadband-132').showOnHomepage, true);
  assert.equal(byId(output, 'uswitch-virgin-media-superfast-broadband').showOnHomepage, false);
  assert.equal(byId(output, 'uswitch-virgin-media-virgin-media-516-mbps-broadband').productType, 'broadband-tv-bundle');
  assert.equal(byId(output, 'uswitch-virgin-media-virgin-media-516-mbps-broadband').showOnHomepage, false);
  assert.equal(byId(output, 'uswitch-plusnet-fibre-66').showOnHomepage, false);
  assert.equal(byId(output, 'broadband-genie-bt-full-fibre-150').showOnHomepage, false);
  assert.equal(byId(output, 'broadband-genie-plusnet-fibre-66').showOnHomepage, false);
  assert.equal(byId(output, 'uswitch-virgin-media-gig1-fibre-broadband').productType, 'broadband-only');
  assert.equal(byId(output, 'uswitch-virgin-media-gig1-fibre-broadband').connectionTechnology, 'fixed-line-broadband');
  assert.equal(byId(output, 'uswitch-virgin-media-gig1-fibre-broadband').serviceCategory, 'broadband-only');
  assert.equal(byId(output, 'uswitch-virgin-media-gig1-fibre-broadband').homepageCategory, 'Fixed broadband');
  assert.equal(byId(output, 'uswitch-virgin-media-broadband-132').homepageCategory, 'Fixed broadband');
  assert.equal(byId(output, 'bt-full-fibre-150-provider-page').productType, 'broadband-only');
  assert.equal(byId(output, 'talktalk-full-fibre-150-provider-page').productType, 'broadband-only');
  assert.equal(byId(output, 'uswitch-virgin-media-gig1-fibre-broadband').activeFeedTrustLevel, 'comparison-clean-calculated');
  assert.equal(byId(output, 'uswitch-virgin-media-broadband-132').activeFeedTrustLevel, 'comparison-clean-calculated');
  assert.equal(byId(output, 'uswitch-virgin-media-superfast-broadband').activeFeedTrustLevel, 'review-artifact-only');
  assert.equal(byId(output, 'uswitch-plusnet-fibre-66').activeFeedTrustLevel, 'review-artifact-only');
  assert.match(byId(output, 'uswitch-plusnet-fibre-66').extractionWarnings.join(' '), /hidden from homepage/);
});

test('summary counts homepage vs hidden rows correctly', () => {
  const output = buildActiveOnlineDealsOutput({ candidates: buildRequiredActiveFixture() }, '2026-06-03T00:00:00.000Z');

  assert.deepEqual(output.summary, {
    totalActiveDeals: 9,
    homepageActiveDeals: 4,
    broadbandOnlyHomepageCount: 4,
    hiddenReviewDeals: 5,
    providerDirectHomepageCount: 2,
    comparisonHomepageCount: 2,
    sourceEffectiveOnlyHiddenCount: 2,
    hiddenBundleCount: 1,
    hiddenUnknownProductTypeCount: 0,
    generatedAt: '2026-06-03T00:00:00.000Z',
    warningMessages: output.summary.warningMessages,
  });
  assert.ok(output.summary.warningMessages.some((warning) => /known noisy Uswitch/.test(warning)));
});

test('annual April price rise above 6 is hidden from homepage as review artifact', () => {
  const output = buildActiveOnlineDealsOutput({ candidates: [candidate({
    sourceType: 'comparison-site',
    sourceName: 'Uswitch',
    annualAprilPriceRise: 20.99,
    sourceSnippet: 'TalkTalk Full Fibre 150 £29 a month. Price rises by £20.99 each April. 24 month contract.',
  })] }, '2026-06-03T00:00:00.000Z');

  assert.equal(output.summary.totalActiveDeals, 1);
  assert.equal(output.activeDeals[0].activeFeedTrustLevel, 'review-artifact-only');
  assert.equal(output.activeDeals[0].showOnHomepage, false);
});

test('active-online-deals output shape includes summary and required fields', () => {
  const output = buildActiveOnlineDealsOutput({ candidates: [candidate()] }, '2026-06-03T00:00:00.000Z');

  assert.deepEqual(Object.keys(output.summary), [
    'totalActiveDeals',
    'homepageActiveDeals',
    'broadbandOnlyHomepageCount',
    'hiddenReviewDeals',
    'providerDirectHomepageCount',
    'comparisonHomepageCount',
    'sourceEffectiveOnlyHiddenCount',
    'hiddenBundleCount',
    'hiddenUnknownProductTypeCount',
    'generatedAt',
    'warningMessages',
  ]);
  ACTIVE_COLUMNS.forEach((field) => {
    assert.ok(Object.hasOwn(output.activeDeals[0], field), field);
  });
  assert.ok(Object.hasOwn(output.activeDeals[0], 'sourceSnippet'));
  assert.ok(Object.hasOwn(output.activeDeals[0], 'extractionWarnings'));
});

test('empty active deal output remains valid and includes warning message', () => {
  const output = buildActiveOnlineDealsOutput({ candidates: [] }, '2026-06-03T00:00:00.000Z');

  assert.equal(output.summary.totalActiveDeals, 0);
  assert.equal(output.summary.homepageActiveDeals, 0);
  assert.equal(output.summary.hiddenReviewDeals, 0);
  assert.deepEqual(output.activeDeals, []);
  assert.match(output.summary.warningMessages.join(' '), /No usable active online deals were created/);
});


test('sales phone CTA does not create broadband-with-landline', () => {
  const model = classifyProductModel(candidate({
    packageName: 'Full Fibre 150',
    sourceSnippet: 'Full Fibre 150 £29 a month. Get deal or call 0800 123456. Call us on the sales line for customer support.',
  }));

  assert.equal(model.serviceCategory, 'broadband-only');
  assert.equal(model.landlineStatus, 'not-included');
  assert.equal(model.homepageCategory, 'Fixed broadband');
});

test('explicit landline wording creates broadband-with-landline', () => {
  assert.equal(classifyProductModel(candidate({ sourceSnippet: 'Full Fibre 150 landline included £29 a month.' })).serviceCategory, 'broadband-with-landline');
  assert.equal(classifyProductModel(candidate({ sourceSnippet: 'Full Fibre 150 line rental included £29 a month.' })).serviceCategory, 'broadband-with-landline');
});

test('explicit calls wording creates broadband-with-landline-and-calls', () => {
  const callsIncluded = classifyProductModel(candidate({ sourceSnippet: 'Full Fibre 150 calls included £29 a month.' }));
  const payAsYouTalk = classifyProductModel(candidate({ sourceSnippet: 'Full Fibre 150 pay as you talk £29 a month.' }));

  assert.equal(callsIncluded.serviceCategory, 'broadband-with-landline-and-calls');
  assert.equal(callsIncluded.callsPackageStatus, 'included');
  assert.equal(payAsYouTalk.serviceCategory, 'broadband-with-landline-and-calls');
  assert.equal(payAsYouTalk.callsPackageStatus, 'pay-as-you-talk');
});

test('Vodafone 5G Broadband 50 becomes 5G home broadband category when clean', () => {
  const output = buildActiveOnlineDealsOutput({ candidates: [candidate({
    candidateId: 'vodafone-5g-broadband-50',
    provider: 'Vodafone',
    packageName: 'Vodafone 5G Broadband 50',
    sourceName: 'Vodafone',
    sourceType: 'provider-direct',
    speedMbps: 50,
    sourceSnippet: 'Vodafone 5G Broadband 50 50 Mbps £30 a month. Price rises by £4 each April. 24 month contract.',
  })] }, '2026-06-03T00:00:00.000Z');

  assert.equal(output.activeDeals[0].connectionTechnology, '5g-home-broadband');
  assert.equal(output.activeDeals[0].homepageCategory, '5G home broadband');
  assert.equal(output.activeDeals[0].showOnHomepage, true);
});

test('mixed 5G row with TV bundle text remains hidden', () => {
  const output = buildActiveOnlineDealsOutput({ candidates: [candidate({
    candidateId: 'vodafone-5g-broadband-tv',
    provider: 'Vodafone',
    packageName: 'Vodafone 5G Broadband 50 with Apple TV',
    sourceName: 'Vodafone',
    sourceType: 'provider-direct',
    speedMbps: 50,
    sourceSnippet: 'Vodafone 5G Broadband 50 with Apple TV channels 50 Mbps £30 a month. Price rises by £4 each April. 24 month contract.',
  })] }, '2026-06-03T00:00:00.000Z');

  assert.equal(output.activeDeals[0].connectionTechnology, '5g-home-broadband');
  assert.equal(output.activeDeals[0].homepageCategory, 'Bundles and review-only');
  assert.equal(output.activeDeals[0].showOnHomepage, false);
  assert.match(output.activeDeals[0].extractionWarnings.join(' '), /homepageCategory is Bundles and review-only/);
});

test('TV Sport Cinema and Netflix rows remain hidden', () => {
  ['TV', 'Sport', 'Cinema', 'Netflix'].forEach((term) => {
    const output = buildActiveOnlineDealsOutput({ candidates: [candidate({
      candidateId: `bundle-${term.toLowerCase()}`,
      packageName: `Full Fibre 150 with ${term}`,
      sourceSnippet: `Full Fibre 150 with ${term} £29 a month. Price rises by £4 each April. 24 month contract.`,
    })] }, '2026-06-03T00:00:00.000Z');
    assert.equal(output.activeDeals[0].homepageCategory, 'Bundles and review-only');
    assert.equal(output.activeDeals[0].showOnHomepage, false);
  });
});
