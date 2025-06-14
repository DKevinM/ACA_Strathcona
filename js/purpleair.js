let purpleAirData = [];
let purpleAirMarkers = [];

// Adjustment based on RH (US EPA correction style, can adjust)
function adjustPM25(pm25, rh) {
  if (!pm25 || !rh || isNaN(pm25) || isNaN(rh)) return -999;
  const correction = 0.534 * pm25 - 0.0844 * rh + 5.604;
  return Math.max(0, correction);
}

// Fetch PurpleAir sensors (modified to return top 3 closest)
async function fetchPurpleAirData(lat, lon) {
  const API_KEY = 'ED3E067C-0904-11ED-8561-42010A800005';
  const purpleAirUrl = `https://api.purpleair.com/v1/sensors?fields=name,latitude,longitude,pm2.5_60minute,humidity`;

  try {
    const response = await fetch(purpleAirUrl, {
      headers: { 'X-API-Key': API_KEY }
    });
    const raw = await response.json();
    
    purpleAirData = raw.data
      .map(s => ({
        name: s[1],
        lat: s[2],
        lon: s[3],
        pm25: adjustPM25(s[4], s[5]),
        rh: s[5]
      }))
      .filter(s => s.lat && s.lon && !isNaN(s.pm25));

    // Sort by distance to click point
    const sorted = purpleAirData
      .map(s => ({
        ...s,
        dist: getDistance(lat, lon, s.lat, s.lon)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    return sorted;

  } catch (err) {
    console.error("PurpleAir fetch failed:", err);
    return [];
  }
}

// Plot PurpleAir markers on map
function showPurpleAir(lat, lon) {
  purpleAirMarkers.forEach(m => map.removeLayer(m));
  purpleAirMarkers = [];

  fetchPurpleAirData(lat, lon).then(closestSensors => {
    closestSensors.forEach(sensor => {
      const color = sensor.pm25 > 80 ? "#cc0000"
                  : sensor.pm25 > 35 ? "#ff9900"
                  : sensor.pm25 > 12 ? "#ffff00"
                  : "#00cc00";

      const marker = L.circleMarker([sensor.lat, sensor.lon], {
        radius: 8,
        color: "#333",
        fillColor: color,
        fillOpacity: 0.8,
        weight: 1
      }).addTo(map);

      marker.bindPopup(`
        <b>PurpleAir Sensor</b><br>${sensor.name}<br>
        PM2.5 (adj): ${sensor.pm25.toFixed(1)} µg/m³<br>
        RH: ${sensor.rh.toFixed(1)}%
      `);

      purpleAirMarkers.push(marker);
    });
  });
}
