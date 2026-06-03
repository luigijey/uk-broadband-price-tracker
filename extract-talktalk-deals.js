// Structured TalkTalk provider deal candidate extraction.
//
// This is a candidate extraction prototype only. It reads the conservative
// online snippet discovery report and creates human-review-only provider deal
// candidates. It does not publish these candidates to the static website.

const fs = require('node:fs');
const path = require('node:path');

const { calculateBroadbandPrice } = require('./pricing-calculator');

const TALKTALK_SOURCE_ID = 'talktalk';
const INPUT_PATH = path.join(__dirname, 'exports', 'online-price-snippets.json');
const TALKTALK_OUTPUT_PATH = path.join(__dirname, 'exports', 'talktalk-deal-candidates.json');
const COMBINED_OUTPUT_PATH = path.join(__dirname, 'exports', 'provider-deal-candidates.json');

const TARGET_PACKAGES = [
  { packageName: 'Full Fibre 900', speedMbps: 900 },
  { packageName: 'Full Fibre 500', speedMbps: 500 },
  { packageName: 'Full Fibre 150', speedMbps: 150 },
  { packageName: 'Fibre 65', speedMbps: 65 },
  { packageName: 'Fibre 35', speedMbps: 35 },
];

function normalizeWhitespace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function roundMoney(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(Number(value).toFixed(2));
}

function parsePoundPrice(priceText) {
  if (!priceText) {
    return null;
  }

  const cleaned = String(priceText)
    .replace(/,/g, '')
    .replace(/£/g, '')
    .replace(/\s+/g, '')
    .replace(/\s*\.\s*/g, '.');
  const numericText = cleaned.replace(/[^0-9.]/g, '');
  if (numericText === '') {
    return null;
  }

  return roundMoney(Number(numericText));
}

function findPoundPrices(text) {
  const priceRegex = /£\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2}|\s+\.\s*\d{1,2})?/g;
  const prices = [];
  let match = priceRegex.exec(text);

  while (match) {
    prices.push({
      value: parsePoundPrice(match[0]),
      text: match[0],
      index: match.index,
    });

    match = priceRegex.exec(text);
  }

  return prices;
}

function findPackageDefinition(text) {
  return TARGET_PACKAGES.find((packageDefinition) => {
    const packageRegex = new RegExp(`\\b${escapeRegex(packageDefinition.packageName)}\\b`, 'i');
    return packageRegex.test(text);
  }) || null;
}

function getSpeedTier(speedMbps) {
  if (speedMbps >= 900) {
    return '900 Mbps+';
  }

  if (speedMbps >= 500) {
    return '500-900 Mbps';
  }

  if (speedMbps >= 100) {
    return '100-300 Mbps';
  }

  if (speedMbps >= 35) {
    return '35-75 Mbps';
  }

  return 'Under 35 Mbps';
}

function deriveAnnualAprilPriceRise(advertisedMonthlyPrice, firstAprilPrice, secondAprilPrice) {
  if (
    advertisedMonthlyPrice === null || advertisedMonthlyPrice === undefined ||
    firstAprilPrice === null || firstAprilPrice === undefined ||
    secondAprilPrice === null || secondAprilPrice === undefined
  ) {
    return {
      annualAprilPriceRise: null,
      warning: 'Could not derive annual April price rise because three monthly prices were not found.',
    };
  }

  const firstDifference = roundMoney(firstAprilPrice - advertisedMonthlyPrice);
  const secondDifference = roundMoney(secondAprilPrice - firstAprilPrice);

  if (firstDifference === secondDifference) {
    return {
      annualAprilPriceRise: firstDifference,
      warning: null,
    };
  }

  return {
    annualAprilPriceRise: null,
    warning: `Could not derive a consistent annual April price rise: first rise was £${firstDifference}, second rise was £${secondDifference}.`,
  };
}

function getSnippetText(snippet) {
  if (typeof snippet === 'string') {
    return normalizeWhitespace(snippet);
  }

  return normalizeWhitespace(snippet && (snippet.surroundingText || snippet.text || snippet.snippet || snippet.priceText));
}

function extractPricesForPackage(snippetText, packageName) {
  const packageRegex = new RegExp(`\\b${escapeRegex(packageName)}\\b`, 'i');
  const packageMatch = packageRegex.exec(snippetText);
  const prices = findPoundPrices(snippetText);

  if (!packageMatch) {
    return [];
  }

  const packageIndex = packageMatch.index;
  const pricesAfterPackage = prices.filter((price) => price.index >= packageIndex);

  if (pricesAfterPackage.length > 0) {
    return pricesAfterPackage;
  }

  return prices;
}

