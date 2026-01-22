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
  PA_KEY = os.getenv("PA_dk")
  const API_KEY = PA_KEY;
  const url = 'https://api.purpleair.com/v1/sensors?fields=name,last_seen,latitude,longitude,pm2.5_60minute,humidity';

  try {
    const resp = await fetch(url, {
      headers: { 'X-API-Key': API_KEY }
    });

    const data = await resp.json();
    const fields = data.fields;
    const rows = data.data;

    console.log("Returned field order:", fields);

    const get = (row, fieldName) => {
      const index = fields.indexOf(fieldName);
      return index !== -1 ? row[index] : null;
    };

    // Map and filter valid sensors
    const sensors = rows.map(row => {
      const name = get(row, "name");
      const last_seen = get(row, "last_seen");
      const lat = parseFloat(get(row, "latitude"));
      const lon = parseFloat(get(row, "longitude"));
      const pm25_raw = parseFloat(get(row, "pm2.5_60minute"));
      const rh = parseFloat(get(row, "humidity"));
      const dist = getDistance(clickLat, clickLon, lat, lon);

      if (!isNaN(lat) && !isNaN(lon) && !isNaN(pm25_raw)) {
        return { name, last_seen, lat, lon, rh, pm25_raw, dist };
      } else {
        return null;
      }
    }).filter(x => x !== null);

    // Sort by distance and return
    return sensors.sort((a, b) => a.dist - b.dist);

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
    console.log("Returned PurpleAir sensors:", sensors); // Debug log
    
    if (!sensors.length) return;

 const top3 = sensors.slice(0, 3);

    // Show 3 closest sensors
    top3.forEach(s => {
      const corrected = adjustPM25(s.pm25_raw, s.rh);
    
      const timeStr = new Date(s.last_seen * 1000).toLocaleString("en-CA", {
        timeZone: "America/Edmonton",
        hour12: false,  // change to true for AM/PM
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    
      const marker = L.circleMarker([s.lat, s.lon], {
        radius: 10,
        fillColor: getPM25Color(corrected),
        color: "#000",
        fillOpacity: 0.75,
        weight: 1
      })
      .bindTooltip(
        `<b>PurpleAir</b><br>${s.name}<br>PM2.5: ${corrected.toFixed(1)} µg/m³<br>RH: ${s.rh}%<br>Time: ${timeStr}<br>${(s.dist / 1000).toFixed(2)} km`,
        {
          sticky: true,
          direction: 'top',
          opacity: 0.9
        }
      )
      .addTo(map);
    
      purpleAirMarkers.push(marker);
    });

  });
}
