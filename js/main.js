const openStreetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
});
const satelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google'
});

const map = L.map('map', { layers: [openStreetMapLayer, satelliteLayer ] }).setView([53.5636, -113.1802], 9);
const baseLayers = {
  "OpenStreetMap": openStreetMapLayer,
  'Satellite': satelliteLayer
};

const overlays = {};

const layerControl = L.control.layers(baseLayers, overlays).addTo(map);


let existingMarkers = [];

const stationMarkers = [];

function clearMap() {
  const allMarkers = existingMarkers.concat(stationMarkers, window.purpleAirMarkers || []);
  allMarkers.forEach(m => map.removeLayer(m));

  existingMarkers = [];
  stationMarkers.length = 0;
  window.purpleAirMarkers = [];  // Critical line
}

// Reset Map Button Handler
document.getElementById('reset-button').addEventListener('click', () => {
  clearMap();
  map.setView([53.5636, -113.1802], 9); // Reset to default view
});

// Zoom to My Current Location Button Handler
document.getElementById('location-button').addEventListener('click', function () {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        map.setView([lat, lng], 15);
        const marker = L.marker([lat, lng])
          .addTo(map)
          .bindPopup("You are here!")
          .openPopup();
        existingMarkers.push(marker); // Optional: track this marker too
      },
      error => {
        console.error("Geolocation failed: ", error);
        alert("Unable to access your location. Please check your browser settings.");
      }
    );
  } else {
    alert("Geolocation is not supported by your browser.");
  }
});



// Haversine formula
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getAQHIColor(aqhi) {
  if (!aqhi || isNaN(aqhi)) return "#808080";
  const value = parseFloat(aqhi);
  if (value >= 10) return "#9a0100";
  if (value === 9) return "#cc0001";
  if (value === 8) return "#fe0002";
  if (value === 7) return "#fd6866";
  if (value === 6) return "#ff9835";
  if (value === 5) return "#ffcb00";
  if (value === 4) return "#fffe03";
  if (value === 3) return "#016797";
  if (value === 2) return "#0099cb";
  return "#01cbff";
}

function getWindDirectionLabel(degrees) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % 8];
}

function showWeather(data) {
  const edmontonNow = new Date();
  let i = 0;
  while (i < data.hourly.time.length) {
    const t = new Date(data.hourly.time[i]);
    if (t >= edmontonNow) break;
    i++;
  }

  const get = (field) => data.hourly[field][i];
  const weather = {
    time: new Date().toLocaleString('en-CA', {
      timeZone: 'America/Edmonton',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }),
    temperature: get("temperature_2m"),
    humidity: get("relative_humidity_2m"),
    precipitation: get("precipitation"),
    rain: get("rain"),
    snowfall: get("snowfall"),
    cloudcover: get("cloudcover"),
    uv: get("uv_index"),
    wind_speed: get("wind_speed_10m"),
    wind_direction: get("wind_direction_10m"),
    wind_gusts: get("wind_gusts_10m"),
    weathercode: get("weathercode")
  };

  const weatherCodeMap = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
    55: "Dense drizzle", 56: "Light freezing drizzle", 57: "Dense freezing drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    66: "Light freezing rain", 67: "Heavy freezing rain",
    71: "Slight snowfall", 73: "Moderate snowfall", 75: "Heavy snowfall",
    77: "Snow grains", 80: "Slight rain showers", 81: "Moderate rain showers",
    82: "Violent rain showers", 85: "Slight snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm w/ slight hail", 99: "Thunderstorm w/ heavy hail"
  };

  const desc = weatherCodeMap[weather.weathercode] || "Unknown";

  const rows = [
    ["Time", weather.time],
    ["Condition", desc],
    ["Temperature", `${weather.temperature} °C`],
    ["Humidity", `${weather.humidity} %`],
    ["Precipitation", `${weather.precipitation} mm`],
    ["Rain", `${weather.rain} mm`],
    ["Snowfall", `${weather.snowfall} cm`],
    ["Cloud Cover", `${weather.cloudcover} %`],
    ["UV Index", weather.uv],
    ["Wind Speed", `${weather.wind_speed} km/h`],
    ["Wind Gusts", `${weather.wind_gusts} km/h`],
    ["Wind Direction", `
      ${weather.wind_direction}° (from ${getWindDirectionLabel(weather.wind_direction)})
      <span class="wind-arrow" style="display:inline-block; transform: rotate(${(weather.wind_direction + 180) % 360}deg);">↑</span>`
    ]
  ];

  const currentTable = rows.map(row =>
    `<tr><td><strong>${row[0]}</strong></td><td>${row[1]}</td></tr>`).join("");

  const forecastRows = [];
  for (let j = i + 1; j <= i + 6 && j < data.hourly.time.length; j++) {
    forecastRows.push(`<tr>
      <td>${data.hourly.time[j].slice(11, 16)}</td>
      <td>${data.hourly.temperature_2m[j]} °C</td>
      <td>${data.hourly.wind_speed_10m[j]} km/h</td>
      <td>${data.hourly.uv_index[j]}</td>
      <td>${data.hourly.rain[j]} mm</td>
    </tr>`);
  }

  document.querySelector("#weather-info").innerHTML = `
    <h3>Current Weather</h3>
    <table id="weather-table"><tbody>${currentTable}</tbody></table>
    <h4 style="margin-top:15px;">Forecast (Next 6 Hours)</h4>
    <table style="font-size:13px;">
      <thead>
        <tr><th>Time</th><th>Temp</th><th>Wind</th><th>UV</th><th>Rain</th></tr>
      </thead>
      <tbody>${forecastRows.join("")}</tbody>
    </table>
  `;
}