function extractTalkTalkDealFromSnippet(snippet, source, extractedAt = new Date().toISOString(), targetPackageName = null) {
  const sourceSnippet = getSnippetText(snippet);
  const extractionWarnings = [];

  if (!sourceSnippet) {
    return null;
  }

  const packageDefinition = targetPackageName
    ? TARGET_PACKAGES.find((targetPackage) => targetPackage.packageName === targetPackageName)
    : findPackageDefinition(sourceSnippet);

  if (!packageDefinition) {
    return null;
  }

  const packageRegex = new RegExp(`\\b${escapeRegex(packageDefinition.packageName)}\\b`, 'i');
  if (!packageRegex.test(sourceSnippet)) {
    return null;
  }

  const packagePrices = extractPricesForPackage(sourceSnippet, packageDefinition.packageName);
  const advertisedMonthlyPrice = packagePrices[0] ? packagePrices[0].value : null;
  const firstAprilPrice = packagePrices[1] ? packagePrices[1].value : null;
  const secondAprilPrice = packagePrices[2] ? packagePrices[2].value : null;

  if (advertisedMonthlyPrice === null) {
    extractionWarnings.push('Could not extract an advertised monthly price for the package.');
  }

  const contractLengthMonths = /\b24\s*month\s*contract\b/i.test(sourceSnippet) ? 24 : null;
  if (contractLengthMonths === null) {
    extractionWarnings.push('Could not confirm 24 month contract wording.');
  }

  const setupFee = /\bno\s+set\s*up\s+fees?\b/i.test(sourceSnippet) || /\bno\s+setup\s+fees?\b/i.test(sourceSnippet)
    ? 0
    : null;
  if (setupFee === null) {
    extractionWarnings.push('Could not confirm no setup fee wording.');
  }

  const priceRiseResult = deriveAnnualAprilPriceRise(advertisedMonthlyPrice, firstAprilPrice, secondAprilPrice);
  if (priceRiseResult.warning) {
    extractionWarnings.push(priceRiseResult.warning);
  }

  const dealForCalculator = {
    advertisedMonthlyPrice,
    contractLengthMonths: contractLengthMonths || 1,
    annualAprilPriceRise: priceRiseResult.annualAprilPriceRise,
    setupFee,
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
    contractStartDate: extractedAt.slice(0, 10),
  };

  const calculatedPrice = calculateBroadbandPrice(dealForCalculator);

  let extractionConfidence = 'high';
  if (extractionWarnings.length > 0) {
    extractionConfidence = advertisedMonthlyPrice === null || contractLengthMonths === null ? 'low' : 'medium';
  }

  return {
    sourceId: source.sourceId || TALKTALK_SOURCE_ID,
    sourceName: source.name || 'TalkTalk',
    provider: 'TalkTalk',
    packageName: packageDefinition.packageName,
    sourceUrl: source.candidateBroadbandUrl || source.sourceUrl || '',
    advertisedMonthlyPrice,
    contractLengthMonths,
    annualAprilPriceRise: priceRiseResult.annualAprilPriceRise,
    firstAprilPrice,
    secondAprilPrice,
    setupFee,
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
    speedMbps: packageDefinition.speedMbps,
    speedTier: getSpeedTier(packageDefinition.speedMbps),
    sourceSnippet,
    extractionConfidence,
    requiresHumanReview: true,
    extractionWarnings,
    extractedAt,
    availabilityScope: 'provider-landing-page-not-postcode-checked',
    publishStatus: 'candidate-review-only',
    totalMonthlyPayments: roundMoney(calculatedPrice.totalMonthlyPayments),
    totalFees: roundMoney(calculatedPrice.totalFees),
    totalRewardsAndDiscounts: roundMoney(calculatedPrice.totalRewardsAndDiscounts),
    totalContractCostBeforeRewards: roundMoney(calculatedPrice.totalContractCostBeforeRewards),
    totalContractCostAfterRewards: roundMoney(calculatedPrice.totalContractCostAfterRewards),
    effectiveMonthlyPrice: roundMoney(calculatedPrice.effectiveMonthlyPrice),
  };
}

