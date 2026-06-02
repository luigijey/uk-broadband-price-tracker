export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Project foundation</p>
        <h1>UK Broadband Price Tracker</h1>
        <p>
          A future UK residential broadband comparison website focused on clear,
          postcode-area pricing and realistic effective monthly costs.
        </p>
      </section>

      <section className="card-grid" aria-label="Planned comparison features">
        <article>
          <h2>Compare by postcode area</h2>
          <p>
            The first version will help visitors compare residential broadband
            deals available for a UK postcode area.
          </p>
        </article>
        <article>
          <h2>Advertised price</h2>
          <p>
            Deals will show the headline monthly price providers advertise.
          </p>
        </article>
        <article>
          <h2>Effective monthly price</h2>
          <p>
            The calculator will also account for contract length, April price
            rises, fees, vouchers, cashback, credits, free months and discounts.
          </p>
        </article>
      </section>
    </main>
  );
}
