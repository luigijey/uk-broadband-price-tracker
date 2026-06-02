// Build a very small static website from the exported broadband pricing data.
//
// Run this file with:
//   npm run build-site
//
// The page is intentionally simple: plain HTML, CSS, and browser JavaScript.
// There are no external dependencies.

const fs = require('node:fs');
const path = require('node:path');

const { exportPricingData } = require('./export-pricing-data');

const exportsFolder = path.join(__dirname, 'exports');
const siteFolder = path.join(__dirname, 'site');

const exportFiles = {
  nationalCheapestBySpeedTier: path.join(exportsFolder, 'national-cheapest-by-speed-tier.json'),
  postcodeAreaComparison: path.join(exportsFolder, 'postcode-area-comparison.json'),
};

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatMoney(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function formatRewardSummary(deal) {
  const rewards = [
    ['Voucher', deal.voucherValue],
    ['Reward card', deal.rewardCardValue],
    ['Cashback', deal.cashbackValue],
    ['Bill credit', deal.billCreditValue],
    ['Free months', deal.freeMonthsDiscountValue],
  ].filter(([, value]) => Number(value) > 0);

  if (rewards.length === 0) {
    return 'None';
  }

  return rewards
    .map(([label, value]) => `${label}: ${formatMoney(value)}`)
    .join(', ');
}

function formatFees(deal) {
  return Number(deal.totalFees) > 0 ? formatMoney(deal.totalFees) : 'None';
}

function buildNationalRows(deals) {
  return deals.map((deal) => `
            <tr>
              <td>${escapeHtml(deal.speedTier)}</td>
              <td>${escapeHtml(deal.provider)}</td>
              <td>${escapeHtml(deal.postcodeArea)}</td>
              <td>${formatMoney(deal.advertisedMonthlyPrice)}</td>
              <td class="effective-price">${formatMoney(deal.effectiveMonthlyPrice)}</td>
              <td>${escapeHtml(deal.contractLengthMonths)} months</td>
              <td>${escapeHtml(formatRewardSummary(deal))}</td>
              <td>${formatMoney(deal.annualAprilPriceRise)} per April</td>
              <td>${escapeHtml(deal.source)}</td>
            </tr>`).join('');
}

function buildPostcodeRows(deals) {
  return deals.map((deal) => `
            <tr data-postcode-area="${escapeHtml(deal.postcodeArea)}">
              <td>${escapeHtml(deal.postcodeArea)}</td>
              <td>${escapeHtml(deal.speedTier)}</td>
              <td>${escapeHtml(deal.provider)}</td>
              <td>${escapeHtml(deal.packageName)}</td>
              <td>${escapeHtml(deal.speedMbps)}</td>
              <td>${formatMoney(deal.advertisedMonthlyPrice)}</td>
              <td class="effective-price">${formatMoney(deal.effectiveMonthlyPrice)}</td>
              <td>${escapeHtml(formatRewardSummary(deal))}</td>
              <td>${escapeHtml(formatFees(deal))}</td>
              <td>${formatMoney(deal.annualAprilPriceRise)} per April</td>
              <td>${escapeHtml(deal.contractLengthMonths)} months</td>
              <td>${formatMoney(deal.totalContractCostAfterRewards)}</td>
              <td>${escapeHtml(deal.source)}</td>
              <td>${escapeHtml(deal.lastCheckedDate)}</td>
            </tr>`).join('');
}

function buildHtml(nationalDeals, postcodeDeals) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UK Broadband Price Tracker</title>
  <style>
    body {
      margin: 0;
      background: #f3f6fb;
      color: #172033;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.5;
    }

    header,
    main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    header {
      padding-top: 40px;
    }

    h1,
    h2 {
      margin-top: 0;
      line-height: 1.2;
    }

    .badge {
      display: inline-block;
      margin-bottom: 12px;
      padding: 6px 10px;
      border-radius: 999px;
      background: #fff3cd;
      color: #7a4f01;
      font-size: 0.9rem;
      font-weight: 700;
    }

    .card {
      margin-bottom: 24px;
      padding: 20px;
      border: 1px solid #dde5f2;
      border-radius: 14px;
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(23, 32, 51, 0.06);
    }

    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 900px;
    }

    th,
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e6ecf5;
      text-align: left;
      vertical-align: top;
      white-space: nowrap;
    }

    th {
      background: #eef4ff;
      color: #102a56;
      font-size: 0.9rem;
    }

    tr:nth-child(even) td {
      background: #fbfdff;
    }

    .effective-price {
      color: #0b6b3a;
      font-weight: 700;
    }

    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-bottom: 14px;
    }

    select {
      padding: 8px 10px;
      border: 1px solid #b8c6d9;
      border-radius: 8px;
      background: #ffffff;
      color: #172033;
      font: inherit;
    }

    .small-note {
      color: #53627a;
      font-size: 0.95rem;
    }
  </style>
