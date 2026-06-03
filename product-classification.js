// Shared active product classification helpers.
// These categories intentionally separate landline/calls variants and 5G home
// broadband while keeping the legacy productType value for existing consumers.

const CONNECTION_TECHNOLOGIES = new Set([
  'fixed-line-broadband',
  '5g-home-broadband',
  'mobile-broadband',
  'unknown',
]);

const SERVICE_CATEGORIES = new Set([
  'broadband-only',
  'broadband-with-landline',
  'broadband-with-landline-and-calls',
  'broadband-tv-bundle',
  'broadband-mobile-bundle',
  'unknown',
]);

const LANDLINE_STATUSES = new Set([
  'not-included',
  'included',
  'optional',
  'unknown',
]);

const CALLS_PACKAGE_STATUSES = new Set([
  'not-included',
  'pay-as-you-talk',
  'included',
  'optional',
  'unknown',
]);

const HOMEPAGE_CATEGORIES = new Set([
  'Fixed broadband',
  'Fixed broadband with landline',
  'Fixed broadband with calls',
  '5G home broadband',
  'Bundles and review-only',
  'Unknown review-only',
]);

const HOMEPAGE_VISIBLE_CATEGORIES = new Set([
  'Fixed broadband',
  'Fixed broadband with landline',
  'Fixed broadband with calls',
  '5G home broadband',
]);

