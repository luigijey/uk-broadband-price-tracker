// Build a very small static website from the exported broadband pricing data.
//
// Run this file with:
//   npm run build-site
//
// The page is intentionally simple: plain HTML, CSS, and browser JavaScript.
// There are no external dependencies.

const fs = require('node:fs');
const path = require('node:path');

const sampleDeals = require('./sample-deals');
const { calculateBroadbandPrice } = require('./pricing-calculator');
const { exportPricingData } = require('./export-pricing-data');

const exportsFolder = path.join(__dirname, 'exports');
const siteFolder = path.join(__dirname, 'site');
const dealsFolder = path.join(siteFolder, 'deals');

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

function dealDetailHref(deal) {
  return `deals/${encodeURIComponent(deal.dealId)}.html`;
}

function formatMonthNote(month) {
  if (month.aprilsCrossedSoFar === 0) {
    return 'Advertised monthly price';
  }

  const plural = month.aprilsCrossedSoFar === 1 ? '' : 's';
  return `${month.aprilsCrossedSoFar} April price rise${plural} included`;
}

function buildDetailRows(rows) {
  return rows.map(([label, value]) => `
              <tr>
                <th scope="row">${escapeHtml(label)}</th>
                <td>${escapeHtml(value)}</td>
              </tr>`).join('');
}

function buildMonthlyBreakdownRows(monthlyPrices) {
  return monthlyPrices.map((month) => `
              <tr>
                <td class="number">${escapeHtml(month.monthNumber)}</td>
                <td class="number">${escapeHtml(month.date)}</td>
                <td class="money">${formatMoney(month.monthlyPrice)}</td>
                <td>${escapeHtml(formatMonthNote(month))}</td>
              </tr>`).join('');
}

function countUniqueValues(deals, fieldName) {
  return new Set(deals.map((deal) => deal[fieldName]).filter(Boolean)).size;
}

function buildNationalRows(deals) {
  return deals.map((deal) => `
            <tr>
              <td>${escapeHtml(deal.speedTier)}</td>
              <td>${escapeHtml(deal.provider)}</td>
              <td>${escapeHtml(deal.postcodeArea)}</td>
              <td class="money">${formatMoney(deal.advertisedMonthlyPrice)}</td>
              <td class="money effective-price">${formatMoney(deal.effectiveMonthlyPrice)}</td>
              <td class="number">${escapeHtml(deal.contractLengthMonths)} months</td>
              <td class="wrap-text">${escapeHtml(formatRewardSummary(deal))}</td>
              <td class="money">${formatMoney(deal.annualAprilPriceRise)} per April</td>
              <td class="wrap-text">${escapeHtml(deal.source)}</td>
            </tr>`).join('');
}

function buildPostcodeRows(deals) {
  return deals.map((deal) => `
            <tr data-postcode-area="${escapeHtml(deal.postcodeArea)}">
              <td>${escapeHtml(deal.postcodeArea)}</td>
              <td>${escapeHtml(deal.speedTier)}</td>
              <td>${escapeHtml(deal.provider)}</td>
              <td>${escapeHtml(deal.packageName)}</td>
              <td class="number">${escapeHtml(deal.speedMbps)}</td>
              <td class="money">${formatMoney(deal.advertisedMonthlyPrice)}</td>
              <td class="money effective-price">${formatMoney(deal.effectiveMonthlyPrice)}</td>
              <td class="wrap-text">${escapeHtml(formatRewardSummary(deal))}</td>
              <td class="money">${escapeHtml(formatFees(deal))}</td>
              <td class="money">${formatMoney(deal.annualAprilPriceRise)} per April</td>
              <td class="number">${escapeHtml(deal.contractLengthMonths)} months</td>
              <td class="money">${formatMoney(deal.totalContractCostAfterRewards)}</td>
              <td class="wrap-text">${escapeHtml(deal.source)}</td>
              <td class="number">${escapeHtml(deal.lastCheckedDate)}</td>
              <td><a href="${escapeHtml(dealDetailHref(deal))}">View breakdown</a></td>
            </tr>`).join('');
}

