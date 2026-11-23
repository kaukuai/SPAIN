// Our accommodation in each city, from the Google Maps links the team shared
// (coordinates read from each link's place pin). Shown in the itinerary, daily maps and 3D world.
export const LODGING = {
  madrid: { name: 'Arenal Suites Madrid', city: '馬德里', nights: '12/24–12/26', url: 'https://maps.app.goo.gl/hL9GMuZLLkVJYcvt9', coordinates: [40.4171846, -3.70543] },
  sevilla: { name: 'Enjoy Plaza España', city: '塞維亞', nights: '12/26–12/28', url: 'https://maps.app.goo.gl/DAmWHd7m2dsNcibKA', coordinates: [37.378562, -5.9828305] },
  granada: { name: 'Sercotel Granada Suites', city: '格拉納達', nights: '12/28–12/29', url: 'https://maps.app.goo.gl/XMv6kriDBPsXraTXA', coordinates: [37.1743268, -3.6013861] },
  barcelona: { name: 'Inside Barcelona Apartments Princep', city: '巴塞隆納', nights: '12/29–1/3', url: 'https://maps.app.goo.gl/7N1XSUejbpYKLui17', coordinates: [41.375986, 2.147028] },
};
export const lodgingKey = city => `${city}|hotel`;