function buildTalkTalkCandidates(snippetReport, extractedAt = new Date().toISOString()) {
  const warningMessages = [];

  if (!Array.isArray(snippetReport)) {
    return {
      candidates: [],
      warningMessages: ['Snippet report was not an array, so no TalkTalk candidates were created.'],
    };
  }

  const talkTalkSource = snippetReport.find((source) => source.sourceId === TALKTALK_SOURCE_ID);

  if (!talkTalkSource) {
    return {
      candidates: [],
      warningMessages: ['No TalkTalk source result with sourceId "talktalk" was found in exports/online-price-snippets.json.'],
    };
  }

  const snippets = Array.isArray(talkTalkSource.snippets) ? talkTalkSource.snippets : [];

  if (snippets.length === 0) {
    return {
      candidates: [],
      warningMessages: [
        'TalkTalk source result was found, but it did not contain any snippets to inspect.',
        ...(talkTalkSource.warningMessages || []),
      ],
    };
  }

  const candidates = [];
  const seenPackages = new Set();

  snippets.forEach((snippet) => {
    const snippetText = getSnippetText(snippet);

    if (/\bfast\s+broadband\b/i.test(snippetText)) {
      warningMessages.push('Skipped Fast Broadband because it is not part of the first reliable TalkTalk target package set.');
    }

    if (/\btalktalk\s+u\b/i.test(snippetText)) {
      warningMessages.push('Skipped TalkTalk U because it is not part of the first reliable TalkTalk target package set.');
    }

    TARGET_PACKAGES.forEach((targetPackage) => {
      const packageRegex = new RegExp(`\\b${escapeRegex(targetPackage.packageName)}\\b`, 'i');
      if (!packageRegex.test(snippetText) || seenPackages.has(targetPackage.packageName)) {
        return;
      }

      const deal = extractTalkTalkDealFromSnippet(snippet, talkTalkSource, extractedAt, targetPackage.packageName);
      if (!deal) {
        return;
      }

      seenPackages.add(deal.packageName);
      candidates.push(deal);
    });
  });

  if (candidates.length === 0) {
    warningMessages.push('No clearly named target TalkTalk package snippets were found, so no candidates were created.');
  }

  return {
    candidates,
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

function writeCandidateFiles(result, extractedAt = new Date().toISOString()) {
  const talkTalkOutput = {
    sourceId: TALKTALK_SOURCE_ID,
    sourceName: 'TalkTalk',
    generatedAt: extractedAt,
    candidates: result.candidates,
    warningMessages: result.warningMessages,
  };

  const combinedOutput = {
    generatedAt: extractedAt,
    providers: [
      {
        sourceId: TALKTALK_SOURCE_ID,
        sourceName: 'TalkTalk',
        candidates: result.candidates,
        warningMessages: result.warningMessages,
      },
    ],
    candidates: result.candidates,
    warningMessages: result.warningMessages,
  };

  writeJsonFile(TALKTALK_OUTPUT_PATH, talkTalkOutput);
  writeJsonFile(COMBINED_OUTPUT_PATH, combinedOutput);

  return {
    talkTalkOutput,
    combinedOutput,
  };
}

function extractTalkTalkDeals() {
  const extractedAt = new Date().toISOString();
  const snippetReport = readSnippetReport();
  const result = snippetReport === null
    ? {
      candidates: [],
      warningMessages: ['exports/online-price-snippets.json was not found, so no TalkTalk candidates were created.'],
    }
    : buildTalkTalkCandidates(snippetReport, extractedAt);

  writeCandidateFiles(result, extractedAt);

  return result;
}

function main() {
  const result = extractTalkTalkDeals();

  console.log('TalkTalk structured deal candidate extraction complete');
  console.log('=======================================================');
  console.log(`Candidates created: ${result.candidates.length}`);
  console.log('Files created:');
  console.log(`- ${path.relative(__dirname, TALKTALK_OUTPUT_PATH)}`);
  console.log(`- ${path.relative(__dirname, COMBINED_OUTPUT_PATH)}`);

  if (result.warningMessages.length > 0) {
    console.log('Warnings:');
    result.warningMessages.forEach((warning) => {
      console.log(`- ${warning}`);
    });
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildTalkTalkCandidates,
  deriveAnnualAprilPriceRise,
  extractPricesForPackage,
  extractTalkTalkDealFromSnippet,
  extractTalkTalkDeals,
  findPackageDefinition,
  findPoundPrices,
  getSpeedTier,
  parsePoundPrice,
};
