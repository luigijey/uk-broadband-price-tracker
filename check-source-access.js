// Beginner-friendly online source access checks.
//
// This script is deliberately conservative. It checks robots.txt before
// fetching a candidate broadband page, uses a clear user agent, waits between
// sources, and records blocked or unclear sources instead of crashing.

const fs = require('node:fs/promises');
const path = require('node:path');

const broadbandSources = require('./broadband-sources');

const USER_AGENT = 'UKBroadbandPriceTrackerBot/0.1';
const REQUEST_TIMEOUT_MS = 15000;
const DELAY_BETWEEN_SOURCES_MS = 1000;
const REPORT_PATH = path.join(__dirname, 'exports', 'source-access-report.json');

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function buildRobotsUrl(baseUrl) {
  const url = new URL(baseUrl);
  return `${url.origin}/robots.txt`;
}

function getPathAndSearch(url) {
  const parsedUrl = new URL(url);
  return `${parsedUrl.pathname}${parsedUrl.search}` || '/';
}

function patternMatchesUserAgent(pattern, userAgent) {
  const normalizedPattern = pattern.trim().toLowerCase();
  const normalizedUserAgent = userAgent.trim().toLowerCase();

  return normalizedPattern === '*' || normalizedUserAgent.includes(normalizedPattern);
}

