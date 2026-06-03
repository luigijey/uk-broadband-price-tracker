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
  const siteIndexPath = path.join(tempFolder, 'site', 'index.html');

  fs.mkdirSync(path.dirname(siteIndexPath), { recursive: true });
  fs.writeFileSync(snippetsPath, '[]\n');
  fs.writeFileSync(candidatesPath, JSON.stringify({ candidates: [{ candidateId: 'example' }] }));
  fs.writeFileSync(siteIndexPath, '<!doctype html>');

  const summary = buildActiveBuildSummary({
    snippets: snippetsPath,
    providerCandidates: candidatesPath,
    siteIndex: siteIndexPath,
  });

  assert.deepEqual(summary, {
    snippetsFileExists: true,
    providerCandidatesFileExists: true,
    candidateCount: 1,
    siteIndexCreated: true,
  });
  assert.equal(readCandidateCount(candidatesPath), 1);
});
