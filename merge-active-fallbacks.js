// Merge clearly labelled Last Known Good fallback rows into Active Pricing V1.
//
// This does not fetch provider pages, submit postcode forms, use browser
// automation, proxies, or bypass robots/security restrictions. Fallback rows are
// review-only records used only when a provider source was unavailable in the
// latest polite extraction run.

const fs = require('node:fs');
const path = require('node:path');

const { isHomepageVisibleCategory } = require('./product-classification');

const ACTIVE_DEALS_PATH = path.join(__dirname, 'exports', 'active-online-deals.json');
const FALLBACK_DEALS_PATH = path.join(__dirname, 'fallback-data', 'last-known-good-active-deals.json');
const PROVIDER_CANDIDATES_PATH = path.join(__dirname, 'exports', 'provider-deal-candidates.json');
const ONLINE_SNIPPETS_PATH = path.join(__dirname, 'exports', 'online-price-snippets.json');
const JSON_OUTPUT_PATH = path.join(__dirname, 'exports', 'active-online-deals-with-fallbacks.json');
const CSV_OUTPUT_PATH = path.join(__dirname, 'exports', 'active-online-deals-with-fallbacks.csv');

const FALLBACK_CAVEAT = 'This row uses last-known-good extracted review data because the provider source was unavailable in the latest run.';
const FALLBACK_SNIPPET = 'Last-known-good fallback record. Source was unavailable in latest run.';

const OUTPUT_COLUMNS = [
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
  'setupFeeStatus',
  'effectivePriceCaveat',
  'contractLengthMonths',
  'annualAprilPriceRise',
  'setupFee',
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
  'dataFreshnessStatus',
  'fallbackReason',
  'fallbackSource',
  'lastKnownGoodCheckedAt',
  'availabilityScope',
  'publishStatus',
  'requiresHumanReview',
];

function readJsonFileIfExists(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) return fallbackValue;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeActiveDealOutput(activeDealOutput) {
  if (Array.isArray(activeDealOutput)) return { activeDeals: activeDealOutput, summary: {} };
  if (!activeDealOutput || typeof activeDealOutput !== 'object') return { activeDeals: [], summary: {} };
  return {
    activeDeals: Array.isArray(activeDealOutput.activeDeals) ? activeDealOutput.activeDeals : [],
    summary: activeDealOutput.summary || {},
  };
}

function normalizeFallbackRecords(fallbackOutput) {
  if (Array.isArray(fallbackOutput)) return fallbackOutput;
  if (!fallbackOutput || typeof fallbackOutput !== 'object') return [];
  return Array.isArray(fallbackOutput.records) ? fallbackOutput.records : [];
}

function providerKey(value) {
  return String(value || '').trim().toLowerCase();
}

function packageKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function dealKey(deal) {
  return `${providerKey(deal.provider)}::${packageKey(deal.packageName)}`;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isHomepageVisibleDeal(deal) {
  return deal && deal.showOnHomepage === true && isHomepageVisibleCategory(deal.homepageCategory);
}

function hasReliableEffectiveMonthlyPrice(record) {
  return Number.isFinite(Number(record.effectiveMonthlyPrice));
}

function providerHasUnavailableWarning(provider, providerCandidatesOutput = {}, onlineSnippetReport = []) {
  const key = providerKey(provider);
  const unavailablePattern = /no snippets|robots|403|dns|unavailable|not fetched|blocked|security|captcha|source access|could not fetch|permission treated as unknown/i;

  const candidateWarnings = Array.isArray(providerCandidatesOutput.warningMessages) ? providerCandidatesOutput.warningMessages : [];
  if (candidateWarnings.some((warning) => providerKey(warning).includes(key) && unavailablePattern.test(String(warning)))) {
    return true;
  }

  const sourceSummary = Array.isArray(providerCandidatesOutput.sourceSummary) ? providerCandidatesOutput.sourceSummary : [];
  if (sourceSummary.some((source) =>
    (providerKey(source.sourceName) === key || providerKey(source.sourceId) === key || providerKey(source.sourceId) === slugify(provider)) &&
    (Number(source.snippetsAvailable) === 0 || (Array.isArray(source.warningMessages) && source.warningMessages.some((warning) => unavailablePattern.test(String(warning)))))
  )) {
    return true;
  }

  if (Array.isArray(onlineSnippetReport) && onlineSnippetReport.some((source) =>
    (providerKey(source.name) === key || providerKey(source.sourceId) === key || providerKey(source.sourceId) === slugify(provider)) &&
    (Number(source.snippetsFound) === 0 || (Array.isArray(source.warningMessages) && source.warningMessages.some((warning) => unavailablePattern.test(String(warning)))))
  )) {
    return true;
  }

  return false;
}

function toFallbackActiveDeal(record, generatedAt, index) {
  const activeDealId = `active-fallback-${slugify(record.provider)}-${slugify(record.packageName) || index + 1}`;
  const extractionWarnings = [...new Set([
    ...(Array.isArray(record.extractionWarnings) ? record.extractionWarnings : []),
    record.fallbackReason,
  ].filter(Boolean))];

  return {
    activeDealId,
    candidateId: null,
    provider: record.provider,
    packageName: record.packageName,
    sourceName: record.sourceName,
    sourceType: record.sourceType,
    sourceUrl: record.sourceUrl || '',
    advertisedMonthlyPrice: record.advertisedMonthlyPrice,
    effectiveMonthlyPrice: record.effectiveMonthlyPrice,
    sourceEffectiveMonthlyPrice: null,
    setupFeeStatus: record.setupFeeStatus,
    effectivePriceCaveat: record.effectivePriceCaveat || FALLBACK_CAVEAT,
    contractLengthMonths: record.contractLengthMonths,
    annualAprilPriceRise: record.annualAprilPriceRise,
    setupFee: record.setupFee,
    speedMbps: record.speedMbps,
    speedTier: record.speedTier,
    extractionConfidence: 'fallback',
    extractionQuality: 'usable-calculated',
    activeFeedTrustLevel: 'provider-direct-fallback-calculated',
    productType: record.productType || record.serviceCategory || 'broadband-only',
    connectionTechnology: record.connectionTechnology,
    serviceCategory: record.serviceCategory,
    landlineStatus: record.landlineStatus,
    callsPackageStatus: record.callsPackageStatus,
    homepageCategory: record.homepageCategory,
    showOnHomepage: true,
    dataFreshnessStatus: 'last-known-good-fallback',
    fallbackReason: record.fallbackReason,
    fallbackSource: record.fallbackSource,
    lastKnownGoodCheckedAt: record.lastKnownGoodCheckedAt,
    availabilityScope: record.availabilityScope,
    publishStatus: record.publishStatus || 'active-review-only',
    requiresHumanReview: true,
    sourceSnippet: FALLBACK_SNIPPET,
    extractionWarnings,
    generatedAt,
  };
}

function buildActiveDealsWithFallbacksOutput({
  activeDealOutput,
  fallbackDealOutput,
  providerCandidatesOutput = {},
  onlineSnippetReport = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const activeInput = normalizeActiveDealOutput(activeDealOutput);
  const currentDeals = activeInput.activeDeals.map((deal) => ({ ...deal, dataFreshnessStatus: 'fresh-current-run' }));
  const fallbackRecords = normalizeFallbackRecords(fallbackDealOutput);
  const homepageProviders = new Set(currentDeals.filter(isHomepageVisibleDeal).map((deal) => providerKey(deal.provider)));
  const existingDealKeys = new Set(currentDeals.map(dealKey));
  const addedProviders = new Set();
  const warningMessages = [];

  const fallbackDeals = fallbackRecords.filter((record) => {
    if (!record || !record.provider || !record.packageName) return false;
    if (homepageProviders.has(providerKey(record.provider))) return false;
    if (existingDealKeys.has(dealKey(record))) return false;
    if (!isHomepageVisibleCategory(record.homepageCategory)) return false;
    if (!hasReliableEffectiveMonthlyPrice(record)) return false;
    if (!providerHasUnavailableWarning(record.provider, providerCandidatesOutput, onlineSnippetReport)) return false;
    return true;
  }).map((record, index) => {
    addedProviders.add(record.provider);
    existingDealKeys.add(dealKey(record));
    return toFallbackActiveDeal(record, generatedAt, index);
  });

  if (fallbackDeals.length > 0) {
    warningMessages.push('Last-known-good fallback rows were added because one or more provider sources were unavailable in the latest run. They are review-only and not fresh prices.');
  }

  const activeDeals = [...currentDeals, ...fallbackDeals];
  const homepageActiveDealsBeforeFallback = currentDeals.filter(isHomepageVisibleDeal).length;
  const homepageActiveDealsAfterFallback = activeDeals.filter(isHomepageVisibleDeal).length;

  return {
    activeDeals,
    summary: {
      ...activeInput.summary,
      generatedAt,
      totalActiveDeals: activeDeals.length,
      homepageActiveDeals: homepageActiveDealsAfterFallback,
      broadbandOnlyHomepageCount: activeDeals.filter((deal) => isHomepageVisibleDeal(deal) && deal.homepageCategory === 'Fixed broadband').length,
      hiddenReviewDeals: activeDeals.filter((deal) => deal.showOnHomepage !== true).length,
      providerDirectHomepageCount: activeDeals.filter((deal) => isHomepageVisibleDeal(deal) && deal.activeFeedTrustLevel === 'provider-direct-calculated').length,
      providerDirectFallbackHomepageCount: activeDeals.filter((deal) => isHomepageVisibleDeal(deal) && deal.activeFeedTrustLevel === 'provider-direct-fallback-calculated').length,
      comparisonHomepageCount: activeDeals.filter((deal) => isHomepageVisibleDeal(deal) && deal.activeFeedTrustLevel === 'comparison-clean-calculated').length,
      sourceEffectiveOnlyHiddenCount: activeDeals.filter((deal) => deal.showOnHomepage !== true && deal.activeFeedTrustLevel === 'comparison-source-effective-only').length,
      hiddenBundleCount: activeDeals.filter((deal) => deal.showOnHomepage !== true && deal.homepageCategory === 'Bundles and review-only').length,
      hiddenUnknownProductTypeCount: activeDeals.filter((deal) => deal.showOnHomepage !== true && deal.homepageCategory === 'Unknown review-only').length,
      freshCurrentRunDeals: currentDeals.length,
      fallbackDealsAdded: fallbackDeals.length,
      homepageActiveDealsBeforeFallback,
      homepageActiveDealsAfterFallback,
      providersRestoredByFallback: [...addedProviders].sort(),
      warningMessages: [...new Set([...(Array.isArray(activeInput.summary.warningMessages) ? activeInput.summary.warningMessages : []), ...warningMessages])],
    },
  };
}

function csvEscape(value) {
  if (Array.isArray(value)) return csvEscape(value.join(' | '));
  const stringValue = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
  return stringValue;
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeCsvFile(filePath, activeDeals) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const rows = [
    OUTPUT_COLUMNS.join(','),
    ...activeDeals.map((deal) => OUTPUT_COLUMNS.map((column) => csvEscape(deal[column])).join(',')),
  ];
  fs.writeFileSync(filePath, `${rows.join('\n')}\n`);
}

function mergeActiveFallbacks({
  activeDealsPath = ACTIVE_DEALS_PATH,
  fallbackDealsPath = FALLBACK_DEALS_PATH,
  providerCandidatesPath = PROVIDER_CANDIDATES_PATH,
  onlineSnippetsPath = ONLINE_SNIPPETS_PATH,
  jsonOutputPath = JSON_OUTPUT_PATH,
  csvOutputPath = CSV_OUTPUT_PATH,
  generatedAt = new Date().toISOString(),
} = {}) {
  const activeDealOutput = readJsonFileIfExists(activeDealsPath, { activeDeals: [], summary: {} });
  const fallbackDealOutput = readJsonFileIfExists(fallbackDealsPath, { records: [] });
  const providerCandidatesOutput = readJsonFileIfExists(providerCandidatesPath, { sourceSummary: [], warningMessages: [] });
  const onlineSnippetReport = readJsonFileIfExists(onlineSnippetsPath, []);
  const output = buildActiveDealsWithFallbacksOutput({ activeDealOutput, fallbackDealOutput, providerCandidatesOutput, onlineSnippetReport, generatedAt });
  writeJsonFile(jsonOutputPath, output);
  writeCsvFile(csvOutputPath, output.activeDeals);
  return output;
}

function main() {
  const output = mergeActiveFallbacks();
  console.log('Active fallback merge complete');
  console.log('==============================');
  console.log(`Fresh current-run deals: ${output.summary.freshCurrentRunDeals}`);
  console.log(`Fallback deals added: ${output.summary.fallbackDealsAdded}`);
  console.log(`Homepage active deals before fallback: ${output.summary.homepageActiveDealsBeforeFallback}`);
  console.log(`Homepage active deals after fallback: ${output.summary.homepageActiveDealsAfterFallback}`);
  console.log(`JSON created: ${path.relative(__dirname, JSON_OUTPUT_PATH)}`);
  console.log(`CSV created: ${path.relative(__dirname, CSV_OUTPUT_PATH)}`);
}

if (require.main === module) main();

module.exports = {
  FALLBACK_CAVEAT,
  FALLBACK_SNIPPET,
  OUTPUT_COLUMNS,
  buildActiveDealsWithFallbacksOutput,
  mergeActiveFallbacks,
  providerHasUnavailableWarning,
};
