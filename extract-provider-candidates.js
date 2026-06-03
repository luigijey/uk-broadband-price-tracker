// Multi-provider online deal candidate extraction.
//
// This is a conservative prototype. It reads online price-like snippets that
// have already been collected without bypassing robots.txt, blocks, CAPTCHAs,
// login walls, or security checks. The output is candidate-review-only data:
// not postcode checked, not manually approved, and suitable for human review.

const fs = require('node:fs');
const path = require('node:path');

const { calculateBroadbandPrice } = require('./pricing-calculator');
const {
  deriveAnnualAprilPriceRise,
  findPoundPrices,
  getSpeedTier,
  parsePoundPrice,
} = require('./extract-talktalk-deals');

const INPUT_PATH = path.join(__dirname, 'exports', 'online-price-snippets.json');
const JSON_OUTPUT_PATH = path.join(__dirname, 'exports', 'provider-deal-candidates.json');
const CSV_OUTPUT_PATH = path.join(__dirname, 'exports', 'provider-deal-candidates.csv');
const USABLE_OUTPUT_PATH = path.join(__dirname, 'exports', 'provider-deal-candidates-usable.json');
const REVIEW_ONLY_OUTPUT_PATH = path.join(__dirname, 'exports', 'provider-deal-candidates-review-only.json');
const DISCARDED_OUTPUT_PATH = path.join(__dirname, 'exports', 'provider-deal-candidates-discarded.json');

const TARGET_SOURCE_IDS = new Set([
  'talktalk',
  'vodafone',
  'bt',
  'plusnet',
  'broadband-genie',
  'uswitch',
]);

const PROVIDER_NAMES = [
  'TalkTalk',
  'Vodafone',
  'BT',
  'Plusnet',
  'Sky',
  'Virgin Media',
  'EE',
  'Hyperoptic',
  'Community Fibre',
];

const EMPTY_MONEY_FIELDS = {
  setupFee: null,
  installationFee: null,
  deliveryFee: null,
  routerFee: null,
  activationFee: null,
  voucherValue: null,
  rewardCardValue: null,
  cashbackValue: null,
  billCreditValue: null,
  freeMonthsDiscountValue: null,
  otherUpfrontCosts: null,
  otherDiscounts: null,
};

const CANDIDATE_COLUMNS = [
  'candidateId',
  'sourceId',
  'sourceName',
  'sourceType',
  'provider',
  'packageName',
  'sourceUrl',
  'advertisedMonthlyPrice',
  'effectiveMonthlyPrice',
  'sourceEffectiveMonthlyPrice',
  'contractLengthMonths',
  'annualAprilPriceRise',
  'firstAprilPrice',
  'secondAprilPrice',
  'setupFee',
  'installationFee',
  'deliveryFee',
  'routerFee',
  'activationFee',
  'voucherValue',
  'rewardCardValue',
  'cashbackValue',
  'billCreditValue',
  'freeMonthsDiscountValue',
  'otherUpfrontCosts',
  'otherDiscounts',
  'speedMbps',
  'speedTier',
  'totalMonthlyPayments',
  'totalFees',
  'totalRewardsAndDiscounts',
  'totalContractCostBeforeRewards',
  'totalContractCostAfterRewards',
  'sourceSnippet',
  'extractionQuality',
  'extractionConfidence',
  'requiresHumanReview',
  'availabilityScope',
  'publishStatus',
  'extractionWarnings',
  'extractedAt',
];

function normalizeWhitespace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function roundMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }

  return Number(Number(value).toFixed(2));
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slugify(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'candidate';
}

function createCandidateId({ sourceId, provider, packageName, sourceType }) {
  const sourceSlug = slugify(sourceId || provider || 'source');
  const providerSlug = slugify(provider || 'provider');
  const packageSlug = slugify(packageName || 'package');
  const sourceSuffix = sourceType === 'comparison-site' ? '' : '-provider-page';

  if (sourceSlug === providerSlug) {
    return `${providerSlug}-${packageSlug}${sourceSuffix}`;
  }

  return `${sourceSlug}-${providerSlug}-${packageSlug}${sourceSuffix}`;
}

function getSnippetText(snippet) {
  if (typeof snippet === 'string') {
    return normalizeWhitespace(snippet);
  }

  return normalizeWhitespace(snippet && (snippet.surroundingText || snippet.text || snippet.snippet || snippet.priceText));
}

