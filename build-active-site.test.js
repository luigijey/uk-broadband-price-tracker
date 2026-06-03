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
  const siteIndexPath = path.join(tempFolder, 'site', 'index.html');

  fs.mkdirSync(path.dirname(siteIndexPath), { recursive: true });
  fs.writeFileSync(snippetsPath, '[]\n');
  fs.writeFileSync(candidatesPath, JSON.stringify({ candidates: [{ candidateId: 'example' }] }));
  fs.writeFileSync(usableCandidatesPath, JSON.stringify({ candidates: [{ candidateId: 'usable' }] }));
  fs.writeFileSync(reviewOnlyCandidatesPath, JSON.stringify({ candidates: [{ candidateId: 'review' }] }));
  fs.writeFileSync(discardedCandidatesPath, JSON.stringify({ candidates: [{ candidateId: 'discarded' }] }));
  fs.writeFileSync(siteIndexPath, '<!doctype html>');

  const summary = buildActiveBuildSummary({
    snippets: snippetsPath,
    providerCandidates: candidatesPath,
    usableProviderCandidates: usableCandidatesPath,
    reviewOnlyProviderCandidates: reviewOnlyCandidatesPath,
    discardedProviderCandidates: discardedCandidatesPath,
    siteIndex: siteIndexPath,
  });

  assert.deepEqual(summary, {
    snippetsFileExists: true,
    providerCandidatesFileExists: true,
    usableProviderCandidatesFileExists: true,
    reviewOnlyProviderCandidatesFileExists: true,
    discardedProviderCandidatesFileExists: true,
    candidateCount: 1,
    siteIndexCreated: true,
  });
  assert.equal(readCandidateCount(candidatesPath), 1);
});
