// Beginner-friendly UK postcode helpers for Postcode Check V1.
//
// These helpers run locally. They only validate/extract broad postcode areas
// such as OX, M, SW, EC, and WC. They do not check provider availability and
// they do not submit postcodes to any provider or third-party website.

function normalisePostcode(postcode) {
  const compact = String(postcode || '').toUpperCase().replace(/\s+/g, '');
  if (compact.length <= 3) {
    return compact;
  }

  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

function isValidUkPostcode(postcode) {
  const normalised = normalisePostcode(postcode);
  return /^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2})$/.test(normalised);
}

function extractPostcodeArea(postcode) {
  if (!isValidUkPostcode(postcode)) {
    return null;
  }

  const outwardCode = normalisePostcode(postcode).split(' ')[0];
  const areaMatch = outwardCode.match(/^[A-Z]{1,2}/);
  return areaMatch ? areaMatch[0] : null;
}

function getPostcodeAreaMatch(postcode, postcodeAreas) {
  const postcodeArea = extractPostcodeArea(postcode);
  if (!postcodeArea || !Array.isArray(postcodeAreas)) {
    return null;
  }

  return postcodeAreas.find((area) => area && area.postcodeArea === postcodeArea && area.enabled !== false) || null;
}

if (typeof module !== 'undefined') {
  module.exports = {
    normalisePostcode,
    isValidUkPostcode,
    extractPostcodeArea,
    getPostcodeAreaMatch,
  };
}

if (typeof window !== 'undefined') {
  window.PostcodeUtils = {
    normalisePostcode,
    isValidUkPostcode,
    extractPostcodeArea,
    getPostcodeAreaMatch,
  };
}