function splitSnippetIntoCandidateBlocks(snippet, source) {
  const sourceSnippet = getSnippetText(snippet);
  if (!sourceSnippet || source.sourceId !== 'uswitch') {
    return [snippet];
  }

  const providerPattern = PROVIDER_NAMES.map(escapeRegex).join('|');
  const blockStartRegex = new RegExp(`\\b(?:${providerPattern})\\b(?=[^£]{0,120}(?:Full\\s+Fibre|Fibre|Gig1|Superfast|5G|Broadband|Mbps|£))`, 'gi');
  const starts = [];
  let match = blockStartRegex.exec(sourceSnippet);
  while (match) {
    starts.push(match.index);
    match = blockStartRegex.exec(sourceSnippet);
  }

  if (starts.length <= 1) {
    return [snippet];
  }

  return starts.map((start, index) => ({
    surroundingText: normalizeWhitespace(sourceSnippet.slice(start, starts[index + 1] || sourceSnippet.length)),
  }));
}

function extractProvider(source, sourceSnippet) {
  if (source.sourceType === 'provider-direct') {
    return source.name;
  }

  const providerMatch = PROVIDER_NAMES.find((providerName) => {
    const providerRegex = new RegExp(`\\b${escapeRegex(providerName)}\\b`, 'i');
    return providerRegex.test(sourceSnippet);
  });

  return providerMatch || null;
}

function extractSpeedMbps(sourceSnippet) {
  const packageSpeedMatch = sourceSnippet.match(/\b(?:Full\s+Fibre|Fibre|Broadband|Gigafast|Pro)\s+(\d{2,4})\b/i);
  if (packageSpeedMatch) {
    return Number(packageSpeedMatch[1]);
  }

  const speedMatch = sourceSnippet.match(/\b(\d{2,4})\s*(?:Mbps|Mb|Mbit\/s)\b/i);
  if (speedMatch) {
    return Number(speedMatch[1]);
  }

  const gbpsMatch = sourceSnippet.match(/\b(\d(?:\.\d+)?)\s*(?:Gbps|Gb)\b/i);
  if (gbpsMatch) {
    return Math.round(Number(gbpsMatch[1]) * 1000);
  }

  return null;
}

function extractPackageName(sourceSnippet, provider) {
  const providerPrefix = provider ? `(?:${escapeRegex(provider)}\\s+)?` : '';
  const packagePatterns = [
    new RegExp(`${providerPrefix}(Full\\s+Fibre\\s+deals)`, 'i'),
    new RegExp(`${providerPrefix}(Full\\s+Fibre\\s+\\d{2,4})`, 'i'),
    new RegExp(`${providerPrefix}(Fibre\\s+\\d{1,4})`, 'i'),
    new RegExp(`${providerPrefix}(Gigafast\\s+\\d{2,4})`, 'i'),
    new RegExp(`${providerPrefix}(Pro\\s+\\d{2,4})`, 'i'),
    /\b(Gig1\s+Fibre\s+broadband)\b/i,
    /\b(Superfast\s+Broadband)\b/i,
    /\b(5G\s+Broadband\s+\d{1,4})\b/i,
    /\b(Broadband\s+\d{2,4})\b/i,
  ];

  for (const pattern of packagePatterns) {
    const match = sourceSnippet.match(pattern);
    if (match) {
      return normalizeWhitespace(match[1])
        .replace(/\bfull\b/gi, 'Full')
        .replace(/\bfibre\b/gi, 'Fibre')
        .replace(/\bdeals\b/gi, 'deals')
        .replace(/\bbroadband\b/gi, 'Broadband')
        .replace(/\bsuperfast\b/gi, 'Superfast');
    }
  }

  const speedMbps = extractSpeedMbps(sourceSnippet);
  if (speedMbps && provider) {
    return `${provider} ${speedMbps} Mbps broadband`;
  }

  return null;
}

