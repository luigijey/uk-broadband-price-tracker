// Promote strictly quality-gated usable provider candidates into Active Pricing V1.
//
// Active deals remain review-only evidence rows. They are not postcode checked,
// not manually approved, and must not be treated as final checkout prices.

const fs = require('node:fs');
const path = require('node:path');

const INPUT_PATH = path.join(__dirname, 'exports', 'provider-deal-candidates-usable.json');
const JSON_OUTPUT_PATH = path.join(__dirname, 'exports', 'active-online-deals.json');
const CSV_OUTPUT_PATH = path.join(__dirname, 'exports', 'active-online-deals.csv');

const {
  CALLS_PACKAGE_STATUSES,
  CONNECTION_TECHNOLOGIES,
  HOMEPAGE_CATEGORIES,
  LANDLINE_STATUSES,
  SERVICE_CATEGORIES,
  classifyProductModel,
  isHomepageVisibleCategory,
  normalizeForMatching,
} = require('./product-classification');

const ACTIVE_COLUMNS = [
  'activeDealId',
  'candidateId',
  'provider',
  'packageName',
  'sourceName',
  'sourceType',
  'advertisedMonthlyPrice',
  'effectiveMonthlyPrice',
  'sourceEffectiveMonthlyPrice',
  'speedMbps',
  'speedTier',
  'extractionConfidence',
  'extractionQuality',
  'activeFeedTrustLevel',
  'productType',
  'connectionTechnology',
  'serviceCategory',
  'landlineStatus',
  'callsPackageStatus',
  'homepageCategory',
  'showOnHomepage',
  'publishStatus',
  'requiresHumanReview',
];

const PROMOTABLE_QUALITIES = new Set(['usable-calculated', 'usable-source-effective-only']);
const QUALITY_GATE_WARNING_PREFIX = 'Quality gate:';

const ACTIVE_FEED_TRUST_LEVELS = new Set([
  'provider-direct-calculated',
  'comparison-clean-calculated',
  'comparison-source-effective-only',
  'review-artifact-only',
]);

const KNOWN_PROVIDER_NAMES = [
  'TalkTalk',
  'Vodafone',
  'BT',
  'Plusnet',
  'Sky',
  'Virgin Media',
  'EE',
  'Hyperoptic',
  'Community Fibre',
  'Broadband Genie',
];

const FORCE_HOMEPAGE_HIDDEN_CANDIDATE_IDS = new Set([
  'uswitch-virgin-media-superfast-broadband',
  'uswitch-plusnet-fibre-66',
]);

const PRODUCT_TYPES = new Set([
  'broadband-only',
  'broadband-tv-bundle',
  'broadband-mobile-bundle',
  'broadband-phone-bundle',
  'unknown',
]);

