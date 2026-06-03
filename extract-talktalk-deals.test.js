// Tests for the TalkTalk structured provider deal candidate extraction helpers.

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  deriveAnnualAprilPriceRise,
  extractTalkTalkDealFromSnippet,
  getSpeedTier,
} = require('./extract-talktalk-deals');

const source = {
  sourceId: 'talktalk',
  name: 'TalkTalk',
  candidateBroadbandUrl: 'https://www.talktalk.co.uk/broadband',
};

const extractedAt = '2026-06-03T00:00:00.000Z';

test('extracts Fibre 35 from a sample TalkTalk snippet', () => {
  const deal = extractTalkTalkDealFromSnippet({
    surroundingText: 'Fibre 35 £24 a month, then £28 from April 2027 and £32 from April 2028. 24 month contract. No setup fee.',
  }, source, extractedAt);

  assert.equal(deal.sourceId, 'talktalk');
  assert.equal(deal.sourceName, 'TalkTalk');
  assert.equal(deal.provider, 'TalkTalk');
  assert.equal(deal.packageName, 'Fibre 35');
  assert.equal(deal.sourceUrl, 'https://www.talktalk.co.uk/broadband');
  assert.equal(deal.advertisedMonthlyPrice, 24);
  assert.equal(deal.contractLengthMonths, 24);
  assert.equal(deal.annualAprilPriceRise, 4);
  assert.equal(deal.firstAprilPrice, 28);
  assert.equal(deal.secondAprilPrice, 32);
  assert.equal(deal.setupFee, 0);
  assert.equal(deal.speedMbps, 35);
  assert.equal(deal.speedTier, '35-75 Mbps');
  assert.equal(deal.publishStatus, 'candidate-review-only');
  assert.equal(deal.availabilityScope, 'provider-landing-page-not-postcode-checked');
  assert.equal(deal.requiresHumanReview, true);
  assert.equal(deal.extractionConfidence, 'high');
  assert.deepEqual(deal.extractionWarnings, []);
  assert.equal(typeof deal.totalMonthlyPayments, 'number');
  assert.equal(typeof deal.totalFees, 'number');
  assert.equal(typeof deal.totalRewardsAndDiscounts, 'number');
  assert.equal(typeof deal.totalContractCostBeforeRewards, 'number');
  assert.equal(typeof deal.totalContractCostAfterRewards, 'number');
  assert.equal(typeof deal.effectiveMonthlyPrice, 'number');
});

test('extracts Full Fibre 150 from a sample TalkTalk snippet', () => {
  const deal = extractTalkTalkDealFromSnippet({
    surroundingText: 'Full Fibre 150 £29 a month. Price rises to £33 in April 2027 and £37 in April 2028. 24 month contract with no set up fees.',
  }, source, extractedAt);

  assert.equal(deal.packageName, 'Full Fibre 150');
  assert.equal(deal.advertisedMonthlyPrice, 29);
  assert.equal(deal.firstAprilPrice, 33);
  assert.equal(deal.secondAprilPrice, 37);
  assert.equal(deal.annualAprilPriceRise, 4);
  assert.equal(deal.contractLengthMonths, 24);
  assert.equal(deal.setupFee, 0);
  assert.equal(deal.speedMbps, 150);
  assert.equal(deal.speedTier, '100-300 Mbps');
});

test('derives annualAprilPriceRise from £24 to £28 to £32', () => {
  const result = deriveAnnualAprilPriceRise(24, 28, 32);

  assert.equal(result.annualAprilPriceRise, 4);
  assert.equal(result.warning, null);
});

test('marks inconsistent price rises with a warning', () => {
  const result = deriveAnnualAprilPriceRise(24, 29, 32);

  assert.equal(result.annualAprilPriceRise, null);
  assert.match(result.warning, /Could not derive a consistent annual April price rise/);

  const deal = extractTalkTalkDealFromSnippet({
    surroundingText: 'Fibre 65 £24 a month, then £29 from April 2027 and £32 from April 2028. 24 month contract. No setup fee.',
  }, source, extractedAt);

  assert.equal(deal.packageName, 'Fibre 65');
  assert.equal(deal.annualAprilPriceRise, null);
  assert.equal(deal.extractionConfidence, 'medium');
  assert.ok(deal.extractionWarnings.some((warning) => warning.includes('Could not derive a consistent annual April price rise')));
});

test('assigns the correct speed tier', () => {
  assert.equal(getSpeedTier(35), '35-75 Mbps');
  assert.equal(getSpeedTier(65), '35-75 Mbps');
  assert.equal(getSpeedTier(150), '100-300 Mbps');
  assert.equal(getSpeedTier(500), '500-900 Mbps');
  assert.equal(getSpeedTier(900), '900 Mbps+');
});
