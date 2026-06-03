const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const workflow = fs.readFileSync('.github/workflows/deploy-static-site.yml', 'utf8');

test('deploy workflow uploads provider-direct and postcode check review artifacts', () => {
  assert.match(workflow, /test -f exports\/provider-direct-expansion-summary\.json/);
  assert.match(workflow, /test -f exports\/postcode-check-v1-summary\.json/);
  assert.match(workflow, /exports\/provider-direct-expansion-summary\.json/);
  assert.match(workflow, /exports\/postcode-check-v1-summary\.json/);
});