function classifyProductType(candidate) {
  return classifyProductModel(candidate).productType;
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function includesNormalized(haystack, needle) {
  const normalizedHaystack = normalizeForMatching(haystack);
  const normalizedNeedle = normalizeForMatching(needle);
  return normalizedNeedle.length > 0 && normalizedHaystack.includes(normalizedNeedle);
}

function findExtractedBlockStart(candidate) {
  const sourceSnippet = String(candidate.sourceSnippet || '');
  const provider = String(candidate.provider || '');
  const packageName = String(candidate.packageName || '');
  const starts = [];

  [provider, packageName, `${provider} ${packageName}`].forEach((value) => {
    const normalizedValue = normalizeForMatching(value);
    if (!normalizedValue) return;
    const valueWords = normalizedValue.split(' ').map(escapeRegex).join('\\s+');
    const match = new RegExp(`\\b${valueWords}\\b`, 'i').exec(sourceSnippet);
    if (match) starts.push(match.index);
  });

  return starts.length > 0 ? Math.min(...starts) : -1;
}

function snippetStartsWithExtractedBlock(candidate) {
  const sourceSnippet = String(candidate.sourceSnippet || '');
  const normalizedSnippet = normalizeForMatching(sourceSnippet);
  const provider = normalizeForMatching(candidate.provider || '');
  const packageName = normalizeForMatching(candidate.packageName || '');
  const combined = normalizeForMatching(`${candidate.provider || ''} ${candidate.packageName || ''}`);

  const cleanStarts = [combined, provider, packageName]
    .filter((value) => value.length > 0)
    .some((value) => normalizedSnippet.startsWith(value));
  if (cleanStarts) {
    return true;
  }

  const blockStart = findExtractedBlockStart(candidate);
  if (blockStart < 0) {
    return false;
  }

  const leadingText = normalizeForMatching(sourceSnippet.slice(0, blockStart));
  // Allow small labels/positioning text, but not a preceding deal-sized block.
  return leadingText.length <= 40 && !/£|mbps|month|contract|fibre|broadband|gig1|superfast/.test(leadingText);
}

function hasOtherProviderBeforeExtractedBlock(candidate) {
  const sourceSnippet = String(candidate.sourceSnippet || '');
  const blockStart = findExtractedBlockStart(candidate);
  if (blockStart <= 0) {
    return false;
  }

  const leadingText = sourceSnippet.slice(0, blockStart);
  return KNOWN_PROVIDER_NAMES
    .filter((providerName) => normalizeForMatching(providerName) !== normalizeForMatching(candidate.provider || ''))
    .some((providerName) => new RegExp(`\\b${escapeRegex(providerName)}\\b`, 'i').test(leadingText));
}

function getHomepageDecision(candidate) {
  const warnings = [];

  if (FORCE_HOMEPAGE_HIDDEN_CANDIDATE_IDS.has(candidate.candidateId)) {
    warnings.push('Active feed trust gate: known noisy Uswitch comparison row is hidden from homepage because its snippet mixes adjacent provider/deal text.');
  }

  if (candidate.extractionQuality === 'usable-source-effective-only') {
    return {
      activeFeedTrustLevel: 'comparison-source-effective-only',
      showOnHomepage: false,
      warnings,
    };
  }

  if (candidate.extractionQuality !== 'usable-calculated') {
    return {
      activeFeedTrustLevel: 'review-artifact-only',
      showOnHomepage: false,
      warnings: [...warnings, 'Active feed trust gate: only usable-calculated rows can appear on the homepage.'],
    };
  }

  const requiredNumberFields = [
    'effectiveMonthlyPrice',
    'advertisedMonthlyPrice',
    'contractLengthMonths',
    'annualAprilPriceRise',
    'speedMbps',
  ];
  const missingNumberFields = requiredNumberFields.filter((field) => !isNumber(candidate[field]));
  if (missingNumberFields.length > 0) {
    return {
      activeFeedTrustLevel: 'review-artifact-only',
      showOnHomepage: false,
      warnings: [...warnings, `Active feed trust gate: hidden from homepage because numeric fields are missing or invalid (${missingNumberFields.join(', ')}).`],
    };
  }

  if (candidate.sourceType === 'provider-direct') {
    const snippetNamesDeal = includesNormalized(candidate.sourceSnippet, candidate.provider) || includesNormalized(candidate.sourceSnippet, candidate.packageName);
    if (!snippetNamesDeal) {
      return {
        activeFeedTrustLevel: 'review-artifact-only',
        showOnHomepage: false,
        warnings: [...warnings, 'Active feed trust gate: provider-direct snippet does not mention the extracted provider or package.'],
      };
    }

    return {
      activeFeedTrustLevel: 'provider-direct-calculated',
      showOnHomepage: warnings.length === 0,
      warnings,
    };
  }

  if (candidate.sourceType === 'comparison-site') {
    if (candidate.annualAprilPriceRise < 0 || candidate.annualAprilPriceRise > 6) {
      warnings.push('Active feed trust gate: comparison-site annual April price rise is outside the £0-£6 homepage range.');
    }

    if (!snippetStartsWithExtractedBlock(candidate)) {
      warnings.push('Active feed trust gate: comparison-site snippet does not begin with the extracted provider/package block.');
    }

    if (hasOtherProviderBeforeExtractedBlock(candidate)) {
      warnings.push('Active feed trust gate: comparison-site snippet mentions another provider before the extracted provider/package block.');
    }

    if (warnings.length > 0) {
      return {
        activeFeedTrustLevel: 'review-artifact-only',
        showOnHomepage: false,
        warnings,
      };
    }

    return {
      activeFeedTrustLevel: 'comparison-clean-calculated',
      showOnHomepage: true,
      warnings,
    };
  }

  return {
    activeFeedTrustLevel: 'review-artifact-only',
    showOnHomepage: false,
    warnings: [...warnings, `Active feed trust gate: unsupported sourceType ${candidate.sourceType || 'unknown'} is hidden from homepage.`],
  };
}

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
    isNotPostcodeChecked(candidate);
}