function extractContractLengthMonths(sourceSnippet) {
  const contractPatterns = [
    /\b(12|18|24|36)\s*-?\s*(?:month|months|mth|mths)\s*(?:contract|plan|minimum\s+term|term)\b/i,
    /\bon\s+a\s+(12|18|24|36)\s*-?\s*(?:month|months|mth|mths)\s+plan\b/i,
    /\bfor\s+(12|18|24|36)\s*-?\s*(?:month|months|mth|mths)\b/i,
  ];

  for (const pattern of contractPatterns) {
    const match = sourceSnippet.match(pattern);
    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

function textWindow(text, index, length, context = 60) {
  return text.slice(Math.max(0, index - context), Math.min(text.length, index + length + context));
}

function priceLooksLikeRewardOrFee(sourceSnippet, price) {
  const tightText = textWindow(sourceSnippet, price.index, price.text.length, 24).toLowerCase();
  if (/per\s+month|a\s+month|monthly|\/\s*month|pm\b|increase|increases|from\s+(?:april|march)|(?:1|31)(?:st)?\s+(?:april|march)/.test(tightText)) {
    return false;
  }

  const nearbyText = textWindow(sourceSnippet, price.index, price.text.length, 45).toLowerCase();
  if (/voucher|reward\s*card|cashback|gift\s*card|prepaid|mastercard|visa|bill\s*credit|account\s*credit/.test(nearbyText)) {
    return true;
  }

  return /setup|set\s*-?\s*up|activation|installation|delivery|router\s*(?:fee|delivery)|fee|upfront\s*cost/.test(tightText) && !/per\s+month|a\s+month|monthly|\/\s*month|pm\b/.test(tightText);
}

function extractAdvertisedMonthlyPrice(sourceSnippet) {
  const explicitMonthlyCost = /monthly\s+cost[^£]{0,40}(£\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2}|\s+\.\s*\d{1,2})?)/i.exec(sourceSnippet);
  if (explicitMonthlyCost) {
    return parsePoundPrice(explicitMonthlyCost[1]);
  }

  const prices = findPoundPrices(sourceSnippet);
  const monthlyPrice = prices.find((price) => {
    if (price.value === null || price.value > 200) {
      return false;
    }

    const nearbyText = textWindow(sourceSnippet, price.index, price.text.length).toLowerCase();
    return /per\s+month|a\s+month|monthly|\/\s*month|pm\b|month/.test(nearbyText);
  }) || prices.find((price) => price.value !== null && price.value <= 200 && !priceLooksLikeRewardOrFee(sourceSnippet, price));

  return monthlyPrice ? monthlyPrice.value : null;
}

function extractMonthlyPriceSequence(sourceSnippet) {
  return findPoundPrices(sourceSnippet)
    .filter((price) => price.value !== null && price.value <= 200 && !priceLooksLikeRewardOrFee(sourceSnippet, price))
    .map((price) => price.value);
}

function extractAnnualRiseFromText(sourceSnippet) {
  const explicitRisePatterns = [
    /(?:price|plan|monthly\s+plan|monthly\s+price)[^.]{0,90}(?:annually|annual|each|every)[^.]{0,60}by\s*(£\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2}|\s+\.\s*\d{1,2})?)/i,
    /(?:price|plan|monthly\s+plan|monthly\s+price)[^£]{0,80}(?:increase|increases|rise|rises|rising)[^£]{0,40}by\s*(£\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2}|\s+\.\s*\d{1,2})?)/i,
    /(?:increase|increases|rise|rises|rising|go(?:es)?\s+up|add(?:ed)?)[^£]{0,40}by\s*(£\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2}|\s+\.\s*\d{1,2})?)[^.]*(?:April|March|annually|annual|contract)/i,
    /(£\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2}|\s+\.\s*\d{1,2})?)[^.]*(?:increase|rise)[^.]*(?:each|every|annually|annual)[^.]*(?:April|March|contract)/i,
    /(£\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2}|\s+\.\s*\d{1,2})?)[^.]*(?:a\s+month\s*)?(?:each|every)\s*April/i,
  ];

  for (const pattern of explicitRisePatterns) {
    const match = sourceSnippet.match(pattern);
    if (match) {
      return parsePoundPrice(match[1]);
    }
  }

  return null;
}

