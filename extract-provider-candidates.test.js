// Tests for the multi-provider online candidate extraction prototype.

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildProductCategorySummary,
  buildProviderDirectExpansionSummary,
  buildProviderCandidates,
  createCandidateId,
  extractAnnualRiseFromText,
  extractProviderCandidateFromSnippet,
  splitSnippetIntoCandidateBlocks,
} = require('./extract-provider-candidates');
const { deriveAnnualAprilPriceRise, parsePoundPrice } = require('./extract-talktalk-deals');

const extractedAt = '2026-06-03T00:00:00.000Z';

const talkTalkSource = {
  sourceId: 'talktalk',
  name: 'TalkTalk',
  sourceType: 'provider-direct',
  candidateBroadbandUrl: 'https://www.talktalk.co.uk/broadband',
};

const vodafoneSource = {
  sourceId: 'vodafone',
  name: 'Vodafone',
  sourceType: 'provider-direct',
  candidateBroadbandUrl: 'https://www.vodafone.co.uk/broadband',
};

const btSource = {
  sourceId: 'bt',
  name: 'BT',
  sourceType: 'provider-direct',
  candidateBroadbandUrl: 'https://www.bt.com/broadband',
};

const plusnetSource = {
  sourceId: 'plusnet',
  name: 'Plusnet',
  sourceType: 'provider-direct',
  candidateBroadbandUrl: 'https://www.plus.net/broadband',
};

const uswitchSource = {
  sourceId: 'uswitch',
  name: 'Uswitch',
  sourceType: 'comparison-site',
  candidateBroadbandUrl: 'https://www.uswitch.com/broadband',
};

const broadbandGenieSource = {
  sourceId: 'broadband-genie',
  name: 'Broadband Genie',
  sourceType: 'comparison-site',
  candidateBroadbandUrl: 'https://www.broadbandgenie.co.uk/broadband',
};


test('parses flexible pound price formats', () => {
  assert.equal(parsePoundPrice('£22.99'), 22.99);
  assert.equal(parsePoundPrice('£ 22 .99'), 22.99);
  assert.equal(parsePoundPrice('£22'), 22);
  assert.equal(parsePoundPrice('£4.00'), 4);
  assert.equal(parsePoundPrice('£1,500'), 1500);
});

test('detects contract length variants', () => {
  [
    '24 month contract',
    '24-month contract',
    'on a 24-month plan',
    'Currently £22.99 a month for 24 months',
    '24 month minimum term',
  ].forEach((text) => {
    const candidate = extractProviderCandidateFromSnippet({ surroundingText: `TalkTalk Full Fibre 150 £29 a month then £33 from April 2027 and £37 from April 2028. No setup fee. ${text}` }, talkTalkSource, extractedAt);
    assert.equal(candidate.contractLengthMonths, 24);
  });
});

test('extracts setup fee variants and avoids unrelated router prices', () => {
  const setupCases = [
    ['no setup cost', 0],
    ['no setup fee', 0],
    ['No upfront cost', 0],
    ['£0 set-up cost', 0],
    ['set-up fee of £9.95', 9.95],
  ];

  setupCases.forEach(([setupText, expectedSetupFee]) => {
    const candidate = extractProviderCandidateFromSnippet({ surroundingText: `Vodafone Full Fibre 910 broadband 910 Mbps £25.50 a month on a 24-month plan. Increases to £29 on 1 April 2027 and £32.50 on 1 April 2028. ${setupText}. Save £44 today.` }, vodafoneSource, extractedAt);
    assert.equal(candidate.setupFee, expectedSetupFee);
    assert.equal(candidate.routerFee, null);
  });
});

test('creates readable candidate IDs for provider and comparison sources', () => {
  assert.equal(createCandidateId({
    sourceId: 'talktalk',
    provider: 'TalkTalk',
    packageName: 'Full Fibre 150',
    sourceType: 'provider-direct',
  }), 'talktalk-full-fibre-150-provider-page');

  assert.equal(createCandidateId({
    sourceId: 'broadband-genie',
    provider: 'BT',
    packageName: 'Full Fibre 900',
    sourceType: 'comparison-site',
  }), 'broadband-genie-bt-full-fibre-900');
});