function createActiveDealId(candidate, index) {
  const baseId = String(candidate.candidateId || `candidate-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `candidate-${index + 1}`;
  return `active-${baseId}`;
}

function toActiveDeal(candidate, generatedAt, index) {
  const homepageDecision = getHomepageDecision(candidate);
  const productModel = classifyProductModel(candidate);
  const {
    productType,
    connectionTechnology,
    serviceCategory,
    landlineStatus,
    callsPackageStatus,
    homepageCategory,
  } = productModel;
  const productTypeWarnings = [];

  if (!PRODUCT_TYPES.has(productType)) {
    throw new Error(`Unexpected product type: ${productType}`);
  }
  if (!CONNECTION_TECHNOLOGIES.has(connectionTechnology)) {
    throw new Error(`Unexpected connection technology: ${connectionTechnology}`);
  }
  if (!SERVICE_CATEGORIES.has(serviceCategory)) {
    throw new Error(`Unexpected service category: ${serviceCategory}`);
  }
  if (!LANDLINE_STATUSES.has(landlineStatus)) {
    throw new Error(`Unexpected landline status: ${landlineStatus}`);
  }
  if (!CALLS_PACKAGE_STATUSES.has(callsPackageStatus)) {
    throw new Error(`Unexpected calls package status: ${callsPackageStatus}`);
  }
  if (!HOMEPAGE_CATEGORIES.has(homepageCategory)) {
    throw new Error(`Unexpected homepage category: ${homepageCategory}`);
  }

  if (homepageDecision.showOnHomepage === true && !isHomepageVisibleCategory(homepageCategory)) {
    homepageDecision.showOnHomepage = false;
    productTypeWarnings.push(`Active feed product gate: hidden from homepage because homepageCategory is ${homepageCategory}.`);
  }

  if (homepageDecision.showOnHomepage === true && connectionTechnology === '5g-home-broadband' && serviceCategory === 'broadband-tv-bundle') {
    homepageDecision.showOnHomepage = false;
    productTypeWarnings.push('Active feed product gate: hidden from homepage because the 5G home broadband row is mixed with TV/bundle text.');
  }

  const extractionWarnings = [...new Set([
    ...(Array.isArray(candidate.extractionWarnings) ? candidate.extractionWarnings : []),
    ...homepageDecision.warnings,
    ...productTypeWarnings,
  ])];

  if (!ACTIVE_FEED_TRUST_LEVELS.has(homepageDecision.activeFeedTrustLevel)) {
    throw new Error(`Unexpected active feed trust level: ${homepageDecision.activeFeedTrustLevel}`);
  }

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
    activeFeedTrustLevel: homepageDecision.activeFeedTrustLevel,
    productType,
    connectionTechnology,
    serviceCategory,
    landlineStatus,
    callsPackageStatus,
    homepageCategory,
    showOnHomepage: homepageDecision.showOnHomepage,
    availabilityScope: candidate.availabilityScope || null,
    publishStatus: 'active-review-only',
    requiresHumanReview: true,
    sourceSnippet: candidate.sourceSnippet || '',
    extractionWarnings,
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
    activeDeals,
    summary: {
      totalActiveDeals: activeDeals.length,
      homepageActiveDeals: activeDeals.filter((deal) => deal.showOnHomepage === true && isHomepageVisibleCategory(deal.homepageCategory)).length,
      broadbandOnlyHomepageCount: activeDeals.filter((deal) => deal.showOnHomepage === true && deal.homepageCategory === 'Fixed broadband').length,
      hiddenReviewDeals: activeDeals.filter((deal) => deal.showOnHomepage !== true).length,
      providerDirectHomepageCount: activeDeals.filter((deal) => deal.showOnHomepage === true && deal.activeFeedTrustLevel === 'provider-direct-calculated').length,
      comparisonHomepageCount: activeDeals.filter((deal) => deal.showOnHomepage === true && deal.activeFeedTrustLevel === 'comparison-clean-calculated').length,
      sourceEffectiveOnlyHiddenCount: activeDeals.filter((deal) => deal.showOnHomepage !== true && deal.activeFeedTrustLevel === 'comparison-source-effective-only').length,
      hiddenBundleCount: activeDeals.filter((deal) => deal.showOnHomepage !== true && deal.homepageCategory === 'Bundles and review-only').length,
      hiddenUnknownProductTypeCount: activeDeals.filter((deal) => deal.showOnHomepage !== true && deal.homepageCategory === 'Unknown review-only').length,
      generatedAt,
      warningMessages: [...new Set([
        ...warningMessages,
        ...activeDeals.flatMap((deal) => Array.isArray(deal.extractionWarnings) ? deal.extractionWarnings.filter((warning) => String(warning).startsWith('Active feed trust gate:') || String(warning).startsWith('Active feed product gate:')) : []),
      ])],
    },
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
  console.log(`Homepage active deals: ${output.summary.homepageActiveDeals}`);
  console.log(`Fixed-broadband homepage deals: ${output.summary.broadbandOnlyHomepageCount}`);
  console.log(`Hidden bundle active records: ${output.summary.hiddenBundleCount}`);
  console.log(`Hidden unknown-product active records: ${output.summary.hiddenUnknownProductTypeCount}`);
  console.log(`Hidden review/evidence active records: ${output.summary.hiddenReviewDeals}`);
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
  ACTIVE_FEED_TRUST_LEVELS,
  PRODUCT_TYPES,
  buildActiveOnlineDealsOutput,
  classifyProductType,
  getHomepageDecision,
  isPromotableCandidate,
  passedStricterQualityGate,
  promoteUsableCandidates,
  readUsableCandidates,
};
