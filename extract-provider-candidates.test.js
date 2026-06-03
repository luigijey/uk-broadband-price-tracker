// Tests for the multi-provider online candidate extraction prototype.

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildProviderCandidates,
  createCandidateId,
  extractAnnualRiseFromText,
  extractProviderCandidateFromSnippet,
} = require('./extract-provider-candidates');
const { deriveAnnualAprilPriceRise } = require('./extract-talktalk-deals');

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

const broadbandGenieSource = {
  sourceId: 'broadband-genie',
  name: 'Broadband Genie',
  sourceType: 'comparison-site',
  candidateBroadbandUrl: 'https://www.broadbandgenie.co.uk/broadband',
};

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