test('derives annual price rise from a £24 to £28 to £32 sequence', () => {
  const result = deriveAnnualAprilPriceRise(24, 28, 32);

  assert.equal(result.annualAprilPriceRise, 4);
  assert.equal(result.warning, null);
});

test('extracts Vodafone-style annual rise wording from £3.50 each April', () => {
  assert.equal(extractAnnualRiseFromText('Monthly price increases by £3.50 each April during your contract.'), 3.5);
});


test('extracts requested annual rise wording and sequences', () => {
  assert.equal(extractAnnualRiseFromText('price rises each April in contract by £4.00'), 4);
  assert.equal(extractAnnualRiseFromText('monthly plan increases by £3.50'), 3.5);
  assert.equal(extractAnnualRiseFromText('Price increases annually on 31st March by £4'), 4);

  let candidate = extractProviderCandidateFromSnippet({ surroundingText: 'TalkTalk Full Fibre 150 £24 a month increasing to £28 from April 2027 then to £32 in April 2028. No setup fee. 24 month contract.' }, talkTalkSource, extractedAt);
  assert.equal(candidate.annualAprilPriceRise, 4);

  candidate = extractProviderCandidateFromSnippet({ surroundingText: 'Vodafone Full Fibre 910 broadband 910 Mbps from £25.50 a month, on a 24-month plan. Increases to £29 on 1 April 2027 and £32.50 on 1 April 2028.' }, vodafoneSource, extractedAt);
  assert.equal(candidate.annualAprilPriceRise, 3.5);
});

test('extracts BT Full Fibre 150 provider candidate with dated April prices', () => {
  const candidate = extractProviderCandidateFromSnippet({ surroundingText: 'Get Full Fibre 150 for £30.99 a month Monthly price increases to £34.99 on 31 March 2027 and to £38.99 on 31 March 2028. No upfront cost. 24 month contract.' }, btSource, extractedAt);

  assert.equal(candidate.provider, 'BT');
  assert.equal(candidate.packageName, 'Full Fibre 150');
  assert.equal(candidate.advertisedMonthlyPrice, 30.99);
  assert.equal(candidate.firstAprilPrice, 34.99);
  assert.equal(candidate.secondAprilPrice, 38.99);
  assert.equal(candidate.annualAprilPriceRise, 4);
  assert.equal(candidate.setupFee, 0);
  assert.equal(candidate.contractLengthMonths, 24);
  assert.equal(candidate.speedMbps, 150);
  assert.equal(candidate.effectiveMonthlyPrice, 33.66);
  assert.equal(candidate.extractionQuality, 'usable-calculated');
});

test('extracts Vodafone dated increases without unrelated router fee', () => {
  const candidate = extractProviderCandidateFromSnippet({ surroundingText: 'Vodafone Full Fibre 910 broadband 910 Mbps Full fibre broadband – from £25.50 a month, on a 24-month plan. Increases to £29 on 1 April 2027 and £32.50 on 1 April 2028. Save £44 today. Home broadband annual price increase is £3.50.' }, vodafoneSource, extractedAt);

  assert.equal(candidate.advertisedMonthlyPrice, 25.5);
  assert.equal(candidate.firstAprilPrice, 29);
  assert.equal(candidate.secondAprilPrice, 32.5);
  assert.equal(candidate.annualAprilPriceRise, 3.5);
  assert.equal(candidate.contractLengthMonths, 24);
  assert.equal(candidate.setupFee, null);
  assert.equal(candidate.speedMbps, 910);
  assert.equal(candidate.routerFee, null);
});

