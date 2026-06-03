// Promote strictly quality-gated usable provider candidates into Active Pricing V1.
//
// Active deals remain review-only evidence rows. They are not postcode checked,
// not manually approved, and must not be treated as final checkout prices.

const fs = require('node:fs');
const path = require('node:path');

const INPUT_PATH = path.join(__dirname, 'exports', 'provider-deal-candidates-usable.json');
const JSON_OUTPUT_PATH = path.join(__dirname, 'exports', 'active-online-deals.json');
const CSV_OUTPUT_PATH = path.join(__dirname, 'exports', 'active-online-deals.csv');

const ACTIVE_COLUMNS = [
  'activeDealId',
  'candidateId',
  'provider',
  'packageName',
  'sourceName',
  'sourceType',
  'sourceUrl',
  'advertisedMonthlyPrice',
  'effectiveMonthlyPrice',
  'sourceEffectiveMonthlyPrice',
  'contractLengthMonths',
  'annualAprilPriceRise',
  'setupFee',
  'voucherValue',
  'rewardCardValue',
  'cashbackValue',
  'billCreditValue',
  'speedMbps',
  'speedTier',
  'extractionConfidence',
  'extractionQuality',
  'availabilityScope',
  'publishStatus',
  'requiresHumanReview',
  'sourceSnippet',
  'extractionWarnings',
  'generatedAt',
];

const PROMOTABLE_QUALITIES = new Set(['usable-calculated', 'usable-source-effective-only']);
const QUALITY_GATE_WARNING_PREFIX = 'Quality gate:';

function normalizeCandidateOutput(candidateOutput) {
  if (Array.isArray(candidateOutput)) {
    return { candidates: candidateOutput, warningMessages: [] };
  }

  if (!candidateOutput || typeof candidateOutput !== 'object') {
    return { candidates: [], warningMessages: ['Usable candidate input had an invalid shape.'] };
  }

  return {
    candidates: Array.isArray(candidateOutput.candidates) ? candidateOutput.candidates : [],
    warningMessages: Array.isArray(candidateOutput.warningMessages) ? candidateOutput.warningMessages : [],
  };
}

function readUsableCandidates(inputPath = INPUT_PATH) {
  if (!fs.existsSync(inputPath)) {
    return {
      candidates: [],
      warningMessages: [`${path.relative(__dirname, inputPath)} was not found; no active online deals were created.`],
    };
  }

  return normalizeCandidateOutput(JSON.parse(fs.readFileSync(inputPath, 'utf8')));
}

function hasQualityGateWarning(candidate) {
  return Array.isArray(candidate.extractionWarnings) &&
    candidate.extractionWarnings.some((warning) => String(warning).startsWith(QUALITY_GATE_WARNING_PREFIX));
}

function isNotPostcodeChecked(candidate) {
  return /not-postcode-checked/i.test(String(candidate.availabilityScope || '')) ||
    /not postcode checked/i.test(String(candidate.availabilityScope || ''));
}

function passedStricterQualityGate(candidate) {
  if (hasQualityGateWarning(candidate)) {
    return false;
  }

  if (candidate.annualAprilPriceRise !== null && candidate.annualAprilPriceRise !== undefined) {
    const rise = Number(candidate.annualAprilPriceRise);
    if (!Number.isFinite(rise) || rise < 0 || rise > 6) {
      return false;
    }
  }

  return true;
}

function isPromotableCandidate(candidate) {
  return PROMOTABLE_QUALITIES.has(candidate.extractionQuality) &&
    candidate.publishStatus === 'candidate-review-only' &&
    candidate.requiresHumanReview === true &&
    isNotPostcodeChecked(candidate) &&
    passedStricterQualityGate(candidate);
}

