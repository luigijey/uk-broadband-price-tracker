// Run the local active candidate data pipeline in sequence.
//
// This intentionally uses the existing polite snippet extraction step. It does
// not add browser automation, proxies, or any block/security-check bypassing.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootFolder = __dirname;

const commands = [
  ['npm', ['run', 'extract-snippets']],
  ['npm', ['run', 'extract-providers']],
  ['npm', ['run', 'promote-active']],
  ['npm', ['run', 'postcode-area-build']],
  ['npm', ['run', 'active-summary']],
  ['npm', ['run', 'export']],
  ['npm', ['run', 'build-site']],
];

const summaryFiles = {
  snippets: path.join(rootFolder, 'exports', 'online-price-snippets.json'),
  providerCandidates: path.join(rootFolder, 'exports', 'provider-deal-candidates.json'),
  usableProviderCandidates: path.join(rootFolder, 'exports', 'provider-deal-candidates-usable.json'),
  reviewOnlyProviderCandidates: path.join(rootFolder, 'exports', 'provider-deal-candidates-review-only.json'),
  discardedProviderCandidates: path.join(rootFolder, 'exports', 'provider-deal-candidates-discarded.json'),
  providerDirectExpansionSummary: path.join(rootFolder, 'exports', 'provider-direct-expansion-summary.json'),
  activeOnlineDeals: path.join(rootFolder, 'exports', 'active-online-deals.json'),
  postcodeAreaActiveComparison: path.join(rootFolder, 'exports', 'postcode-area-active-comparison.json'),
  postcodeCheckV1Summary: path.join(rootFolder, 'exports', 'postcode-check-v1-summary.json'),
  activeCheapestBySpeedTier: path.join(rootFolder, 'exports', 'active-cheapest-by-speed-tier.json'),
  activeDealsFolder: path.join(rootFolder, 'site', 'active-deals'),
  siteIndex: path.join(rootFolder, 'site', 'index.html'),
};

function readJsonCount(filePath, arrayField) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const output = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Array.isArray(output[arrayField]) ? output[arrayField].length : null;
}

function readCandidateCount(providerCandidatesPath = summaryFiles.providerCandidates) {
  return readJsonCount(providerCandidatesPath, 'candidates');
}

function countActiveDealPages(activeDealsFolder = summaryFiles.activeDealsFolder) {
  if (!fs.existsSync(activeDealsFolder)) {
    return 0;
  }

  return fs.readdirSync(activeDealsFolder).filter((fileName) => fileName.endsWith('.html')).length;
}

function readActiveDealCount(activeDealsPath = summaryFiles.activeOnlineDeals) {
  return readJsonCount(activeDealsPath, 'activeDeals');
}

function readSupportedPostcodeAreaCount(postcodeCheckV1SummaryPath = summaryFiles.postcodeCheckV1Summary) {
  if (!fs.existsSync(postcodeCheckV1SummaryPath)) {
    return null;
  }

  const output = JSON.parse(fs.readFileSync(postcodeCheckV1SummaryPath, 'utf8'));
  return typeof output.supportedPostcodeAreaCount === 'number' ? output.supportedPostcodeAreaCount : null;
}

function readPostcodeAreaActiveRowCount(postcodeAreaActiveComparisonPath = summaryFiles.postcodeAreaActiveComparison) {
  return readJsonCount(postcodeAreaActiveComparisonPath, 'rows');
}

function readActiveCheapestSpeedTierRowCount(activeCheapestBySpeedTierPath = summaryFiles.activeCheapestBySpeedTier) {
  return readJsonCount(activeCheapestBySpeedTierPath, 'rows');
}