test('extracts TalkTalk Full Fibre 500 advertised price before April prices', () => {
  const candidate = extractProviderCandidateFromSnippet({ surroundingText: 'Full Fibre 500 No setup fee. Latest offer £30.00 a month, Increasing to £34.00 from April 2027 then to £38.00 in April 2028, on a 24 month contract.' }, talkTalkSource, extractedAt);

  assert.equal(candidate.packageName, 'Full Fibre 500');
  assert.equal(candidate.advertisedMonthlyPrice, 30);
  assert.equal(candidate.firstAprilPrice, 34);
  assert.equal(candidate.secondAprilPrice, 38);
  assert.equal(candidate.effectiveMonthlyPrice, 32.67);
});

test('extracts conservative Plusnet landing-page candidate when contract text is nearby', () => {
  const candidate = extractProviderCandidateFromSnippet({ surroundingText: 'Plusnet Full Fibre deals from £22.99 a month £26.99 from 31 March 2027 £30.99 from 31 March 2028 £100 Plusnet Reward Card. annual plan price increase by £4. 24 month contract.' }, plusnetSource, extractedAt);

  assert.equal(candidate.packageName, 'Full Fibre deals');
  assert.equal(candidate.advertisedMonthlyPrice, 22.99);
  assert.equal(candidate.firstAprilPrice, 26.99);
  assert.equal(candidate.secondAprilPrice, 30.99);
  assert.equal(candidate.annualAprilPriceRise, 4);
  assert.equal(candidate.rewardCardValue, 100);
  assert.equal(candidate.contractLengthMonths, 24);
  assert.equal(candidate.effectiveMonthlyPrice, null);
  assert.equal(candidate.extractionQuality, 'review-only-missing-fields');
});


test('Sky standard prices are review-first and not promoted as advertised new-customer prices', () => {
  const skySource = { sourceId: 'sky', name: 'Sky', sourceType: 'provider-direct', candidateBroadbandUrl: 'https://www.sky.com/broadband' };
  const candidate = extractProviderCandidateFromSnippet({ surroundingText: 'Sky Superfast Broadband 67 Mbps standard price £43 a month after contract. Price rises by £4 each April. No setup fee. 24 month contract.' }, skySource, extractedAt);

  assert.equal(candidate.provider, 'Sky');
  assert.equal(candidate.extractionQuality, 'review-only-quality-gate');
  assert.match(candidate.extractionWarnings.join(' '), /standard or out-of-contract price/);
});

test('Plusnet reward card and price-rise values are preserved while missing speed remains review-only', () => {
  const candidate = extractProviderCandidateFromSnippet({ surroundingText: 'Plusnet Full Fibre deals from £22.99 a month £26.99 from 31 March 2027 £30.99 from 31 March 2028 £100 Plusnet Reward Card. annual plan price increase by £4. 24 month contract.' }, plusnetSource, extractedAt);

  assert.equal(candidate.rewardCardValue, 100);
  assert.equal(candidate.advertisedMonthlyPrice, 22.99);
  assert.equal(candidate.firstAprilPrice, 26.99);
  assert.equal(candidate.secondAprilPrice, 30.99);
  assert.equal(candidate.annualAprilPriceRise, 4);
  assert.equal(candidate.speedMbps, null);
  assert.equal(candidate.extractionQuality, 'review-only-missing-fields');
});

