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
  ['npm', ['run', 'export']],
  ['npm', ['run', 'build-site']],
];

const summaryFiles = {
  snippets: path.join(rootFolder, 'exports', 'online-price-snippets.json'),
  providerCandidates: path.join(rootFolder, 'exports', 'provider-deal-candidates.json'),
  usableProviderCandidates: path.join(rootFolder, 'exports', 'provider-deal-candidates-usable.json'),
  reviewOnlyProviderCandidates: path.join(rootFolder, 'exports', 'provider-deal-candidates-review-only.json'),
  discardedProviderCandidates: path.join(rootFolder, 'exports', 'provider-deal-candidates-discarded.json'),
  siteIndex: path.join(rootFolder, 'site', 'index.html'),
};

function readCandidateCount(providerCandidatesPath = summaryFiles.providerCandidates) {
  if (!fs.existsSync(providerCandidatesPath)) {
    return null;
  }

  const providerCandidateOutput = JSON.parse(fs.readFileSync(providerCandidatesPath, 'utf8'));
  return Array.isArray(providerCandidateOutput.candidates) ? providerCandidateOutput.candidates.length : null;
}

function buildActiveBuildSummary(files = summaryFiles) {
  return {
    snippetsFileExists: fs.existsSync(files.snippets),
    providerCandidatesFileExists: fs.existsSync(files.providerCandidates),
    usableProviderCandidatesFileExists: fs.existsSync(files.usableProviderCandidates),
    reviewOnlyProviderCandidatesFileExists: fs.existsSync(files.reviewOnlyProviderCandidates),
    discardedProviderCandidatesFileExists: fs.existsSync(files.discardedProviderCandidates),
    candidateCount: readCandidateCount(files.providerCandidates),
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
  console.log(`Provider candidate count: ${summary.candidateCount === null ? 'unknown' : summary.candidateCount}`);
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
  readCandidateCount,
  runActiveBuild,
};