function buildActiveBuildSummary(files = summaryFiles) {
  return {
    snippetsFileExists: fs.existsSync(files.snippets),
    providerCandidatesFileExists: fs.existsSync(files.providerCandidates),
    usableProviderCandidatesFileExists: fs.existsSync(files.usableProviderCandidates),
    reviewOnlyProviderCandidatesFileExists: fs.existsSync(files.reviewOnlyProviderCandidates),
    discardedProviderCandidatesFileExists: fs.existsSync(files.discardedProviderCandidates),
    providerDirectExpansionSummaryFileExists: fs.existsSync(files.providerDirectExpansionSummary),
    activeOnlineDealsFileExists: fs.existsSync(files.activeOnlineDeals),
    postcodeAreaActiveComparisonFileExists: fs.existsSync(files.postcodeAreaActiveComparison),
    postcodeCheckV1SummaryFileExists: fs.existsSync(files.postcodeCheckV1Summary),
    activeCheapestBySpeedTierFileExists: fs.existsSync(files.activeCheapestBySpeedTier),
    candidateCount: readCandidateCount(files.providerCandidates),
    activeOnlineDealCount: readActiveDealCount(files.activeOnlineDeals),
    postcodeAreaActiveRowCount: readPostcodeAreaActiveRowCount(files.postcodeAreaActiveComparison),
    supportedPostcodeAreaCount: readSupportedPostcodeAreaCount(files.postcodeCheckV1Summary),
    activeCheapestSpeedTierRowCount: readActiveCheapestSpeedTierRowCount(files.activeCheapestBySpeedTier),
    activeDealPagesGenerated: countActiveDealPages(files.activeDealsFolder),
    siteIndexCreated: fs.existsSync(files.siteIndex),
  };
}

function printActiveBuildSummary(summary) {
  console.log('\nActive build summary');
  console.log('====================');
  console.log(`Snippets file exists: ${summary.snippetsFileExists ? 'yes' : 'no'}`);
  console.log(`Provider candidates file exists: ${summary.providerCandidatesFileExists ? 'yes' : 'no'}`);
  console.log(`Usable provider candidates file exists: ${summary.usableProviderCandidatesFileExists ? 'yes' : 'no'}`);
  console.log(`Review-only provider candidates file exists: ${summary.reviewOnlyProviderCandidatesFileExists ? 'yes' : 'no'}`);
  console.log(`Discarded provider candidates file exists: ${summary.discardedProviderCandidatesFileExists ? 'yes' : 'no'}`);
  console.log(`Provider direct expansion summary exists: ${summary.providerDirectExpansionSummaryFileExists ? 'yes' : 'no'}`);
  console.log(`Provider candidate count: ${summary.candidateCount === null ? 'unknown' : summary.candidateCount}`);
  console.log(`active-online-deals.json exists: ${summary.activeOnlineDealsFileExists ? 'yes' : 'no'}`);
  console.log(`Active online deal count: ${summary.activeOnlineDealCount === null ? 'unknown' : summary.activeOnlineDealCount}`);
  console.log(`postcode-area-active-comparison.json exists: ${summary.postcodeAreaActiveComparisonFileExists ? 'yes' : 'no'}`);
  console.log(`Postcode-area row count: ${summary.postcodeAreaActiveRowCount === null ? 'unknown' : summary.postcodeAreaActiveRowCount}`);
  console.log(`postcode-check-v1-summary.json exists: ${summary.postcodeCheckV1SummaryFileExists ? 'yes' : 'no'}`);
  console.log(`active-cheapest-by-speed-tier.json exists: ${summary.activeCheapestBySpeedTierFileExists ? 'yes' : 'no'}`);
  console.log(`Supported postcode area count: ${summary.supportedPostcodeAreaCount === null ? 'unknown' : summary.supportedPostcodeAreaCount}`);
  console.log(`Active cheapest speed-tier summary rows: ${summary.activeCheapestSpeedTierRowCount === null ? 'unknown' : summary.activeCheapestSpeedTierRowCount}`);
  console.log(`Active deal pages generated: ${summary.activeDealPagesGenerated}`);
  console.log(`site/index.html created: ${summary.siteIndexCreated ? 'yes' : 'no'}`);
}

function runActiveBuild() {
  commands.forEach(([command, args]) => {
    const commandText = [command, ...args].join(' ');
    console.log(`\n> ${commandText}`);
    const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });

    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
  });

  const summary = buildActiveBuildSummary();
  printActiveBuildSummary(summary);
  return summary;
}

if (require.main === module) {
  runActiveBuild();
}

module.exports = {
  buildActiveBuildSummary,
  printActiveBuildSummary,
  countActiveDealPages,
  readActiveDealCount,
  readCandidateCount,
  readPostcodeAreaActiveRowCount,
  readSupportedPostcodeAreaCount,
  readActiveCheapestSpeedTierRowCount,
  runActiveBuild,
};