function createActiveDealId(candidate, index) {
  const baseId = String(candidate.candidateId || `candidate-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `candidate-${index + 1}`;
  return `active-${baseId}`;
}

function toActiveDeal(candidate, generatedAt, index) {
  return {
    activeDealId: createActiveDealId(candidate, index),
    candidateId: candidate.candidateId || null,
    provider: candidate.provider || null,
    packageName: candidate.packageName || null,
    sourceName: candidate.sourceName || null,
    sourceType: candidate.sourceType || null,
    sourceUrl: candidate.sourceUrl || '',
    advertisedMonthlyPrice: candidate.advertisedMonthlyPrice ?? null,
    effectiveMonthlyPrice: candidate.effectiveMonthlyPrice ?? null,
    sourceEffectiveMonthlyPrice: candidate.sourceEffectiveMonthlyPrice ?? null,
    contractLengthMonths: candidate.contractLengthMonths ?? null,
    annualAprilPriceRise: candidate.annualAprilPriceRise ?? null,
    setupFee: candidate.setupFee ?? null,
    voucherValue: candidate.voucherValue ?? null,
    rewardCardValue: candidate.rewardCardValue ?? null,
    cashbackValue: candidate.cashbackValue ?? null,
    billCreditValue: candidate.billCreditValue ?? null,
    speedMbps: candidate.speedMbps ?? null,
    speedTier: candidate.speedTier || null,
    extractionConfidence: candidate.extractionConfidence || null,
    extractionQuality: candidate.extractionQuality || null,
    availabilityScope: candidate.availabilityScope || null,
    publishStatus: 'active-review-only',
    requiresHumanReview: true,
    sourceSnippet: candidate.sourceSnippet || '',
    extractionWarnings: Array.isArray(candidate.extractionWarnings) ? candidate.extractionWarnings : [],
    generatedAt,
  };
}

function buildActiveOnlineDealsOutput(candidateOutput, generatedAt = new Date().toISOString()) {
  const input = normalizeCandidateOutput(candidateOutput);
  const activeDeals = input.candidates
    .filter(isPromotableCandidate)
    .map((candidate, index) => toActiveDeal(candidate, generatedAt, index));

  const warningMessages = [...input.warningMessages];
  if (activeDeals.length === 0) {
    warningMessages.push('No usable active online deals were created in this run. Check the review artifacts.');
  }

  return {
    summary: {
      generatedAt,
      totalActiveDeals: activeDeals.length,
      usableCalculatedCount: activeDeals.filter((deal) => deal.extractionQuality === 'usable-calculated').length,
      sourceEffectiveOnlyCount: activeDeals.filter((deal) => deal.extractionQuality === 'usable-source-effective-only').length,
      providerCount: new Set(activeDeals.map((deal) => deal.provider).filter(Boolean)).size,
      sourceCount: new Set(activeDeals.map((deal) => deal.sourceName).filter(Boolean)).size,
      warningMessages: [...new Set(warningMessages)],
    },
    activeDeals,
  };
}

function csvEscape(value) {
  if (Array.isArray(value)) {
    return csvEscape(value.join(' | '));
  }

  const stringValue = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeCsvFile(filePath, activeDeals) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const rows = [
    ACTIVE_COLUMNS.join(','),
    ...activeDeals.map((deal) => ACTIVE_COLUMNS.map((column) => csvEscape(deal[column])).join(',')),
  ];
  fs.writeFileSync(filePath, `${rows.join('\n')}\n`);
}

function promoteUsableCandidates({ inputPath = INPUT_PATH, jsonOutputPath = JSON_OUTPUT_PATH, csvOutputPath = CSV_OUTPUT_PATH, generatedAt = new Date().toISOString() } = {}) {
  const candidateOutput = readUsableCandidates(inputPath);
  const output = buildActiveOnlineDealsOutput(candidateOutput, generatedAt);
  writeJsonFile(jsonOutputPath, output);
  writeCsvFile(csvOutputPath, output.activeDeals);
  return output;
}

function main() {
  const output = promoteUsableCandidates();
  console.log('Active online deal promotion complete');
  console.log('====================================');
  console.log(`Active online deals: ${output.summary.totalActiveDeals}`);
  console.log(`JSON created: ${path.relative(__dirname, JSON_OUTPUT_PATH)}`);
  console.log(`CSV created: ${path.relative(__dirname, CSV_OUTPUT_PATH)}`);
  if (output.summary.warningMessages.length > 0) {
    console.log('Warnings:');
    output.summary.warningMessages.forEach((warning) => console.log(`- ${warning}`));
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  ACTIVE_COLUMNS,
  buildActiveOnlineDealsOutput,
  isPromotableCandidate,
  passedStricterQualityGate,
  promoteUsableCandidates,
  readUsableCandidates,
};
