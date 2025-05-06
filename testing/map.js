const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0LuoEAt5aBA4fetdRj_bj0inLdIReDAMMP8mT6jHdaErZh7lmZqtDUlDmtdlwuKFQpTwILYmzHPJh/pub?output=csv';

let map;
let pinLayer;
let zipHeatLayer;

// Define colored icons
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

async function loadData() {
  const response = await fetch(sheetURL);
  const text = await response.text();
  const rows = text.split('\n').slice(1); // Skip header

  return rows
    .map(row => row.split(','))
    .filter(cols => cols.length >= 6 && cols[4] && cols[5])
    .map(cols => ({
      country: cols[1].trim(),
      code: cols[2].trim(),
      lat: parseFloat(cols[4]),
      lon: parseFloat(cols[5])
    }));
}

async function createMap() {
  map = L.map('map').setView([43.0702, -76.2176], 8);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & Carto',
    subdomains: 'abcd'
  }).addTo(map);

  const data = await loadData();
  const zipCounts = {};
  data.forEach(({ country, code }) => {
    const key = `${country}-${code}`;
    zipCounts[key] = (zipCounts[key] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(zipCounts));
  pinLayer = L.layerGroup();

  data.forEach(({ country, code, lat, lon }) => {
    const key = `${country}-${code}`;
    const count = zipCounts[key];

    let iconToUse = blueIcon;
    if (count > 10) {
      iconToUse = redIcon;
    } else if (count > 5) {
      iconToUse = greenIcon;
    }

    L.marker([lat, lon], { icon: iconToUse })
      .bindPopup(`${country} ${code}: ${count} visit(s)`)
      .addTo(pinLayer);
  });

  fetch('zip_geojson.json')
    .then(response => response.json())
    .then(geojson => {
      zipHeatLayer = L.geoJSON(geojson, {
        style: feature => {
          const zip = feature.properties.ZCTA5CE10;
          const key = `US-${zip}`;
          const count = zipCounts[key] || 0;
          return {
            fillColor: getColor(count, maxCount),
            fillOpacity: 1,
            color: '#222',
            weight: 0.5,
            opacity: 0.3
          };
        },
        onEachFeature: (feature, layer) => {
          const zip = feature.properties.ZCTA5CE10;
          const key = `US-${zip}`;
          const count = zipCounts[key] || 0;
          if (count > 0) {
            layer.bindPopup(`ZIP ${zip}: ${count} visit(s)`);
          }
        }
      });

      // Ensure initial state based on previous selection
      const lastMode = localStorage.getItem('mapViewMode') || 'pins';
      if (lastMode === 'zipHeatmap') {
        zipHeatLayer.addTo(map);
      } else {
        pinLayer.addTo(map);
      }
    });

  pinLayer.addTo(map);
}

// Ensure `toggleView` function is available globally
window.toggleView = function (mode) {
  if (!zipHeatLayer || !pinLayer) return;
  if (mode === 'pins') {
    map.removeLayer(zipHeatLayer);
    map.addLayer(pinLayer);
  } else if (mode === 'zipHeatmap') {
    map.removeLayer(pinLayer);
    map.addLayer(zipHeatLayer);
  }
  localStorage.setItem('mapViewMode', mode);
};

// Auto-refresh every 60 seconds
setInterval(() => {
  location.reload();
}, 60000);

createMap();