function extractAprilPrices(sourceSnippet, advertisedMonthlyPrice) {
  const annualRiseFromText = extractAnnualRiseFromText(sourceSnippet);
  if (annualRiseFromText !== null) {
    return {
      annualAprilPriceRise: annualRiseFromText,
      firstAprilPrice: advertisedMonthlyPrice === null ? null : roundMoney(advertisedMonthlyPrice + annualRiseFromText),
      secondAprilPrice: advertisedMonthlyPrice === null ? null : roundMoney(advertisedMonthlyPrice + (annualRiseFromText * 2)),
      warning: null,
    };
  }

  const sequence = extractMonthlyPriceSequence(sourceSnippet);

  if (sequence.length >= 3) {
    const [basePrice, firstAprilPrice, secondAprilPrice] = sequence;
    const riseResult = deriveAnnualAprilPriceRise(basePrice, firstAprilPrice, secondAprilPrice);
    return {
      annualAprilPriceRise: riseResult.annualAprilPriceRise,
      firstAprilPrice,
      secondAprilPrice,
      warning: riseResult.warning,
    };
  }

  return {
    annualAprilPriceRise: null,
    firstAprilPrice: null,
    secondAprilPrice: null,
    warning: 'Could not extract annual April price rise wording or a three-price monthly sequence.',
  };
}

const POUND_PRICE_PATTERN = '£\\s*(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\s*\\.\\s*\\d{1,2})?';

function extractFee(sourceSnippet, feeLabelPattern) {
  if (new RegExp(`(?:no|free)\\s+(?:${feeLabelPattern})`, 'i').test(sourceSnippet)) {
    return 0;
  }

  const afterLabel = new RegExp(`(?:${feeLabelPattern})[^£.]{0,40}(${POUND_PRICE_PATTERN})`, 'i').exec(sourceSnippet);
  if (afterLabel) {
    return parsePoundPrice(afterLabel[1]);
  }

  const beforeLabel = new RegExp(`(${POUND_PRICE_PATTERN})[^£.]{0,40}(?:${feeLabelPattern})`, 'i').exec(sourceSnippet);
  if (beforeLabel) {
    return parsePoundPrice(beforeLabel[1]);
  }

  return null;
}

function extractDiscountsAndFees(sourceSnippet) {
  const values = { ...EMPTY_MONEY_FIELDS };
  values.setupFee = extractFee(sourceSnippet, 'set\\s*-?\\s*up\\s*(?:cost|fee)?|setup\\s*(?:cost|fee)?|upfront\\s*cost');
  values.installationFee = extractFee(sourceSnippet, 'installation|install');
  values.deliveryFee = extractFee(sourceSnippet, 'delivery');
  values.routerFee = extractFee(sourceSnippet, 'router\\s*(?:fee|delivery|postage|shipping)');
  values.activationFee = extractFee(sourceSnippet, 'activation');

  const prices = findPoundPrices(sourceSnippet);
  prices.forEach((price) => {
    if (price.value === null) {
      return;
    }

    const nearbyText = textWindow(sourceSnippet, price.index, price.text.length, 70).toLowerCase();
    const tightText = textWindow(sourceSnippet, price.index, price.text.length, 28).toLowerCase();
    const afterText = sourceSnippet.slice(price.index + price.text.length, price.index + price.text.length + 35).toLowerCase();
    if (/reward\s*card|prepaid\s*card|mastercard|visa/.test(afterText)) {
      values.rewardCardValue = Math.max(values.rewardCardValue || 0, price.value);
    } else if (/voucher|gift\s*card/.test(afterText)) {
      values.voucherValue = Math.max(values.voucherValue || 0, price.value);
    } else if (/cashback/.test(afterText)) {
      values.cashbackValue = Math.max(values.cashbackValue || 0, price.value);
    } else if (/bill\s*credit|account\s*credit|early\s*switch\s*credit|credit/.test(afterText)) {
      values.billCreditValue = Math.max(values.billCreditValue || 0, price.value);
    } else if (/reward\s*card|prepaid\s*card|mastercard|visa/.test(tightText)) {
      values.rewardCardValue = Math.max(values.rewardCardValue || 0, price.value);
    } else if (/voucher|gift\s*card/.test(tightText) && price.value < 150) {
      values.voucherValue = Math.max(values.voucherValue || 0, price.value);
    } else if (/cashback/.test(tightText)) {
      values.cashbackValue = Math.max(values.cashbackValue || 0, price.value);
    } else if (/bill\s*credit|account\s*credit|early\s*switch\s*credit|credit/.test(tightText)) {
      values.billCreditValue = Math.max(values.billCreditValue || 0, price.value);
    } else if (/reward\s*card|prepaid\s*card|mastercard|visa/.test(nearbyText)) {
      values.rewardCardValue = Math.max(values.rewardCardValue || 0, price.value);
    } else if (/voucher|gift\s*card/.test(nearbyText) && price.value < 150) {
      values.voucherValue = Math.max(values.voucherValue || 0, price.value);
    } else if (/cashback/.test(nearbyText)) {
      values.cashbackValue = Math.max(values.cashbackValue || 0, price.value);
    } else if (/bill\s*credit|account\s*credit|early\s*switch\s*credit|credit/.test(nearbyText)) {
      values.billCreditValue = Math.max(values.billCreditValue || 0, price.value);
    }
  });

  const freeMonthsMatch = sourceSnippet.match(/(\d+)\s+months?\s+free/i);
  if (freeMonthsMatch) {
    const advertisedMonthlyPrice = extractAdvertisedMonthlyPrice(sourceSnippet);
    if (advertisedMonthlyPrice !== null) {
      values.freeMonthsDiscountValue = roundMoney(Number(freeMonthsMatch[1]) * advertisedMonthlyPrice);
    }
  }

  return values;
}

