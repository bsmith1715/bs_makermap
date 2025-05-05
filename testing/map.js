// map.js

// const sheetURL = 'https://corsproxy.io/?https://docs.google.com/spreadsheets/d/e/2PACX-1vRReOPAKLrm2davbebtLVylsxuinAF0IxnYz-vFFZvWD34M8ftfQmcFKmwA7-tYsfGDp5Jtcsc69_IG/pub?output=csv';
const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRReOPAKLrm2davbebtLVylsxuinAF0IxnYz-vFFZvWD34M8ftfQmcFKmwA7-tYsfGDp5Jtcsc69_IG/pub?output=csv';

let map;
let pinLayer;
let zipHeatLayer;

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
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-greeb.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Add more colors as needed


function getColor(value, max) {
  const percent = value / max;
  return percent > 0.80 ? '#006d2c'
    : percent > 0.60 ? '#338d5b'
    : percent > 0.40 ? '#66ad89'
    : percent > 0.20 ? '#99ccb8'
    : percent > 0 ? '#ccece6'
    : '#F0F0F0';
}

async function loadData() {
  const response = await fetch(sheetURL);
  const text = await response.text();
  const rows = text.split('\n').slice(1); // Skip header
  return rows
    .map(row => row.split(','))
    .filter(cols => cols.length >= 4 && cols[2] && cols[3])
    .map(cols => ({
      zip: cols[1],
      lat: parseFloat(cols[2]),
      lon: parseFloat(cols[3])
    }));
}

async function createMap() {
  map = L.map('map').setView([43.0702, -76.2176], 8); // Center on USA

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & Carto',
    subdomains: 'abcd'
  }).addTo(map);

  // Add in the county lines
  fetch('https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json')
    .then(response => response.json())
    .then(geojson => {
      L.geoJSON(geojson, {
        style: {
          color: "#444",
          weight: 0.5,
          fillOpacity: 0,
          opacity: 0.3
        }
      }).addTo(map);
    });

  const data = await loadData();
  const zipCounts = {};
  data.forEach(({ zip }) => {
    zipCounts[zip] = (zipCounts[zip] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(zipCounts));

pinLayer = L.layerGroup();
data.forEach(({ zip, lat, lon }) => {
  const count = zipCounts[zip];
  let iconToUse = blueIcon;
  if (count > 10) {
    iconToUse = redIcon;
  } else if (count > 5) {
    iconToUse = greenIcon;
  }

  L.marker([lat, lon], { icon: iconToUse })
    .bindPopup(`${count} visit(s) from ${zip}`)
    .addTo(pinLayer);
});



  fetch('zip_geojson.json')
    .then(response => response.json())
    .then(geojson => {
      zipHeatLayer = L.geoJSON(geojson, {
        style: feature => {
          const zip = feature.properties.ZCTA5CE10;
          const count = zipCounts[zip] || 0;
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
          const count = zipCounts[zip] || 0;
          if (count > 0) {
            layer.bindPopup(`ZIP ${zip}: ${count} visit(s)`);
          }
        }
      });
      const lastMode = localStorage.getItem('mapViewMode') || 'pins';
      if (lastMode === 'zipHeatmap') {
        zipHeatLayer.addTo(map);
      } else {
        pinLayer.addTo(map);
      }
    });

  // Add in the state lines
  fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
    .then(response => response.json())
    .then(stateGeo => {
      L.geoJSON(stateGeo, {
        style: {
          color: "#3432a8",
          weight: 1,
          opacity: 0.4,
          fillOpacity: 0
        }
      }).addTo(map);
    });
}

createMap();

window.toggleView = function(mode) {
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

setInterval(() => {
  location.reload();
}, 60000);