</head>
<body>
  <header>
    <span class="badge">Sample data only</span>
    <h1>UK Broadband Price Tracker</h1>
    <p>This first static page uses fake sample broadband deals only. It is not live provider data and should not be used to make a buying decision.</p>
    <p>The advertised monthly price is the headline monthly cost. The effective monthly price estimates the real monthly cost across the contract after April price rises, fees, vouchers, rewards, cashback, bill credits, and discounts.</p>
  </header>

  <main>
    <section class="card" aria-labelledby="national-heading">
      <h2 id="national-heading">National cheapest by speed tier</h2>
      <p class="small-note">Cheapest means the lowest effective monthly price in the fake sample data for each speed tier.</p>
      <div class="table-wrap">
        <table id="national-cheapest-table">
          <thead>
            <tr>
              <th>Speed Tier</th>
              <th>Cheapest Provider</th>
              <th>Postcode Area</th>
              <th>Advertised Monthly Price</th>
              <th>Effective Monthly Price</th>
              <th>Contract Length</th>
              <th>Main Reward or Voucher</th>
              <th>April Price Rise</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>${buildNationalRows(nationalDeals)}
          </tbody>
        </table>
      </div>
    </section>

    <section class="card" aria-labelledby="postcode-heading">
      <h2 id="postcode-heading">Postcode area comparison</h2>
      <div class="filter-row">
        <label for="postcode-filter">Postcode area:</label>
        <select id="postcode-filter">
          <option value="all">All postcode areas</option>
          <option value="OX">OX</option>
          <option value="M">M</option>
          <option value="SW">SW</option>
        </select>
      </div>
      <div class="table-wrap">
        <table id="postcode-area-table">
          <thead>
            <tr>
              <th>Postcode Area</th>
              <th>Speed Tier</th>
              <th>Provider</th>
              <th>Package</th>
              <th>Speed Mbps</th>
              <th>Advertised Monthly Price</th>
              <th>Effective Monthly Price</th>
              <th>Voucher/Rewards</th>
              <th>Fees</th>
              <th>April Price Rise</th>
              <th>Contract Length</th>
              <th>Total Contract Cost After Rewards</th>
              <th>Source</th>
              <th>Last Checked</th>
            </tr>
          </thead>
          <tbody>${buildPostcodeRows(postcodeDeals)}
          </tbody>
        </table>
      </div>
    </section>
  </main>

  <script>
    const postcodeFilter = document.getElementById('postcode-filter');
    const postcodeRows = document.querySelectorAll('#postcode-area-table tbody tr');

    postcodeFilter.addEventListener('change', () => {
      const selectedPostcodeArea = postcodeFilter.value;

      postcodeRows.forEach((row) => {
        const rowPostcodeArea = row.dataset.postcodeArea;
        row.hidden = selectedPostcodeArea !== 'all' && rowPostcodeArea !== selectedPostcodeArea;
      });
    });
  </script>
</body>
</html>
`;
}

function buildStaticSite() {
  // Keep the export files fresh before reading them into the static page.
  exportPricingData();

  const nationalDeals = readJsonFile(exportFiles.nationalCheapestBySpeedTier);
  const postcodeDeals = readJsonFile(exportFiles.postcodeAreaComparison);
  const html = buildHtml(nationalDeals, postcodeDeals);

  fs.mkdirSync(siteFolder, { recursive: true });
  fs.writeFileSync(path.join(siteFolder, 'index.html'), html);

  return {
    nationalDealCount: nationalDeals.length,
    postcodeDealCount: postcodeDeals.length,
    createdFile: path.join(siteFolder, 'index.html'),
  };
}

function main() {
  const summary = buildStaticSite();
  console.log('Static site build complete');
  console.log('==========================');
  console.log(`National rows: ${summary.nationalDealCount}`);
  console.log(`Postcode rows: ${summary.postcodeDealCount}`);
  console.log(`File created: ${path.relative(__dirname, summary.createdFile)}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildHtml,
  buildStaticSite,
  escapeHtml,
  formatRewardSummary,
};