function canCalculateReliablePrice(candidate) {
  return candidate.advertisedMonthlyPrice !== null &&
    candidate.contractLengthMonths !== null &&
    candidate.annualAprilPriceRise !== null;
}

function extractSourceEffectiveMonthlyPrice(sourceSnippet) {
  const match = /effective\s+monthly\s+cost[^£]{0,40}(£\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2}|\s+\.\s*\d{1,2})?)/i.exec(sourceSnippet);
  return match ? parsePoundPrice(match[1]) : null;
}

function getExtractionQuality(candidate) {
  if (!candidate.provider || !candidate.packageName || candidate.advertisedMonthlyPrice === null) {
    return 'discarded-noisy';
  }

  if (candidate.effectiveMonthlyPrice !== null && candidate.provider && candidate.packageName && candidate.advertisedMonthlyPrice !== null && candidate.contractLengthMonths !== null && candidate.annualAprilPriceRise !== null) {
    return 'usable-calculated';
  }

  if (candidate.sourceEffectiveMonthlyPrice !== null) {
    return 'usable-source-effective-only';
  }

  return 'review-only-missing-fields';
}

function addCalculatedFields(candidate, extractedAt) {
  if (!canCalculateReliablePrice(candidate)) {
    return {
      ...candidate,
      totalMonthlyPayments: null,
      totalFees: null,
      totalRewardsAndDiscounts: null,
      totalContractCostBeforeRewards: null,
      totalContractCostAfterRewards: null,
      effectiveMonthlyPrice: null,
    };
  }

  const calculatedPrice = calculateBroadbandPrice({
    ...candidate,
    contractStartDate: extractedAt.slice(0, 10),
  });

  return {
    ...candidate,
    totalMonthlyPayments: roundMoney(calculatedPrice.totalMonthlyPayments),
    totalFees: roundMoney(calculatedPrice.totalFees),
    totalRewardsAndDiscounts: roundMoney(calculatedPrice.totalRewardsAndDiscounts),
    totalContractCostBeforeRewards: roundMoney(calculatedPrice.totalContractCostBeforeRewards),
    totalContractCostAfterRewards: roundMoney(calculatedPrice.totalContractCostAfterRewards),
    effectiveMonthlyPrice: roundMoney(calculatedPrice.effectiveMonthlyPrice),
  };
}

function buildWarnings(candidate) {
  const warnings = [];
  if (!candidate.provider) warnings.push('Could not extract provider name.');
  if (!candidate.packageName) warnings.push('Could not extract package name.');
  if (candidate.advertisedMonthlyPrice === null) warnings.push('Could not extract advertised monthly price.');
  if (candidate.speedMbps === null) warnings.push('Could not extract speed in Mbps.');
  if (candidate.contractLengthMonths === null) warnings.push('Could not extract contract length.');
  if (candidate.annualAprilPriceRise === null) warnings.push('Could not extract annual April price rise.');
  if (candidate.setupFee === null) warnings.push('Could not extract setup fee.');
  return warnings;
}

function getExtractionConfidence(candidate) {
  if (candidate.advertisedMonthlyPrice === null || candidate.speedMbps === null || candidate.contractLengthMonths === null) {
    return 'low';
  }

  if (candidate.annualAprilPriceRise === null || candidate.setupFee === null || candidate.extractionWarnings.length > 0) {
    return 'medium';
  }

  return 'high';
}