function normalizeForMatching(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function candidateText(candidate) {
  return `${candidate.packageName || ''} ${candidate.sourceSnippet || ''}`;
}

function hasBroadbandTerm(text) {
  const normalizedText = normalizeForMatching(text);
  return /\b(broadband|fibre|fiber|full\s+fibre|gig1|superfast|ultrafast|m\d{2,4})\b/i.test(text) ||
    /\b(full\s+fibre|fibre\s+broadband|fiber\s+broadband)\b/.test(normalizedText);
}

function hasFiveGHomeBroadbandTerm(text) {
  const normalizedText = normalizeForMatching(text);
  return /\b5g\s+(home\s+)?broadband\b/.test(normalizedText) ||
    /\b(vodafone|three)\s+5g\s+broadband\b/.test(normalizedText) ||
    /\bmobile\s+network\s+home\s+broadband\b/.test(normalizedText);
}

function hasTvBundleTerm(text) {
  return /\b(tv|sport|sports|cinema|netflix|hbo\s+max|channels?)\b/i.test(text) ||
    /\bsky\s+(sports?|cinema)\b/i.test(text) ||
    /\bapple\s+tv\b/i.test(text);
}

function hasMobileBundleTerm(text) {
  const normalizedText = normalizeForMatching(text);
  return /\b(sim|mobile)\b/i.test(text) && !/\bmobile\s+network\s+home\s+broadband\b/.test(normalizedText);
}

function hasLandlineIncludedTerm(text) {
  const normalizedText = normalizeForMatching(text);
  return /\blandline\s+included\b/.test(normalizedText) ||
    /\bline\s+rental\s+included\b/.test(normalizedText) ||
    /\bhome\s+phone\s+included\b/.test(normalizedText) ||
    /\bbroadband\s+and\s+phone\b/.test(normalizedText) ||
    /\bincludes\s+line\s+rental\b/.test(normalizedText) ||
    /\bphone\s+line\s+included\b/.test(normalizedText);
}

function hasCallsIncludedTerm(text) {
  const normalizedText = normalizeForMatching(text);
  return /\bcalls\s+included\b/.test(normalizedText) ||
    /\banytime\s+calls\b/.test(normalizedText) ||
    /\bweekend\s+calls\b/.test(normalizedText) ||
    /\bevening\s+and\s+weekend\s+calls\b/.test(normalizedText) ||
    /\bcall\s+plan\s+included\b/.test(normalizedText) ||
    /\btalk\s+plan\s+included\b/.test(normalizedText) ||
    /\bpay\s+as\s+you\s+talk\b/.test(normalizedText);
}

function hasPayAsYouTalkTerm(text) {
  return /\bpay\s+as\s+you\s+talk\b/.test(normalizeForMatching(text));
}

function classifyProductModel(candidate) {
  const text = candidateText(candidate);
  const broadbandLike = hasBroadbandTerm(text) || hasFiveGHomeBroadbandTerm(text);
  const tvBundle = hasTvBundleTerm(text);
  const mobileBundle = hasMobileBundleTerm(text);
  const fiveGHomeBroadband = hasFiveGHomeBroadbandTerm(text);
  const callsIncluded = hasCallsIncludedTerm(text);
  const landlineIncluded = hasLandlineIncludedTerm(text) || callsIncluded;

  let connectionTechnology = 'unknown';
  if (fiveGHomeBroadband) {
    connectionTechnology = '5g-home-broadband';
  } else if (broadbandLike) {
    connectionTechnology = 'fixed-line-broadband';
  } else if (/\b(mobile\s+broadband|mifi|4g)\b/i.test(text)) {
    connectionTechnology = 'mobile-broadband';
  }

  let serviceCategory = 'unknown';
  if (tvBundle) {
    serviceCategory = 'broadband-tv-bundle';
  } else if (mobileBundle) {
    serviceCategory = 'broadband-mobile-bundle';
  } else if (callsIncluded) {
    serviceCategory = 'broadband-with-landline-and-calls';
  } else if (landlineIncluded) {
    serviceCategory = 'broadband-with-landline';
  } else if (broadbandLike) {
    serviceCategory = 'broadband-only';
  }

  const landlineStatus = landlineIncluded ? 'included' : (broadbandLike ? 'not-included' : 'unknown');
  let callsPackageStatus = broadbandLike ? 'not-included' : 'unknown';
  if (callsIncluded) {
    callsPackageStatus = hasPayAsYouTalkTerm(text) ? 'pay-as-you-talk' : 'included';
  }

  let homepageCategory = 'Unknown review-only';
  if (serviceCategory === 'broadband-tv-bundle' || serviceCategory === 'broadband-mobile-bundle') {
    homepageCategory = 'Bundles and review-only';
  } else if (connectionTechnology === '5g-home-broadband') {
    homepageCategory = '5G home broadband';
  } else if (serviceCategory === 'broadband-with-landline-and-calls') {
    homepageCategory = 'Fixed broadband with calls';
  } else if (serviceCategory === 'broadband-with-landline') {
    homepageCategory = 'Fixed broadband with landline';
  } else if (connectionTechnology === 'fixed-line-broadband' && serviceCategory === 'broadband-only') {
    homepageCategory = 'Fixed broadband';
  }

  // Legacy field kept for existing consumers. Landline/calls variants remain a
  // phone bundle in the legacy taxonomy, while 5G home broadband is separated
  // by connectionTechnology/homepageCategory.
  let productType = serviceCategory;
  if (serviceCategory === 'broadband-with-landline' || serviceCategory === 'broadband-with-landline-and-calls') {
    productType = 'broadband-phone-bundle';
  }

  return {
    connectionTechnology,
    serviceCategory,
    landlineStatus,
    callsPackageStatus,
    homepageCategory,
    productType,
  };
}

function isHomepageVisibleCategory(homepageCategory) {
  return HOMEPAGE_VISIBLE_CATEGORIES.has(homepageCategory);
}

module.exports = {
  CALLS_PACKAGE_STATUSES,
  CONNECTION_TECHNOLOGIES,
  HOMEPAGE_CATEGORIES,
  HOMEPAGE_VISIBLE_CATEGORIES,
  LANDLINE_STATUSES,
  SERVICE_CATEGORIES,
  classifyProductModel,
  hasFiveGHomeBroadbandTerm,
  isHomepageVisibleCategory,
  normalizeForMatching,
};
