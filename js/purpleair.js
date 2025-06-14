let purpleAirMarkers = [];

function adjustPM25(pm25, rh) {
  if (isNaN(pm25)||isNaN(rh)) return pm25;
  return Math.max(0,0.534*pm25 - 0.0844*rh + 5.604);
}

async function fetchPurpleAirData(clickLat, clickLon) {
  const API_KEY = 'ED3E067C-0904-11ED-8561-42010A800005';
  const url = 'https://api.purpleair.com/v1/sensors?fields=name,latitude,longitude,pm2.5_60minute,humidity';
  const resp = await fetch(url,{headers:{'X-API-Key':API_KEY}});
  const jr = await resp.json();
  return jr.data
    .map(s=>({
      name:s[1],lat:s[2],lon:s[3],
      pm25:adjustPM25(s[4],s[5]),
      rh:s[5],
      dist:getDistance(clickLat,clickLon,s[2],s[3])
    }))
    .filter(s=>!isNaN(s.dist))
    .sort((a,b)=>a.dist-b.dist)
    .slice(0,3);
}

function showPurpleAir(lat,lon) {
  purpleAirMarkers.forEach(m=>map.removeLayer(m));
  purpleAirMarkers=[];

  fetchPurpleAirData(lat,lon).then(sensors=>{
    sensors.forEach(s=>{
      const col = s.pm25>80?"#cc0000":s.pm25>35?"#ff9900":s.pm25>12?"#ffff00":"#00cc00";
      const m = L.circleMarker([s.lat,s.lon],{radius:8,fillColor:col,color:"#333",fillOpacity:0.8,weight:1})
        .bindPopup(`<b>PurpleAir:</b> ${s.name}<br>PM₂.₅: ${s.pm25.toFixed(1)} μg/m³<br>RH: ${s.rh.toFixed(1)}%`)
        .addTo(map);
      purpleAirMarkers.push(m);
    });
  });
}