function extractProviderCandidateFromSnippet(snippet, source, extractedAt = new Date().toISOString()) {
  const sourceSnippet = getSnippetText(snippet);
  if (!sourceSnippet) {
    return null;
  }

  const provider = extractProvider(source, sourceSnippet);
  const packageName = extractPackageName(sourceSnippet, provider);
  const speedMbps = extractSpeedMbps(sourceSnippet);
  const advertisedMonthlyPrice = extractAdvertisedMonthlyPrice(sourceSnippet);
  const contractLengthMonths = extractContractLengthMonths(sourceSnippet);
  const priceRise = extractAprilPrices(sourceSnippet, advertisedMonthlyPrice);
  const feesAndDiscounts = extractDiscountsAndFees(sourceSnippet);

  const availabilityScope = source.sourceType === 'comparison-site'
    ? 'comparison-page-not-postcode-checked'
    : 'provider-landing-page-not-postcode-checked';

  const baseCandidate = {
    candidateId: '',
    sourceId: source.sourceId,
    sourceName: source.name,
    sourceType: source.sourceType,
    provider,
    packageName,
    sourceUrl: source.finalUrl || source.candidateBroadbandUrl || source.sourceUrl || '',
    advertisedMonthlyPrice,
    effectiveMonthlyPrice: null,
    sourceEffectiveMonthlyPrice: extractSourceEffectiveMonthlyPrice(sourceSnippet),
    contractLengthMonths,
    annualAprilPriceRise: priceRise.annualAprilPriceRise,
    firstAprilPrice: priceRise.firstAprilPrice,
    secondAprilPrice: priceRise.secondAprilPrice,
    ...feesAndDiscounts,
    speedMbps,
    speedTier: speedMbps === null ? null : getSpeedTier(speedMbps),
    totalMonthlyPayments: null,
    totalFees: null,
    totalRewardsAndDiscounts: null,
    totalContractCostBeforeRewards: null,
    totalContractCostAfterRewards: null,
    sourceSnippet,
    extractionConfidence: 'low',
    requiresHumanReview: true,
    availabilityScope,
    publishStatus: 'candidate-review-only',
    extractionWarnings: [],
    extractedAt,
  };

  baseCandidate.extractionWarnings = buildWarnings(baseCandidate);
  if (priceRise.warning && baseCandidate.annualAprilPriceRise === null) {
    baseCandidate.extractionWarnings.push(priceRise.warning);
  }
  baseCandidate.extractionConfidence = getExtractionConfidence(baseCandidate);

  if (!baseCandidate.provider || !baseCandidate.packageName || baseCandidate.advertisedMonthlyPrice === null) {
    return null;
  }

  baseCandidate.candidateId = createCandidateId(baseCandidate);
  const calculatedCandidate = addCalculatedFields(baseCandidate, extractedAt);

  calculatedCandidate.extractionQuality = getExtractionQuality(calculatedCandidate);

  if (calculatedCandidate.effectiveMonthlyPrice === null) {
    calculatedCandidate.extractionConfidence = 'low';
    calculatedCandidate.extractionWarnings = [...new Set([
      ...calculatedCandidate.extractionWarnings,
      'Effective monthly price was not calculated because required pricing fields were missing.',
    ])];
  }

  calculatedCandidate.extractionQuality = getExtractionQuality(calculatedCandidate);
  return calculatedCandidate;
}

function buildProviderCandidates(snippetReport, extractedAt = new Date().toISOString()) {
  const warningMessages = [];
  const sourceSummary = [];
  const candidates = [];
  const seenIds = new Set();

  if (!Array.isArray(snippetReport)) {
    return {
      candidates: [],
      sourceSummary: [],
      warningMessages: ['Snippet report was not an array, so no provider candidates were created.'],
    };
  }

  snippetReport
    .filter((source) => TARGET_SOURCE_IDS.has(source.sourceId))
    .forEach((source) => {
      const snippets = Array.isArray(source.snippets) ? source.snippets : [];
      const sourceWarnings = Array.isArray(source.warningMessages) ? source.warningMessages : [];
      let candidatesCreated = 0;

      if (snippets.length === 0) {
        warningMessages.push(`${source.name} (${source.sourceId}) had no snippets available; no candidates were extracted.`);
      }

      sourceWarnings.forEach((warning) => {
        if (/403|security|captcha|blocked|not fetched|robots/i.test(warning)) {
          warningMessages.push(`${source.name} (${source.sourceId}): ${warning}`);
        }
      });

      snippets.forEach((snippet) => {
        splitSnippetIntoCandidateBlocks(snippet, source).forEach((candidateBlock) => {
          const candidate = extractProviderCandidateFromSnippet(candidateBlock, source, extractedAt);
          if (!candidate) {
            return;
          }

          if (seenIds.has(candidate.candidateId)) {
            return;
          }

          seenIds.add(candidate.candidateId);
          candidates.push(candidate);
          candidatesCreated += 1;
        });
      });

      sourceSummary.push({
        sourceId: source.sourceId,
        sourceName: source.name,
        sourceType: source.sourceType,
        snippetsAvailable: snippets.length,
        candidatesCreated,
        warningMessages: sourceWarnings,
      });
    });

  return {
    candidates,
    sourceSummary,
    warningMessages: [...new Set(warningMessages)],
  };
}

