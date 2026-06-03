// Conservative online price snippet discovery for human review.
//
// This is not final broadband deal ingestion. The script checks robots.txt
// before fetching enabled candidate source pages, does not bypass blocked or
// security-check pages, and writes nearby price-like snippets for review.

const fs = require('node:fs/promises');
const path = require('node:path');

const broadbandSources = require('./broadband-sources');
const { buildRobotsUrl, getPathAndSearch, isPathAllowedByRobots } = require('./check-source-access');

const USER_AGENT = 'UKBroadbandPriceTrackerBot/0.1';
const REQUEST_TIMEOUT_MS = 15000;
const DELAY_BETWEEN_REQUESTS_MS = 1000;
const MAX_SNIPPETS_PER_SOURCE = 50;
const REPORT_PATH = path.join(__dirname, 'exports', 'online-price-snippets.json');
const PRICE_REGEX = /£\s?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?/g;
const SPEED_REGEX = /\b(?:\d{1,4}\s?(?:Mbps|Mb|Mbit\/s|Gbps|Gb)|Gig\s?\d+)\b/gi;
const CONTRACT_REGEX = /\b\d{1,3}\s?months?\b/gi;
const REWARD_REGEX = /\b(?:reward(?:s)?|voucher(?:s)?|cashback|gift\s?card|prepaid\s?card|reward\s?card|bill\s?credit|account\s?credit|credit|Mastercard|Visa|Amazon)\b/gi;

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,text/plain;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    const text = await response.text();

    return {
      ok: true,
      statusCode: response.status,
      text,
      finalUrl: response.url,
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      text: '',
      finalUrl: url,
      errorMessage: error.name === 'AbortError'
        ? `Request timed out after ${REQUEST_TIMEOUT_MS}ms`
        : [error.message, error.cause && error.cause.message].filter(Boolean).join(': '),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function decodeBasicHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&pound;/gi, '£')
    .replace(/&#163;/gi, '£')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function extractPageTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  if (!titleMatch) {
    return '';
  }

  return normalizeWhitespace(decodeBasicHtmlEntities(titleMatch[1]));
}

