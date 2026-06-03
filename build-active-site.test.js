// Tests for active build summary helpers.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildActiveBuildSummary, readCandidateCount } = require('./build-active-site');

test('active build summary reports output files and candidate count', () => {
  const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'active-build-summary-'));
  const snippetsPath = path.join(tempFolder, 'online-price-snippets.json');
  const candidatesPath = path.join(tempFolder, 'provider-deal-candidates.json');
  const usableCandidatesPath = path.join(tempFolder, 'provider-deal-candidates-usable.json');
  const reviewOnlyCandidatesPath = path.join(tempFolder, 'provider-deal-candidates-review-only.json');
  const discardedCandidatesPath = path.join(tempFolder, 'provider-deal-candidates-discarded.json');
  const providerDirectExpansionSummaryPath = path.join(tempFolder, 'provider-direct-expansion-summary.json');
  const activeDealsPath = path.join(tempFolder, 'active-online-deals.json');
  const postcodeAreaActiveComparisonPath = path.join(tempFolder, 'postcode-area-active-comparison.json');
  const postcodeCheckV1SummaryPath = path.join(tempFolder, 'postcode-check-v1-summary.json');
  const activeDealsFolder = path.join(tempFolder, 'site', 'active-deals');
  const siteIndexPath = path.join(tempFolder, 'site', 'index.html');

  fs.mkdirSync(path.dirname(siteIndexPath), { recursive: true });
  fs.writeFileSync(snippetsPath, '[]\n');
  fs.writeFileSync(candidatesPath, JSON.stringify({ candidates: [{ candidateId: 'example' }] }));
  fs.writeFileSync(usableCandidatesPath, JSON.stringify({ candidates: [{ candidateId: 'usable' }] }));
  fs.writeFileSync(reviewOnlyCandidatesPath, JSON.stringify({ candidates: [{ candidateId: 'review' }] }));
  fs.writeFileSync(discardedCandidatesPath, JSON.stringify({ candidates: [{ candidateId: 'discarded' }] }));
  fs.writeFileSync(providerDirectExpansionSummaryPath, JSON.stringify({ fixedBroadbandCandidates: 1 }));
  fs.mkdirSync(activeDealsFolder, { recursive: true });
  fs.writeFileSync(path.join(activeDealsFolder, 'active-example.html'), '<!doctype html>');
  fs.writeFileSync(activeDealsPath, JSON.stringify({ activeDeals: [{ activeDealId: 'active-example' }] }));
  fs.writeFileSync(postcodeAreaActiveComparisonPath, JSON.stringify({ rows: [{ postcodeArea: 'OX' }] }));
  fs.writeFileSync(postcodeCheckV1SummaryPath, JSON.stringify({ supportedPostcodeAreaCount: 1 }));
  fs.writeFileSync(siteIndexPath, '<!doctype html>');

  const summary = buildActiveBuildSummary({
    snippets: snippetsPath,
    providerCandidates: candidatesPath,
    usableProviderCandidates: usableCandidatesPath,
    reviewOnlyProviderCandidates: reviewOnlyCandidatesPath,
    discardedProviderCandidates: discardedCandidatesPath,
    providerDirectExpansionSummary: providerDirectExpansionSummaryPath,
    activeOnlineDeals: activeDealsPath,
    postcodeAreaActiveComparison: postcodeAreaActiveComparisonPath,
    postcodeCheckV1Summary: postcodeCheckV1SummaryPath,
    activeDealsFolder,
    siteIndex: siteIndexPath,
  });

  assert.deepEqual(summary, {
    snippetsFileExists: true,
    providerCandidatesFileExists: true,
    usableProviderCandidatesFileExists: true,
    reviewOnlyProviderCandidatesFileExists: true,
    discardedProviderCandidatesFileExists: true,
    providerDirectExpansionSummaryFileExists: true,
    activeOnlineDealsFileExists: true,
    postcodeAreaActiveComparisonFileExists: true,
    postcodeCheckV1SummaryFileExists: true,
    candidateCount: 1,
    activeOnlineDealCount: 1,
    postcodeAreaActiveRowCount: 1,
    supportedPostcodeAreaCount: 1,
    activeDealPagesGenerated: 1,
    siteIndexCreated: true,
  });
  assert.equal(readCandidateCount(candidatesPath), 1);
});