function readSnippetReport(inputPath = INPUT_PATH) {
  if (!fs.existsSync(inputPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(inputPath, 'utf8'));
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
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

function splitCandidatesByQuality(candidates) {
  const usableQualities = new Set(['usable-calculated', 'usable-source-effective-only']);
  return {
    usableCandidates: candidates.filter((candidate) => usableQualities.has(candidate.extractionQuality)),
    reviewOnlyCandidates: candidates.filter((candidate) => candidate.extractionQuality === 'review-only-missing-fields'),
    discardedCandidates: candidates.filter((candidate) => candidate.extractionQuality === 'discarded-noisy'),
  };
}

function candidateOutput(candidates, result, generatedAt) {
  return {
    candidates,
    sourceSummary: result.sourceSummary,
    warningMessages: result.warningMessages,
    generatedAt,
  };
}

function writeCsvFile(filePath, candidates) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const rows = [
    CANDIDATE_COLUMNS.join(','),
    ...candidates.map((candidate) => CANDIDATE_COLUMNS.map((column) => csvEscape(candidate[column])).join(',')),
  ];

  fs.writeFileSync(filePath, `${rows.join('\n')}\n`);
}

function extractProviderCandidates() {
  const extractedAt = new Date().toISOString();
  const snippetReport = readSnippetReport();
  const result = snippetReport === null
    ? {
      candidates: [],
      sourceSummary: [],
      warningMessages: ['exports/online-price-snippets.json was not found, so no provider candidates were created.'],
    }
    : buildProviderCandidates(snippetReport, extractedAt);

  const output = candidateOutput(result.candidates, result, extractedAt);
  const { usableCandidates, reviewOnlyCandidates, discardedCandidates } = splitCandidatesByQuality(output.candidates);

  writeJsonFile(JSON_OUTPUT_PATH, output);
  writeJsonFile(USABLE_OUTPUT_PATH, candidateOutput(usableCandidates, result, extractedAt));
  writeJsonFile(REVIEW_ONLY_OUTPUT_PATH, candidateOutput(reviewOnlyCandidates, result, extractedAt));
  writeJsonFile(DISCARDED_OUTPUT_PATH, candidateOutput(discardedCandidates, result, extractedAt));
  writeCsvFile(CSV_OUTPUT_PATH, output.candidates);

  return output;
}

function main() {
  const output = extractProviderCandidates();

  console.log('Provider deal candidate extraction complete');
  console.log('===========================================');
  console.log(`Candidates created: ${output.candidates.length}`);
  console.log(`JSON created: ${path.relative(__dirname, JSON_OUTPUT_PATH)}`);
  console.log(`CSV created: ${path.relative(__dirname, CSV_OUTPUT_PATH)}`);
  console.log(`Usable JSON created: ${path.relative(__dirname, USABLE_OUTPUT_PATH)}`);
  console.log(`Review-only JSON created: ${path.relative(__dirname, REVIEW_ONLY_OUTPUT_PATH)}`);
  console.log(`Discarded JSON created: ${path.relative(__dirname, DISCARDED_OUTPUT_PATH)}`);

  if (output.warningMessages.length > 0) {
    console.log('Warnings:');
    output.warningMessages.forEach((warning) => console.log(`- ${warning}`));
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildProviderCandidates,
  createCandidateId,
  extractAnnualRiseFromText,
  extractProviderCandidateFromSnippet,
  extractProviderCandidates,
  splitCandidatesByQuality,
  getSnippetText,
  splitSnippetIntoCandidateBlocks,
  slugify,
};
