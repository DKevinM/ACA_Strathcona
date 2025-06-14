const map = L.map('map',{layers:[openStreetMapLayer]}).setView([53.5636,-113.1802],9);
layerControl.addTo(map);

let existingMarkers = [];
const stationMarkers = [];

function clearMap() {
  existingMarkers.concat(stationMarkers, purpleAirMarkers)
    .forEach(m=>map.removeLayer(m));
  existingMarkers=[]; stationMarkers.length=0;
  document.querySelector("#weather-info").innerHTML="";
}

// Load JSON AQHI layer
fetch("https://raw.githubusercontent.com/DKevinM/AQHI_map/main/interpolated_grid.geojson")
  .then(r=>r.json())
  .then(data=>{
    const grid = L.geoJson(data,{
      style:f=>({fillColor:getColorgrid(f.properties.aqhi_str),weight:.5,opacity:.4,color:'white',dashArray:'3',fillOpacity:.4}),
      onEachFeature:(f,l)=>l.bindTooltip(`AQHI: ${f.properties.aqhi_str}`,{sticky:true,direction:'top',opacity:.8})
    });
    grid.addTo(map);
    layerControl.addOverlay(grid,"Interpolated AQHI Grid");
  });

// click handler
map.on('click', async e=>{
  clearMap();
  const {lat,lng}=e.latlng;

  // marker for click
  const clickM = L.marker([lat,lng]).addTo(map);
  existingMarkers.push(clickM);

  clickM.bindPopup(`Your location<br>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`).openPopup();

  // display closest AQ stations
  const closest = Object.values(dataByStation)
    .map(arr => arr[0]) // pick latest PM times
    .map(r=>({...r,dist:getDistance(lat,lng,r.Latitude,r.Longitude)}))
    .sort((a,b)=>a.dist-b.dist)
    .slice(0,2);

  closest.forEach(st=>{
    const stationRows = dataByStation[st.StationName] || [];
    const lines = stationRows.map(r=>`${r.Shortform}:${r.Value}${r.Units}`).join('<br>');
    const col = getAQHIColor(st.Value);

    const circ = L.circle([st.Latitude,st.Longitude],{
      radius:500,color:col,fillColor:col,fillOpacity:.5
    }).bindPopup(`<strong>${st.StationName}</strong><br>${lines}`).addTo(map);

    stationMarkers.push(circ);
  });

  // fetch & show weather
  const wresp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weathercode&timezone=America%2FEdmonton`);
  const wj = await wresp.json();
  showWeather(wj);  // from your existing showWeather() helper

  // add PurpleAir
  showPurpleAir(lat,lng);
});
