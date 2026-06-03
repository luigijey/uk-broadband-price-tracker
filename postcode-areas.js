// Beginner-friendly Postcode Area V1 starter list.
//
// These broad postcode areas are used only to group active national candidate
// deals for the first postcode-area prototype. They are not postcode-level
// availability checks.

const postcodeAreas = [
  // London
  { postcodeArea: 'SW', regionName: 'London', country: 'England', enabled: true },
  { postcodeArea: 'SE', regionName: 'London', country: 'England', enabled: true },
  { postcodeArea: 'NW', regionName: 'London', country: 'England', enabled: true },
  { postcodeArea: 'N', regionName: 'London', country: 'England', enabled: true },
  { postcodeArea: 'E', regionName: 'London', country: 'England', enabled: true },
  { postcodeArea: 'W', regionName: 'London', country: 'England', enabled: true },
  { postcodeArea: 'EC', regionName: 'London', country: 'England', enabled: true },
  { postcodeArea: 'WC', regionName: 'London', country: 'England', enabled: true },

  // South and South East England
  { postcodeArea: 'OX', regionName: 'South East England', country: 'England', enabled: true },
  { postcodeArea: 'SO', regionName: 'South East England', country: 'England', enabled: true },
  { postcodeArea: 'BN', regionName: 'South East England', country: 'England', enabled: true },
  { postcodeArea: 'MK', regionName: 'South East England', country: 'England', enabled: true },
  { postcodeArea: 'RG', regionName: 'South East England', country: 'England', enabled: true },

  // East of England
  { postcodeArea: 'CB', regionName: 'East of England', country: 'England', enabled: true },

  // Midlands
  { postcodeArea: 'B', regionName: 'West Midlands', country: 'England', enabled: true },
  { postcodeArea: 'NG', regionName: 'East Midlands', country: 'England', enabled: true },

  // South West England
  { postcodeArea: 'BS', regionName: 'South West England', country: 'England', enabled: true },

  // Wales
  { postcodeArea: 'CF', regionName: 'South Wales', country: 'Wales', enabled: true },

  // Scotland
  { postcodeArea: 'G', regionName: 'Scotland', country: 'Scotland', enabled: true },
  { postcodeArea: 'EH', regionName: 'Scotland', country: 'Scotland', enabled: true },

  // North West England
  { postcodeArea: 'M', regionName: 'North West England', country: 'England', enabled: true },
  { postcodeArea: 'L', regionName: 'North West England', country: 'England', enabled: true },

  // Yorkshire and North East England
  { postcodeArea: 'LS', regionName: 'Yorkshire and the Humber', country: 'England', enabled: true },
  { postcodeArea: 'NE', regionName: 'North East England', country: 'England', enabled: true },
  { postcodeArea: 'S', regionName: 'Yorkshire and the Humber', country: 'England', enabled: true },
];

module.exports = postcodeAreas;