function parseRobotsTxt(robotsTxt) {
  const groups = [];
  let currentGroup = null;

  robotsTxt.split(/\r?\n/).forEach((rawLine) => {
    const lineWithoutComment = rawLine.split('#')[0].trim();

    if (lineWithoutComment === '') {
      currentGroup = null;
      return;
    }

    const separatorIndex = lineWithoutComment.indexOf(':');
    if (separatorIndex === -1) {
      return;
    }

    const fieldName = lineWithoutComment.slice(0, separatorIndex).trim().toLowerCase();
    const fieldValue = lineWithoutComment.slice(separatorIndex + 1).trim();

    if (fieldName === 'user-agent') {
      if (!currentGroup || currentGroup.rules.length > 0) {
        currentGroup = { userAgents: [], rules: [] };
        groups.push(currentGroup);
      }

      currentGroup.userAgents.push(fieldValue);
      return;
    }

    if ((fieldName === 'allow' || fieldName === 'disallow') && currentGroup) {
      currentGroup.rules.push({ type: fieldName, path: fieldValue });
    }
  });

  return groups;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function robotsRuleMatchesPath(rulePath, candidatePath) {
  if (rulePath.includes('*') || rulePath.endsWith('$')) {
    const endsAtPathEnd = rulePath.endsWith('$');
    const pathWithoutEndMarker = endsAtPathEnd ? rulePath.slice(0, -1) : rulePath;
    const regexPattern = `^${pathWithoutEndMarker.split('*').map(escapeRegExp).join('.*')}${endsAtPathEnd ? '$' : ''}`;

    return new RegExp(regexPattern).test(candidatePath);
  }

  return candidatePath.startsWith(rulePath);
}

function isPathAllowedByRobots(robotsTxt, candidatePath, userAgent = USER_AGENT) {
  const groups = parseRobotsTxt(robotsTxt);
  const matchingRules = [];

  groups.forEach((group) => {
    const userAgentMatches = group.userAgents.some((pattern) => patternMatchesUserAgent(pattern, userAgent));

    if (userAgentMatches) {
      matchingRules.push(...group.rules);
    }
  });

  if (matchingRules.length === 0) {
    return true;
  }

  let strongestRule = null;

  matchingRules.forEach((rule) => {
    // An empty Disallow line means nothing is disallowed for that group.
    if (rule.type === 'disallow' && rule.path === '') {
      return;
    }

    if (!robotsRuleMatchesPath(rule.path, candidatePath)) {
      return;
    }

    if (!strongestRule || rule.path.length > strongestRule.path.length) {
      strongestRule = rule;
      return;
    }

    if (strongestRule && rule.path.length === strongestRule.path.length && rule.type === 'allow') {
      strongestRule = rule;
    }
  });

  if (!strongestRule) {
    return true;
  }

  return strongestRule.type === 'allow';
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

function extractPageTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  if (!titleMatch) {
    return '';
  }

  return titleMatch[1]
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function countDetectedPriceText(text) {
  const matches = text.match(/£\s?\d+(?:\.\d{2})?/g);
  return matches ? matches.length : 0;
}

async function checkSource(source) {
  const warningMessages = [];
  const robotsUrl = buildRobotsUrl(source.baseUrl);
  const checkedAt = new Date().toISOString();

  const reportRow = {
    sourceId: source.sourceId,
    name: source.name,
    sourceType: source.sourceType,
    baseUrl: source.baseUrl,
    candidateBroadbandUrl: source.candidateBroadbandUrl,
    robotsUrl,
    robotsFetched: false,
    robotsStatusCode: null,
    candidatePathAllowed: 'unknown',
    pageFetched: false,
    pageStatusCode: null,
    pageTitle: '',
    detectedPriceTextCount: 0,
    warningMessages,
    checkedAt,
  };

  const robotsResult = await fetchText(robotsUrl);
  reportRow.robotsFetched = robotsResult.ok;
  reportRow.robotsStatusCode = robotsResult.statusCode;

  if (!robotsResult.ok) {
    warningMessages.push(`Could not fetch robots.txt: ${robotsResult.errorMessage}`);
    warningMessages.push('Candidate page was not fetched because robots.txt access was unclear.');
    return reportRow;
  }

  if (robotsResult.statusCode < 200 || robotsResult.statusCode >= 300) {
    warningMessages.push(`robots.txt returned HTTP ${robotsResult.statusCode}; candidate page permission treated as unknown.`);
    warningMessages.push('Candidate page was not fetched because robots.txt access was unclear.');
    return reportRow;
  }

  const candidatePath = getPathAndSearch(source.candidateBroadbandUrl);
  reportRow.candidatePathAllowed = isPathAllowedByRobots(robotsResult.text, candidatePath, USER_AGENT);

  if (reportRow.candidatePathAllowed !== true) {
    warningMessages.push('Candidate page appears disallowed by robots.txt and was not fetched.');
    return reportRow;
  }

  const pageResult = await fetchText(source.candidateBroadbandUrl);
  reportRow.pageFetched = pageResult.ok;
  reportRow.pageStatusCode = pageResult.statusCode;

  if (!pageResult.ok) {
    warningMessages.push(`Could not fetch candidate page: ${pageResult.errorMessage}`);
    return reportRow;
  }

  if (pageResult.statusCode < 200 || pageResult.statusCode >= 300) {
    warningMessages.push(`Candidate page returned HTTP ${pageResult.statusCode}.`);
  }

  reportRow.pageTitle = extractPageTitle(pageResult.text);
  reportRow.detectedPriceTextCount = countDetectedPriceText(pageResult.text);

  if (reportRow.detectedPriceTextCount === 0) {
    warningMessages.push('No simple pound price-like text was detected on the fetched page.');
  }

  return reportRow;
}

async function runSourceAccessChecks() {
  const enabledSources = broadbandSources.filter((source) => source.enabled);
  const reportRows = [];

  for (let index = 0; index < enabledSources.length; index += 1) {
    const source = enabledSources[index];
    console.log(`Checking ${source.name} (${source.sourceId})...`);

    try {
      reportRows.push(await checkSource(source));
    } catch (error) {
      reportRows.push({
        sourceId: source.sourceId,
        name: source.name,
        sourceType: source.sourceType,
        baseUrl: source.baseUrl,
        candidateBroadbandUrl: source.candidateBroadbandUrl,
        robotsUrl: buildRobotsUrl(source.baseUrl),
        robotsFetched: false,
        robotsStatusCode: null,
        candidatePathAllowed: 'unknown',
        pageFetched: false,
        pageStatusCode: null,
        pageTitle: '',
        detectedPriceTextCount: 0,
        warningMessages: [`Unexpected source check error: ${error.message}`],
        checkedAt: new Date().toISOString(),
      });
    }

    if (index < enabledSources.length - 1) {
      await sleep(DELAY_BETWEEN_SOURCES_MS);
    }
  }

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(reportRows, null, 2)}\n`);

  console.log(`Wrote ${reportRows.length} source access rows to ${path.relative(__dirname, REPORT_PATH)}`);

  return reportRows;
}

if (require.main === module) {
  runSourceAccessChecks().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  USER_AGENT,
  buildRobotsUrl,
  countDetectedPriceText,
  extractPageTitle,
  getPathAndSearch,
  isPathAllowedByRobots,
  parseRobotsTxt,
  robotsRuleMatchesPath,
  runSourceAccessChecks,
};
