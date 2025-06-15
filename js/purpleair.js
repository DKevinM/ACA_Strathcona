let purpleAirMarkers = [];
window.purpleAirMarkers = purpleAirMarkers;


// PM2.5 adjustment based on RH (with validation)
function adjustPM25(pm25, rh) {
  if (pm25 === null || isNaN(pm25)) return null;
  if (rh === null || isNaN(rh)) rh = 50;

  if (rh < 30) {
    return pm25 / (1 + (0.24 / (100 / 30 - 1)));
  } else if (rh > 70) {
    return pm25 / (1 + (0.24 / (100 / 70 - 1)));
  } else {
    return pm25 / (1 + (0.24 / (100 / rh - 1)));
  }
}

// Color scale
function getPM25Color(pm25) {
  if (!pm25 || isNaN(pm25)) return "#808080";
  if (pm25 > 100) return "#640100";
  if (pm25 > 90) return "#9a0100";
  if (pm25 > 80) return "#cc0001";
  if (pm25 > 70) return "#fe0002";
  if (pm25 > 60) return "#fd6866";
  if (pm25 > 50) return "#ff9835";
  if (pm25 > 40) return "#ffcb00";
  if (pm25 > 30) return "#fffe03";
  if (pm25 > 20) return "#016797";
  return "#01cbff";
}

// Distance in meters between two points
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Fetch PurpleAir sensors and compute distances
async function fetchPurpleAirData(clickLat, clickLon) {
  const API_KEY = 'ED3E067C-0904-11ED-8561-42010A800005';
  const url = 'https://api.purpleair.com/v1/sensors?fields=name,latitude,longitude,pm2.5_60minute,humidity';

  try {
    const resp = await fetch(url, {
      headers: { 'X-API-Key': API_KEY }
    });

    const data = await resp.json();

    return data.data.map(s => {
      const pm25 = parseFloat(s[4]);
      const rh = parseFloat(s[5]);
      const adjusted = adjustPM25(pm25, rh);
      const lat = parseFloat(s[2]);
      const lon = parseFloat(s[3]);

      return {
        name: s[1],
        lat,
        lon,
        rh,
        pm25: adjusted,
        dist: getDistance(clickLat, clickLon, lat, lon)
      };
    }).filter(s => !isNaN(s.dist) && s.pm25 !== null)
      .sort((a, b) => a.dist - b.dist);
  } catch (err) {
    console.error("Error fetching PurpleAir data:", err);
    return [];
  }
}

// Add PurpleAir markers to map
window.showPurpleAir = function(clickLat, clickLon) {
  // Clear previous markers
  purpleAirMarkers.forEach(m => map.removeLayer(m));
  purpleAirMarkers = [];

  fetchPurpleAirData(clickLat, clickLon).then(sensors => {
    if (!sensors.length) return;

 const top3 = sensors.slice(0, 3);

    // Show 3 closest sensors
top3.forEach(s => {
  const corrected = adjustPM25(s.pm25, s.rh);
  const marker = L.circleMarker([s.lat, s.lon], {
    radius: 7.5,
    fillColor: getPM25Color(corrected),
    color: "#000",
    fillOpacity: 0.75,
    weight: 1
  }).bindPopup(
    `<b>PurpleAir Sensor</b><br>
     Name: ${s.name}<br>
     PM2.5 (Corrected): ${corrected.toFixed(1)} µg/m³<br>
     Distance: ${(s.dist / 1000).toFixed(2)} km`
  ).addTo(map);

  purpleAirMarkers.push(marker);
    });

    // Optional: highlight the closest one differently
    const closest = sensors[0];
    const closestMarker = L.circle([closest.lat, closest.lon], {
      radius: 300,
      color: getPM25Color(closest.pm25),
      fillOpacity: 0,
      weight: 2,
      dashArray: '4'
    }).addTo(map);

    purpleAirMarkers.push(closestMarker);
  });
}