test('splits Uswitch snippets into provider-safe blocks and extracts representative deals', () => {
  const mixed = { surroundingText: 'Virgin Media Gig1 Fibre broadband 1000 Mbps £ 22 .99 a month price rises each April in contract by £4.00 no setup cost 24 month contract Sky Superfast Broadband 67 Mbps £ 23 .00 a month £50 voucher early switch credit up to £200 no setup cost 24 month contract price rises each April in contract by £4.00 Vodafone 5G Broadband 50 50 Mbps £ 16 .00 a month monthly plan increases by £3.50 £55 voucher up to £200 credit no setup cost 24 month contract' };
  const blocks = splitSnippetIntoCandidateBlocks(mixed, uswitchSource);
  assert.equal(blocks.length, 3);

  const candidates = blocks.map((block) => extractProviderCandidateFromSnippet(block, uswitchSource, extractedAt));
  const [virgin, sky, vodafone] = candidates;

  assert.equal(virgin.provider, 'Virgin Media');
  assert.equal(virgin.packageName, 'Gig1 Fibre Broadband');
  assert.equal(virgin.speedMbps, 1000);
  assert.equal(virgin.advertisedMonthlyPrice, 22.99);
  assert.equal(virgin.annualAprilPriceRise, 4);
  assert.equal(virgin.setupFee, 0);
  assert.equal(virgin.contractLengthMonths, 24);

  assert.equal(sky.provider, 'Sky');
  assert.equal(sky.packageName, 'Superfast Broadband');
  assert.equal(sky.speedMbps, 67);
  assert.equal(sky.advertisedMonthlyPrice, 23);
  assert.equal(sky.voucherValue, 50);
  assert.equal(sky.billCreditValue, 200);
  assert.equal(sky.setupFee, 0);
  assert.equal(sky.contractLengthMonths, 24);

  assert.equal(vodafone.provider, 'Vodafone');
  assert.equal(vodafone.packageName, '5G Broadband 50');
  assert.equal(vodafone.speedMbps, 50);
  assert.equal(vodafone.advertisedMonthlyPrice, 16);
  assert.equal(vodafone.annualAprilPriceRise, 3.5);
  assert.equal(vodafone.voucherValue, 55);
  assert.equal(vodafone.billCreditValue, 200);
  assert.equal(vodafone.setupFee, 0);
  assert.equal(vodafone.contractLengthMonths, 24);
});

test('extracts Broadband Genie structured fields including source effective monthly cost', () => {
  const bt = extractProviderCandidateFromSnippet({ surroundingText: 'BT Full Fibre 900 900Mbps Monthly Cost £45 Set-up Cost £0 Price increases annually on 31st March by £4 Reward Card £150 Rewards Saving £150 Effective Monthly Cost £39.25 24 month contract' }, broadbandGenieSource, extractedAt);
  const ee = extractProviderCandidateFromSnippet({ surroundingText: 'EE Full Fibre 900 900Mbps Monthly Cost £44 Set-up Cost £0 Price increases annually on 31st March by £4 Reward Card £150 Rewards Saving £150 Effective Monthly Cost £38.25 24 month contract' }, broadbandGenieSource, extractedAt);

  assert.equal(bt.provider, 'BT');
  assert.equal(bt.rewardCardValue, 150);
  assert.equal(bt.setupFee, 0);
  assert.equal(bt.contractLengthMonths, 24);
  assert.equal(bt.sourceEffectiveMonthlyPrice, 39.25);
  assert.equal(bt.effectiveMonthlyPrice, 41.42);

  assert.equal(ee.provider, 'EE');
  assert.equal(ee.rewardCardValue, 150);
  assert.equal(ee.setupFee, 0);
  assert.equal(ee.contractLengthMonths, 24);
  assert.equal(ee.sourceEffectiveMonthlyPrice, 38.25);
  assert.equal(ee.effectiveMonthlyPrice, 40.42);
});

test('extracts a TalkTalk-style package candidate', () => {
  const candidate = extractProviderCandidateFromSnippet({
    surroundingText: 'Full Fibre 150 £29 a month, then £33 from April 2027 and £37 from April 2028. 24 month contract. No setup fee.',
  }, talkTalkSource, extractedAt);

  assert.equal(candidate.candidateId, 'talktalk-full-fibre-150-provider-page');
  assert.equal(candidate.provider, 'TalkTalk');
  assert.equal(candidate.packageName, 'Full Fibre 150');
  assert.equal(candidate.advertisedMonthlyPrice, 29);
  assert.equal(candidate.annualAprilPriceRise, 4);
  assert.equal(candidate.speedMbps, 150);
  assert.equal(candidate.speedTier, '100-300 Mbps');
  assert.equal(candidate.publishStatus, 'candidate-review-only');
  assert.equal(candidate.availabilityScope, 'provider-landing-page-not-postcode-checked');
  assert.equal(candidate.requiresHumanReview, true);
});