// Load AQHI interpolated grid
fetch("https://raw.githubusercontent.com/DKevinM/AQHI_map/main/interpolated_grid.geojson")
  .then(r => r.json())
  .then(data => {
    const grid = L.geoJson(data, {
      style: f => ({
        fillColor: getAQHIColor(f.properties.aqhi_str),
        weight: 0.5,
        opacity: 0.4,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.4
      }),
      onEachFeature: (f, l) => l.bindTooltip(`AQHI: ${f.properties.aqhi_str}`, {
        sticky: true,
        direction: 'top',
        opacity: 0.8
      })
    });
    grid.addTo(map);
    layerControl.addOverlay(grid, "Interpolated AQHI Grid");
  });

// On map click
map.on('click', function (e) {
  const { lat, lng } = e.latlng;

  (async function () {
    clearMap();

    const marker = L.marker([lat, lng]).addTo(map);
    existingMarkers.push(marker);
    marker.bindTooltip(`Your location<br>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`, {
      sticky: true,
      direction: 'top',
      opacity: 0.9
    }).openTooltip();

  // Nearest AQHI stations
  const closest = Object.values(dataByStation)
    .map(arr => arr[0])
    .map(r => ({ ...r, dist: getDistance(lat, lng, r.Latitude, r.Longitude) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 2);

    closest.forEach(st => {
      const rows = dataByStation[st.StationName]
        .map(r => `${r.Shortform}: ${r.Value}${r.Units} (${r.ReadingDate})`)
        .join('<br>');

  const color = getAQHIColor(st.Value);

const circle = L.circleMarker([st.Latitude, st.Longitude], {
  radius: 15,
  color: "#000",
  fillColor: color,
  weight: 3,
  fillOpacity: 0.8
      }).bindTooltip(
        `<strong>${st.StationName}</strong><br>${rows}<br>Distance: ${(st.dist / 1000).toFixed(2)} km`,
        { sticky: true, direction: 'top', opacity: 0.9 }
      ).addTo(map).openTooltip();

      stationMarkers.push(circle);
    });


  // Weather data
    try {
      const wresp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m,precipitation,rain,snowfall,cloudcover,uv_index,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weathercode&timezone=America%2FEdmonton`);
      const wdata = await wresp.json();
      showWeather(wdata);
    } catch (err) {
      console.error("Error fetching weather data", err);
    }

    // --- PurpleAir ---
    showPurpleAir(lat, lng);

  })(); // End async IIFE
});
