const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalisePostcode,
  isValidUkPostcode,
  extractPostcodeArea,
  getPostcodeAreaMatch,
} = require('./postcode-utils');

test('normalises lowercase and spaces', () => {
  assert.equal(normalisePostcode('  ox14   1aa '), 'OX14 1AA');
});

test('validates common UK postcodes', () => {
  ['OX14 1AA', 'SW1A 1AA', 'EC1A 1BB', 'M1 1AE', 'W1A 1AA', 'BS1 5TR', 'G1 1AA', 'EH1 1AA'].forEach((postcode) => {
    assert.equal(isValidUkPostcode(postcode), true, postcode);
  });
});

test('rejects invalid strings', () => {
  ['not a postcode', '12345', 'OXAA 1AA', 'SW1A AAA'].forEach((postcode) => {
    assert.equal(isValidUkPostcode(postcode), false, postcode);
  });
});

test('extracts postcode areas', () => {
  assert.equal(extractPostcodeArea('OX14 1AA'), 'OX');
  assert.equal(extractPostcodeArea('M1 1AE'), 'M');
  assert.equal(extractPostcodeArea('SW1A 1AA'), 'SW');
  assert.equal(extractPostcodeArea('W1A 1AA'), 'W');
  assert.equal(extractPostcodeArea('EC1A 1BB'), 'EC');
  assert.equal(extractPostcodeArea('WC1A 1AA'), 'WC');
});

test('matches supported postcode area rows', () => {
  const areas = [{ postcodeArea: 'OX', regionName: 'South East England', enabled: true }];
  assert.deepEqual(getPostcodeAreaMatch('OX14 1AA', areas), areas[0]);
  assert.equal(getPostcodeAreaMatch('ZZ1 1ZZ', areas), null);
});