test('extracts a Broadband Genie-style deal and includes rewards in pricing calculation', () => {
  const candidate = extractProviderCandidateFromSnippet({
    surroundingText: 'BT Full Fibre 900 broadband 900Mbps £45 per month, then £49 from April 2027 and £53 from April 2028. 24 month contract. £100 reward card. No setup fee.',
  }, broadbandGenieSource, extractedAt);

  assert.equal(candidate.candidateId, 'broadband-genie-bt-full-fibre-900');
  assert.equal(candidate.provider, 'BT');
  assert.equal(candidate.packageName, 'Full Fibre 900');
  assert.equal(candidate.rewardCardValue, 100);
  assert.equal(candidate.totalRewardsAndDiscounts, 100);
  assert.equal(candidate.totalContractCostAfterRewards, 1044);
  assert.equal(candidate.effectiveMonthlyPrice, 43.5);
  assert.equal(candidate.availabilityScope, 'comparison-page-not-postcode-checked');
});

test('missing calculation fields produce warnings instead of crashing', () => {
  const candidate = extractProviderCandidateFromSnippet({
    surroundingText: 'Vodafone Full Fibre 910 broadband 910Mbps £40 per month. 24 month contract.',
  }, vodafoneSource, extractedAt);

  assert.equal(candidate.provider, 'Vodafone');
  assert.equal(candidate.packageName, 'Full Fibre 910');
  assert.equal(candidate.effectiveMonthlyPrice, null);
  assert.equal(candidate.extractionConfidence, 'low');
  assert.ok(candidate.extractionWarnings.some((warning) => warning.includes('annual April price rise')));
  assert.ok(candidate.extractionWarnings.some((warning) => warning.includes('Effective monthly price was not calculated')));
});

test('provider-deal-candidates output shape includes candidates, sourceSummary, warnings, and generatedAt', () => {
  const report = [
    {
      ...talkTalkSource,
      snippets: [
        { surroundingText: 'Fibre 65 £24 a month, then £28 from April 2027 and £32 from April 2028. 24 month contract. No setup fee.' },
      ],
      warningMessages: [],
    },
  ];

  const result = buildProviderCandidates(report, extractedAt);
  const output = {
    candidates: result.candidates,
    sourceSummary: result.sourceSummary,
    warningMessages: result.warningMessages,
    generatedAt: extractedAt,
  };

  assert.ok(Array.isArray(output.candidates));
  assert.ok(Array.isArray(output.sourceSummary));
  assert.ok(Array.isArray(output.warningMessages));
  assert.equal(output.generatedAt, extractedAt);
  assert.equal(output.candidates[0].candidateId, 'talktalk-fibre-65-provider-page');
  assert.equal(output.candidates[0].publishStatus, 'candidate-review-only');
  assert.equal(output.candidates[0].availabilityScope, 'provider-landing-page-not-postcode-checked');
});

test('Uswitch block with one clean provider is usable', () => {
  const candidate = extractProviderCandidateFromSnippet({ surroundingText: 'Uswitch exclusive TalkTalk Full Fibre 150 broadband 150 Mbps £29 a month on a 24 month contract. Monthly price increases by £4 each April. No setup fee.' }, uswitchSource, extractedAt);

  assert.equal(candidate.provider, 'TalkTalk');
  assert.equal(candidate.annualAprilPriceRise, 4);
  assert.equal(candidate.extractionQuality, 'usable-calculated');
});

test('Uswitch mixed Sky and Virgin Media block is not usable', () => {
  const candidate = extractProviderCandidateFromSnippet({ surroundingText: 'Sky Essential TV from £15. Virgin Media Superfast Broadband 132 Mbps £26.99 a month on a 18 month contract. Virgin Media M500 also available. Monthly price increases by £4 each April. No setup fee.' }, uswitchSource, extractedAt);

  assert.notEqual(candidate.extractionQuality, 'usable-calculated');
  assert.match(candidate.extractionWarnings.join(' '), /multiple providers/);
});

