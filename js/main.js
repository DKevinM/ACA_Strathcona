// ------- Map Initialization -------
const openStreetMapLayer = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  { attribution: '&copy; OpenStreetMap contributors' }
);

const satelliteLayer = L.tileLayer(
  'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
  { subdomains: ['mt0','mt1','mt2','mt3'], attribution: '&copy; Google' }
);

const map = L.map('map', { layers: [openStreetMapLayer] })
  .setView([53.56, -113.18], 9);

const layerControl = L.control.layers(
  { 'OSM': openStreetMapLayer, 'Satellite': satelliteLayer },
  {}
).addTo(map);

// AQHI Grid Overlay
fetch("https://raw.githubusercontent.com/DKevinM/AQHI_map/main/interpolated_grid.geojson")
  .then(r => r.json())
  .then(data => {
    const grid = L.geoJson(data, {
      style: f => ({
        fillColor: getColorgrid(f.properties.aqhi_str),
        color: 'white', weight: 0.5, dashArray: '3', fillOpacity: 0.4
      }),
      onEachFeature: (f, l) => {
        const c = getColorgrid(f.properties.aqhi_str);
        l.bindTooltip(`<div style="color:${c};font-weight:bold">AQHI: ${f.properties.aqhi_str}</div>`, {
          sticky: true, direction: 'top', opacity: 0.8
        });
      }
    }).addTo(map);
    layerControl.addOverlay(grid, "Interpolated AQHI Grid");
  });

// ------- State -------
let existingMarkers = [];
let stationMarkers = [];

// ------- Utility Functions -------
function clearAll() {
  existingMarkers.forEach(m => map.removeLayer(m));
  stationMarkers.forEach(m => map.removeLayer(m));
  existingMarkers = [];
  stationMarkers = [];
  document.querySelector("#weather-info").innerHTML = '';
}

// Distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3, toRad = x => x * Math.PI/180;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getAQHIColor(aqhi) {
  const v = parseFloat(aqhi);
  if (isNaN(v)) return "#808080";
  const thresholds = [10,9,8,7,6,5,4,3,2,1];
  const colors = ["#9a0100","#cc0001","#fe0002","#fd6866","#ff9835","#ffcb00","#fffe03","#016797","#0099cb","#01cbff"];
  return colors[thresholds.findIndex(t => v>=t)] || "#01cbff";
}

// ------- Closest Stations & Popups -------
function showClosest(lat, lon) {
  if (!recentData.length) return;

  const stations = Object.values(dataByStation).map(arr => arr[0]);
  const sorted = stations
    .map(s => ({...s, dist: getDistance(lat, lon, parseFloat(s.Latitude), parseFloat(s.Longitude))}))
    .sort((a,b) => a.dist - b.dist)
    .slice(0, 2);

  sorted.forEach(st => {
    const marker = L.circleMarker(
      [st.Latitude, st.Longitude],
      { radius: 10, fillColor: getAQHIColor(st.Value), color: "#333", weight: 1, fillOpacity: 0.8 }
    ).addTo(map);

    const rows = getLatestStationData(st.StationName)
      .map(d => `<tr><td>${d.ParameterName}</td><td>${d.Value.toFixed(1)}</td></tr>`).join('');
    const html = `<strong>${st.StationName}</strong><br>${st.ReadingDate}<br><table>${rows}</table>`;
    marker.bindPopup(html);

    stationMarkers.push(marker);
  });
}

// ------- Click Event & Weather Fetch -------
map.on('click', ({ latlng }) => {
  clearAll();

  const { lat, lng } = latlng;
  const m = L.marker([lat, lng]).addTo(map);
  m.bindPopup(`Selected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`).openPopup();
  existingMarkers.push(m);

  showClosest(lat, lng);

  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode&timezone=America%2FEdmonton`)
    .then(r => r.json())
    .then(w => {
      const now = new Date().toLocaleString('en-CA', { timeZone: 'America/Edmonton' });
      const i = w.hourly.time.findIndex(t => t.startsWith(now.slice(0,13)));
      const mod = i < 0 ? 0 : i;

      const info = [
        ["Temp", w.hourly.temperature_2m[mod]+" °C"],
        ["RH", w.hourly.relative_humidity_2m[mod]+" %"],
        ["Wind", w.hourly.wind_speed_10m[mod]+" km/h"]
      ].map(r => `<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td></tr>`).join('');

      document.querySelector("#weather-info").innerHTML = `
        <h3>Weather (local)</h3><table>${info}</table>`;
    });
});

// ------- Locate Button -------
document.getElementById('location-button').addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition(p => {
    map.setView([p.coords.latitude, p.coords.longitude], 14);
  });
});