function htmlToPlainText(html) {
  return normalizeWhitespace(decodeBasicHtmlEntities(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')));
}

function extractUniqueMatches(text, regex, limit = 5) {
  const matches = [];
  const seen = new Set();
  const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  let match = globalRegex.exec(text);

  while (match && matches.length < limit) {
    const value = normalizeWhitespace(match[0]);
    const key = value.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      matches.push(value);
    }

    match = globalRegex.exec(text);
  }

  return matches;
}

function findPriceLikeText(text) {
  return extractUniqueMatches(text, PRICE_REGEX, 200);
}

function findSpeedLikeText(text) {
  return extractUniqueMatches(text, SPEED_REGEX);
}

function findContractLikeText(text) {
  return extractUniqueMatches(text, CONTRACT_REGEX);
}

function findRewardLikeText(text) {
  return extractUniqueMatches(text, REWARD_REGEX);
}

function getSurroundingText(text, matchIndex, matchLength, contextCharacters = 180) {
  const start = Math.max(0, matchIndex - contextCharacters);
  const end = Math.min(text.length, matchIndex + matchLength + contextCharacters);
  return normalizeWhitespace(text.slice(start, end));
}

function extractPriceSnippetsFromText(text, maxSnippets = MAX_SNIPPETS_PER_SOURCE) {
  const snippets = [];
  const seenSnippetKeys = new Set();
  let match = PRICE_REGEX.exec(text);

  while (match && snippets.length < maxSnippets) {
    const priceText = normalizeWhitespace(match[0]);
    const surroundingText = getSurroundingText(text, match.index, match[0].length);
    const key = `${priceText}|${surroundingText}`.toLowerCase();

    if (!seenSnippetKeys.has(key)) {
      seenSnippetKeys.add(key);
      snippets.push({
        priceText,
        surroundingText,
        possibleSpeedText: findSpeedLikeText(surroundingText),
        possibleContractText: findContractLikeText(surroundingText),
        possibleRewardText: findRewardLikeText(surroundingText),
      });
    }

    match = PRICE_REGEX.exec(text);
  }

  PRICE_REGEX.lastIndex = 0;

  return snippets;
}

function isLikelySecurityCheckPage(html, pageTitle) {
  const combinedText = `${pageTitle} ${htmlToPlainText(html).slice(0, 3000)}`.toLowerCase();

  return [
    'captcha',
    'security check',
    'checking your browser',
    'verify you are human',
    'access denied',
    'blocked',
    'cloudflare',
    'perimeterx',
    'datadome',
  ].some((marker) => combinedText.includes(marker));
}

function createBaseSourceResult(source, checkedAt) {
  return {
    sourceId: source.sourceId,
    name: source.name,
    sourceType: source.sourceType,
    candidateBroadbandUrl: source.candidateBroadbandUrl,
    robotsAllowed: 'unknown',
    pageFetched: false,
    pageStatusCode: null,
    pageTitle: '',
    snippetsFound: 0,
    snippets: [],
    warningMessages: [],
    checkedAt,
  };
}

async function extractSourceSnippets(source) {
  const result = createBaseSourceResult(source, new Date().toISOString());
  const robotsUrl = buildRobotsUrl(source.baseUrl);
  const candidatePath = getPathAndSearch(source.candidateBroadbandUrl);

  const robotsResult = await fetchText(robotsUrl);

  if (!robotsResult.ok) {
    result.warningMessages.push(`Could not fetch robots.txt: ${robotsResult.errorMessage}`);
    result.warningMessages.push('Candidate page was not fetched because robots.txt access was unclear.');
    return result;
  }

  if (robotsResult.statusCode < 200 || robotsResult.statusCode >= 300) {
    result.warningMessages.push(`robots.txt returned HTTP ${robotsResult.statusCode}; candidate page permission treated as unknown.`);
    result.warningMessages.push('Candidate page was not fetched because robots.txt access was unclear.');
    return result;
  }

  result.robotsAllowed = isPathAllowedByRobots(robotsResult.text, candidatePath, USER_AGENT);

  if (result.robotsAllowed !== true) {
    result.warningMessages.push('Candidate page appears disallowed by robots.txt and was not fetched.');
    return result;
  }

  await sleep(DELAY_BETWEEN_REQUESTS_MS);

  const pageResult = await fetchText(source.candidateBroadbandUrl);
  result.pageFetched = pageResult.ok;
  result.pageStatusCode = pageResult.statusCode;

  if (!pageResult.ok) {
    result.warningMessages.push(`Could not fetch candidate page: ${pageResult.errorMessage}`);
    return result;
  }

  if (pageResult.statusCode === 403) {
    result.warningMessages.push('Candidate page returned HTTP 403 and was not retried or bypassed.');
    return result;
  }

  if (pageResult.statusCode < 200 || pageResult.statusCode >= 300) {
    result.warningMessages.push(`Candidate page returned HTTP ${pageResult.statusCode}; snippets were not extracted.`);
    return result;
  }

  result.pageTitle = extractPageTitle(pageResult.text);

  if (isLikelySecurityCheckPage(pageResult.text, result.pageTitle)) {
    result.warningMessages.push('Candidate page appears to be a security-check or anti-bot page; snippets were not extracted.');
    return result;
  }

  const plainText = htmlToPlainText(pageResult.text);
  result.snippets = extractPriceSnippetsFromText(plainText, MAX_SNIPPETS_PER_SOURCE);
  result.snippetsFound = result.snippets.length;

  if (result.snippetsFound === 0) {
    result.warningMessages.push('No simple pound price-like snippets were detected on the fetched page.');
  }

  return result;
}

async function runPriceSnippetExtraction() {
  const enabledSources = broadbandSources.filter((source) => source.enabled);
  const results = [];

  for (let index = 0; index < enabledSources.length; index += 1) {
    const source = enabledSources[index];
    console.log(`Extracting price snippets for ${source.name} (${source.sourceId})...`);

    try {
      results.push(await extractSourceSnippets(source));
    } catch (error) {
      const fallbackResult = createBaseSourceResult(source, new Date().toISOString());
      fallbackResult.warningMessages.push(`Unexpected snippet extraction error: ${error.message}`);
      results.push(fallbackResult);
    }

    if (index < enabledSources.length - 1) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(results, null, 2)}\n`);

  console.log(`Wrote ${results.length} online price snippet rows to ${path.relative(__dirname, REPORT_PATH)}`);

  return results;
}

if (require.main === module) {
  runPriceSnippetExtraction().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  CONTRACT_REGEX,
  PRICE_REGEX,
  REWARD_REGEX,
  SPEED_REGEX,
  extractPageTitle,
  extractPriceSnippetsFromText,
  findContractLikeText,
  findPriceLikeText,
  findRewardLikeText,
  findSpeedLikeText,
  htmlToPlainText,
  runPriceSnippetExtraction,
};