function buildHtml(nationalDeals, postcodeDeals) {
  const summaryCards = [
    ['Sample deals', postcodeDeals.length],
    ['Postcode areas', countUniqueValues(postcodeDeals, 'postcodeArea')],
    ['Providers', countUniqueValues(postcodeDeals, 'provider')],
    ['Speed tiers', countUniqueValues(postcodeDeals, 'speedTier')],
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UK Broadband Price Tracker</title>
  <style>
    :root {
      color-scheme: light;
      --page-bg: #f4f7fb;
      --card-bg: #ffffff;
      --text: #172033;
      --muted: #53627a;
      --border: #d8e2ef;
      --blue: #174ea6;
      --blue-dark: #102a56;
      --blue-soft: #eaf2ff;
      --green: #087443;
      --green-soft: #e8f7ef;
      --yellow: #fff3cd;
      --yellow-text: #7a4f01;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--page-bg);
      color: var(--text);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 16px;
      line-height: 1.55;
    }

    header,
    main {
      width: min(1400px, 100%);
      margin: 0 auto;
      padding: 24px;
    }

    header {
      padding-top: 40px;
      padding-bottom: 10px;
    }

    .hero {
      padding: 28px;
      border: 1px solid var(--border);
      border-radius: 22px;
      background: linear-gradient(135deg, #ffffff 0%, #eef5ff 100%);
      box-shadow: 0 10px 30px rgba(23, 32, 51, 0.08);
    }

    .title-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }

    h1,
    h2,
    h3,
    p {
      overflow-wrap: normal;
      word-break: normal;
    }

    h1,
    h2,
    h3 {
      margin-top: 0;
      line-height: 1.2;
    }

    h1 {
      margin-bottom: 0;
      font-size: clamp(2rem, 5vw, 3.5rem);
      letter-spacing: -0.04em;
    }

    h2 {
      margin-bottom: 8px;
      font-size: clamp(1.35rem, 3vw, 1.75rem);
    }

    p {
      max-width: 860px;
      margin: 0 0 12px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      padding: 7px 12px;
      border: 1px solid #f0d88a;
      border-radius: 999px;
      background: var(--yellow);
      color: var(--yellow-text);
      font-size: 0.88rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin: 24px 0 0;
    }

    .summary-card {
      padding: 18px;
      border: 1px solid #b8cff0;
      border-radius: 16px;
      background: var(--card-bg);
      box-shadow: 0 8px 22px rgba(23, 78, 166, 0.12);
    }

    .summary-number {
      display: block;
      color: var(--blue);
      font-size: 2rem;
      font-weight: 800;
      line-height: 1;
    }

    .summary-label {
      display: block;
      margin-top: 6px;
      color: var(--muted);
      font-size: 0.95rem;
      font-weight: 700;
    }

    .card {
      margin-bottom: 24px;
      padding: 22px;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: var(--card-bg);
      box-shadow: 0 2px 12px rgba(23, 32, 51, 0.06);
    }

    .table-wrap {
      width: 100%;
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: #ffffff;
      -webkit-overflow-scrolling: touch;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.94rem;
    }

    #national-cheapest-table {
      min-width: 0;
      table-layout: fixed;
    }

    #postcode-area-table {
      min-width: 1380px;
    }

    th,
    td {
      padding: 10px 11px;
      border-bottom: 1px solid #e6ecf5;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: var(--blue-soft);
      color: var(--blue-dark);
      font-size: 0.82rem;
      font-weight: 800;
      line-height: 1.25;
      position: sticky;
      top: 0;
      white-space: normal;
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }

    tr:nth-child(even) td {
      background: #fbfdff;
    }

    .money,
    .number {
      white-space: nowrap;
    }

    .wrap-text {
      min-width: 150px;
      max-width: 240px;
      white-space: normal;
    }

    .effective-price {
      color: var(--green);
      font-weight: 800;
    }

    td.effective-price {
      background: var(--green-soft);
    }

    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin: 18px 0 10px;
      padding: 14px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: #f8fbff;
    }

    label {
      font-weight: 700;
    }

    select {
      min-width: 220px;
      padding: 9px 12px;
      border: 1px solid #aebed3;
      border-radius: 10px;
      background: #ffffff;
      color: var(--text);
      font: inherit;
    }

    .small-note {
      color: var(--muted);
      font-size: 0.95rem;
    }

    .scroll-tip {
      margin: 14px 0 8px;
      font-weight: 700;
    }

    @media (max-width: 760px) {
      header,
      main {
        padding: 16px;
      }

      header {
        padding-top: 18px;
      }

      .hero,
      .card {
        padding: 18px;
        border-radius: 16px;
      }

      .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      table {
        font-size: 0.9rem;
      }
    }

    @media (max-width: 460px) {
      header,
      main {
        padding: 12px;
      }

      .hero,
      .card {
        padding: 16px;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }

      select {
        width: 100%;
        min-width: 0;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="hero">
      <div class="title-row">
        <h1>UK Broadband Price Tracker</h1>
        <span class="badge">Sample data only</span>
      </div>
      <p>This static page uses fake sample broadband deals only. It is not live provider data and should not be used to make a buying decision.</p>
      <p><strong>Advertised monthly price</strong> is the headline monthly cost. <strong>Effective monthly price</strong> estimates the real monthly cost across the contract after April price rises, fees, vouchers, rewards, cashback, bill credits, and discounts.</p>
      <section class="summary-grid" aria-label="Sample data summary">
${summaryCards.map(([label, value]) => `        <article class="summary-card">
          <span class="summary-number">${escapeHtml(value)}</span>
          <span class="summary-label">${escapeHtml(label)}</span>
        </article>`).join('\n')}
      </section>
    </div>
  </header>

  <main>
    <section class="card" aria-labelledby="national-heading">
      <h2 id="national-heading">National cheapest by speed tier</h2>
      <p class="small-note">Cheapest means the lowest effective monthly price in the fake sample data for each speed tier.</p>
      <p class="small-note scroll-tip">Tip: if needed, scroll sideways to see all columns.</p>
      <div class="table-wrap" tabindex="0" aria-label="National cheapest by speed tier table with horizontal scrolling">
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
      <p class="small-note">Compare every fake sample deal by postcode area, speed tier, and effective monthly price.</p>
      <div class="filter-row">
        <label for="postcode-filter">Filter by postcode area:</label>
        <select id="postcode-filter">
          <option value="all">All postcode areas</option>
          <option value="OX">OX</option>
          <option value="M">M</option>
          <option value="SW">SW</option>
        </select>
      </div>
      <p class="small-note scroll-tip">Tip: if needed, scroll sideways to see all columns.</p>
      <div class="table-wrap" tabindex="0" aria-label="Postcode area comparison table with horizontal scrolling">
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
              <th>Details</th>
            </tr>
          </thead>
          <tbody>${buildPostcodeRows(postcodeDeals)}
          </tbody>
        </table>
      </div>
    </section>
  </main>

  <script>
    const tableScrollContainers = document.querySelectorAll('.table-wrap');
    const postcodeFilter = document.getElementById('postcode-filter');
    const postcodeRows = document.querySelectorAll('#postcode-area-table tbody tr');

    tableScrollContainers.forEach((container) => {
      container.scrollLeft = 0;
    });

    window.addEventListener('load', () => {
      tableScrollContainers.forEach((container) => {
        container.scrollLeft = 0;
      });
    });

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


function buildDealDetailHtml(deal) {
  const calculatedPrice = calculateBroadbandPrice({
    ...deal,
    contractStartDate: deal.lastCheckedDate,
  });

  const priceRows = [
    ['Advertised monthly price', formatMoney(deal.advertisedMonthlyPrice)],
    ['Contract length', `${deal.contractLengthMonths} months`],
    ['Assumed contract start date', deal.lastCheckedDate],
    ['Annual April price rise', `${formatMoney(deal.annualAprilPriceRise)} per April`],
    ['Number of April price rises crossed', calculatedPrice.aprilsCrossed],
    ['Total monthly payments', formatMoney(calculatedPrice.totalMonthlyPayments)],
    ['Setup fee', formatMoney(deal.setupFee)],
    ['Installation fee', formatMoney(deal.installationFee)],
    ['Delivery fee', formatMoney(deal.deliveryFee)],
    ['Router fee', formatMoney(deal.routerFee)],
    ['Activation fee', formatMoney(deal.activationFee)],
    ['Other upfront costs', formatMoney(deal.otherUpfrontCosts)],
    ['Total fees', formatMoney(calculatedPrice.totalFees)],
    ['Voucher value', formatMoney(deal.voucherValue)],
    ['Reward card value', formatMoney(deal.rewardCardValue)],
    ['Cashback value', formatMoney(deal.cashbackValue)],
    ['Bill credit value', formatMoney(deal.billCreditValue)],
    ['Free months discount value', formatMoney(deal.freeMonthsDiscountValue)],
    ['Other discounts', formatMoney(deal.otherDiscounts)],
    ['Total rewards and discounts', formatMoney(calculatedPrice.totalRewardsAndDiscounts)],
    ['Total contract cost before rewards', formatMoney(calculatedPrice.totalContractCostBeforeRewards)],
    ['Total contract cost after rewards', formatMoney(calculatedPrice.totalContractCostAfterRewards)],
    ['Effective monthly price', formatMoney(calculatedPrice.effectiveMonthlyPrice)],
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(deal.dealId)} breakdown | UK Broadband Price Tracker</title>
  <style>
    :root {
      color-scheme: light;
      --page-bg: #f4f7fb;
      --card-bg: #ffffff;
      --text: #172033;
      --muted: #53627a;
      --border: #d8e2ef;
      --blue: #174ea6;
      --blue-dark: #102a56;
      --blue-soft: #eaf2ff;
      --green: #087443;
      --green-soft: #e8f7ef;
      --yellow: #fff3cd;
      --yellow-text: #7a4f01;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--page-bg);
      color: var(--text);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 16px;
      line-height: 1.55;
    }

    header,
    main {
      width: min(1100px, 100%);
      margin: 0 auto;
      padding: 24px;
    }

    header {
      padding-top: 40px;
      padding-bottom: 10px;
    }

    .hero,
    .card {
      border: 1px solid var(--border);
      border-radius: 18px;
      background: var(--card-bg);
      box-shadow: 0 2px 12px rgba(23, 32, 51, 0.06);
    }

    .hero {
      padding: 28px;
      background: linear-gradient(135deg, #ffffff 0%, #eef5ff 100%);
      box-shadow: 0 10px 30px rgba(23, 32, 51, 0.08);
    }

    .card {
      margin-bottom: 24px;
      padding: 22px;
    }

    h1,
    h2,
    p {
      margin-top: 0;
    }

    h1 {
      margin-bottom: 8px;
      font-size: clamp(2rem, 5vw, 3.2rem);
      line-height: 1.1;
      letter-spacing: -0.04em;
    }

    h2 {
      margin-bottom: 10px;
      font-size: clamp(1.35rem, 3vw, 1.75rem);
      line-height: 1.2;
    }

    a {
      color: var(--blue);
      font-weight: 700;
    }

    .badge {
      display: inline-flex;
      width: fit-content;
      margin-bottom: 14px;
      padding: 7px 12px;
      border: 1px solid #f0d88a;
      border-radius: 999px;
      background: var(--yellow);
      color: var(--yellow-text);
      font-size: 0.88rem;
      font-weight: 700;
    }

    .facts {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 18px;
    }

    .fact {
      padding: 14px;
      border: 1px solid #b8cff0;
      border-radius: 14px;
      background: #ffffff;
    }

    .fact-label {
      display: block;
      color: var(--muted);
      font-size: 0.85rem;
      font-weight: 700;
    }

    .fact-value {
      display: block;
      margin-top: 4px;
      font-weight: 800;
    }

    .table-wrap {
      width: 100%;
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: #ffffff;
      -webkit-overflow-scrolling: touch;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }

    th,
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e6ecf5;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: var(--blue-soft);
      color: var(--blue-dark);
      font-weight: 800;
    }

    tbody tr:last-child th,
    tbody tr:last-child td {
      border-bottom: 0;
    }

    tr:nth-child(even) td,
    tr:nth-child(even) th[scope="row"] {
      background: #fbfdff;
    }

    th[scope="row"] {
      width: 45%;
      background: #ffffff;
    }

    .money,
    .number {
      white-space: nowrap;
    }

    .effective-price {
      color: var(--green);
      font-weight: 800;
    }

    .small-note {
      color: var(--muted);
      font-size: 0.95rem;
    }

    @media (max-width: 760px) {
      header,
      main {
        padding: 16px;
      }

      header {
        padding-top: 18px;
      }

      .hero,
      .card {
        padding: 18px;
        border-radius: 16px;
      }

      .facts {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 460px) {
      header,
      main {
        padding: 12px;
      }

      .facts {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="hero">
      <a href="../index.html">← Back to main tracker</a>
      <p class="badge">Sample data only</p>
      <h1>${escapeHtml(deal.dealId)}</h1>
      <p>This static page explains the simple price calculation for one fake sample broadband deal.</p>
      <section class="facts" aria-label="Deal summary">
        <article class="fact">
          <span class="fact-label">Provider</span>
          <span class="fact-value">${escapeHtml(deal.provider)}</span>
        </article>
        <article class="fact">
          <span class="fact-label">Package name</span>
          <span class="fact-value">${escapeHtml(deal.packageName)}</span>
        </article>
        <article class="fact">
          <span class="fact-label">Postcode area</span>
          <span class="fact-value">${escapeHtml(deal.postcodeArea)}</span>
        </article>
        <article class="fact">
          <span class="fact-label">Source</span>
          <span class="fact-value">${escapeHtml(deal.source)}</span>
        </article>
        <article class="fact">
          <span class="fact-label">Speed Mbps</span>
          <span class="fact-value">${escapeHtml(deal.speedMbps)}</span>
        </article>
        <article class="fact">
          <span class="fact-label">Speed tier</span>
          <span class="fact-value">${escapeHtml(deal.speedTier)}</span>
        </article>
        <article class="fact">
          <span class="fact-label">Last checked date</span>
          <span class="fact-value">${escapeHtml(deal.lastCheckedDate)}</span>
        </article>
        <article class="fact">
          <span class="fact-label">Effective monthly price</span>
          <span class="fact-value effective-price">${formatMoney(calculatedPrice.effectiveMonthlyPrice)}</span>
        </article>
      </section>
    </div>
  </header>

  <main>
    <section class="card" aria-labelledby="price-summary-heading">
      <h2 id="price-summary-heading">Price summary</h2>
      <p class="small-note">The assumed contract start date is the sample deal's last checked date.</p>
      <div class="table-wrap" tabindex="0" aria-label="Price summary table with horizontal scrolling">
        <table>
          <tbody>${buildDetailRows(priceRows)}
          </tbody>
        </table>
      </div>
    </section>

    <section class="card" aria-labelledby="monthly-breakdown-heading">
      <h2 id="monthly-breakdown-heading">Month-by-month breakdown</h2>
      <p class="small-note">This shows how the monthly price changes when the contract crosses an April price rise.</p>
      <div class="table-wrap" tabindex="0" aria-label="Month-by-month breakdown table with horizontal scrolling">
        <table>
          <thead>
            <tr>
              <th>Month number</th>
              <th>Month date</th>
              <th>Monthly price</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>${buildMonthlyBreakdownRows(calculatedPrice.monthlyPrices)}
          </tbody>
        </table>
      </div>
    </section>
  </main>
</body>
</html>
`;
}

function createDealDetailPages(deals) {
  fs.mkdirSync(dealsFolder, { recursive: true });

  fs.readdirSync(dealsFolder)
    .filter((fileName) => fileName.endsWith('.html'))
    .forEach((fileName) => {
      fs.unlinkSync(path.join(dealsFolder, fileName));
    });

  return deals.map((deal) => {
    const filePath = path.join(dealsFolder, `${deal.dealId}.html`);
    fs.writeFileSync(filePath, buildDealDetailHtml(deal));
    return filePath;
  });
}

function buildStaticSite() {
  // Keep the export files fresh before reading them into the static page.
  exportPricingData();

  const nationalDeals = readJsonFile(exportFiles.nationalCheapestBySpeedTier);
  const postcodeDeals = readJsonFile(exportFiles.postcodeAreaComparison);
  const html = buildHtml(nationalDeals, postcodeDeals);

  fs.mkdirSync(siteFolder, { recursive: true });
  fs.writeFileSync(path.join(siteFolder, 'index.html'), html);
  const createdDealFiles = createDealDetailPages(sampleDeals);

  return {
    nationalDealCount: nationalDeals.length,
    postcodeDealCount: postcodeDeals.length,
    createdFile: path.join(siteFolder, 'index.html'),
    createdDealFiles,
  };
}

function main() {
  const summary = buildStaticSite();
  console.log('Static site build complete');
  console.log('==========================');
  console.log(`National rows: ${summary.nationalDealCount}`);
  console.log(`Postcode rows: ${summary.postcodeDealCount}`);
  console.log(`File created: ${path.relative(__dirname, summary.createdFile)}`);
  console.log(`Deal detail pages created: ${summary.createdDealFiles.length}`);
  console.log(`Deals folder: ${path.relative(__dirname, dealsFolder)}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildHtml,
  buildDealDetailHtml,
  buildStaticSite,
  escapeHtml,
  formatRewardSummary,
};