test('annualAprilPriceRise 20.99 is not usable', () => {
  const candidate = extractProviderCandidateFromSnippet({ surroundingText: 'TalkTalk Full Fibre 150 broadband 150 Mbps £29 a month on a 24 month contract. Monthly price increases by £20.99 each April. No setup fee.' }, talkTalkSource, extractedAt);

  assert.notEqual(candidate.extractionQuality, 'usable-calculated');
  assert.match(candidate.extractionWarnings.join(' '), /above the £6\.00 usable limit/);
});

test('annualAprilPriceRise 4 is usable', () => {
  const candidate = extractProviderCandidateFromSnippet({ surroundingText: 'TalkTalk Full Fibre 150 broadband 150 Mbps £29 a month on a 24 month contract. Monthly price increases by £4 each April. No setup fee.' }, talkTalkSource, extractedAt);

  assert.equal(candidate.annualAprilPriceRise, 4);
  assert.equal(candidate.extractionQuality, 'usable-calculated');
});

test('annualAprilPriceRise 3.50 is usable', () => {
  const candidate = extractProviderCandidateFromSnippet({ surroundingText: 'Vodafone Full Fibre 910 broadband 910 Mbps £25.50 a month on a 24 month contract. Monthly price increases by £3.50 each April. No setup fee.' }, vodafoneSource, extractedAt);

  assert.equal(candidate.annualAprilPriceRise, 3.5);
  assert.equal(candidate.extractionQuality, 'usable-calculated');
});


test('provider-direct expansion summary includes product category counts', () => {
  const candidates = [
    { packageName: 'Full Fibre 150', sourceSnippet: 'Full Fibre 150 £29 a month.' },
    { packageName: 'Full Fibre 150', sourceSnippet: 'Full Fibre 150 landline included £31 a month.' },
    { packageName: 'Full Fibre 150', sourceSnippet: 'Full Fibre 150 calls included £33 a month.' },
    { packageName: 'Vodafone 5G Broadband 50', sourceSnippet: 'Vodafone 5G Broadband 50 £30 a month.' },
    { packageName: 'Full Fibre 150 with Netflix', sourceSnippet: 'Full Fibre 150 with Netflix £39 a month.' },
    { packageName: 'Full Fibre 150 with SIM', sourceSnippet: 'Full Fibre 150 with SIM £35 a month.' },
    { packageName: 'Starter plan', sourceSnippet: 'Starter plan £20 a month.' },
  ];

  assert.deepEqual(buildProductCategorySummary(candidates), {
    fixedBroadbandCandidates: 1,
    landlineCandidates: 2,
    callsPackageCandidates: 1,
    fiveGHomeBroadbandCandidates: 1,
    tvBundleCandidates: 1,
    mobileBundleCandidates: 1,
    unknownProductCandidates: 1,
  });

  const expansionSummary = buildProviderDirectExpansionSummary(candidates, extractedAt);
  assert.equal(expansionSummary.generatedAt, extractedAt);
  assert.equal(expansionSummary.totalCandidates, 7);
  assert.equal(expansionSummary.fixedBroadbandCandidates, 1);
  assert.equal(expansionSummary.landlineCandidates, 2);
  assert.equal(expansionSummary.callsPackageCandidates, 1);
  assert.equal(expansionSummary.fiveGHomeBroadbandCandidates, 1);
  assert.equal(expansionSummary.tvBundleCandidates, 1);
  assert.equal(expansionSummary.mobileBundleCandidates, 1);
  assert.equal(expansionSummary.unknownProductCandidates, 1);
  assert.equal(expansionSummary.providers.length, 5);
  expansionSummary.providers.forEach((row) => {
    ['provider', 'snippetsAvailable', 'candidatesCreated', 'usableCandidates', 'reviewOnlyCandidates', 'fixedBroadbandCandidates', 'landlineCandidates', 'callsPackageCandidates', 'fiveGHomeBroadbandCandidates', 'tvBundleCandidates', 'mobileBundleCandidates', 'unknownProductCandidates', 'reasonNotUsable'].forEach((field) => {
      assert.ok(Object.hasOwn(row, field), field);
    });
  });
});
