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


test('deploy workflow runs active-summary and uploads active cheapest artifacts', () => {
  assert.match(workflow, /npm run postcode-area-build[\s\S]*npm run active-summary[\s\S]*npm run build-site/);
  assert.match(workflow, /test -f exports\/active-cheapest-by-speed-tier\.json/);
  assert.match(workflow, /test -f exports\/active-cheapest-by-speed-tier\.csv/);
  assert.match(workflow, /exports\/active-cheapest-by-speed-tier\.json/);
  assert.match(workflow, /exports\/active-cheapest-by-speed-tier\.csv/);
});
