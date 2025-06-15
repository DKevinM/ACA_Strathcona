// data.js
let recentData = [];
let dataByStation = {};
window.dataByStation = dataByStation; 


const unitsLookup = {
  "AQHI": "", "Ozone": "ppb", "Total Oxides of Nitrogen": "ppb",
  "Hydrogen Sulphide": "ppb", "Total Reduced Sulphur": "ppb", "Sulphur Dioxide": "ppb",
  "Fine Particulate Matter": "µg/m³", "Total Hydrocarbons": "ppm", "Carbon Monoxide": "ppm",
  "Wind Direction": "degrees", "Relative Humidity": "%", "Outdoor Temperature": "°C",
  "Nitric Oxide": "ppb", "Wind Speed": "km/hr", "Non-methane Hydrocarbons": "ppm",
  "Nitrogen Dioxide": "ppb", "Methane": "ppm"
};

const abbrLookup = {
  "AQHI": "AQHI", "Ozone": "O₃", "Total Oxides of Nitrogen": "NOx",
  "Hydrogen Sulphide": "H₂S", "Total Reduced Sulphur": "TRS", "Sulphur Dioxide": "SO₂",
  "Fine Particulate Matter": "PM2.5", "Total Hydrocarbons": "THC", "Carbon Monoxide": "CO",
  "Wind Direction": "wd", "Relative Humidity": "RH", "Outdoor Temperature": "ET",
  "Nitric Oxide": "NO", "Wind Speed": "ws", "Non-methane Hydrocarbons": "NMHC",
  "Nitrogen Dioxide": "NO₂", "Methane": "CH₄"
};

const shortLookup = {
  "AQHI": "AQHI", "Ozone": "O3", "Total Oxides of Nitrogen": "NOX",
  "Hydrogen Sulphide": "H2S", "Total Reduced Sulphur": "TRS", "Sulphur Dioxide": "SO2",
  "Fine Particulate Matter": "PM2.5", "Total Hydrocarbons": "THC", "Carbon Monoxide": "CO",
  "Wind Direction": "wd", "Relative Humidity": "RH", "Outdoor Temperature": "ET",
  "Nitric Oxide": "NO", "Wind Speed": "ws", "Non-methane Hydrocarbons": "NMHC",
  "Nitrogen Dioxide": "NO2", "Methane": "CH4"
};

fetch('https://raw.githubusercontent.com/DKevinM/AB_datapull/main/data/last6h.csv')
  .then(res => res.text())
  .then(text => {
    const rows = text.trim().split('\n');
    const headers = rows.shift().split(',');

    const raw = {};
    rows.forEach(line => {
      const cols = line.split(',');
      const e = Object.fromEntries(headers.map((h,i)=>[h,cols[i]]));
      if (!e.Latitude||!e.Longitude||isNaN(e.Latitude)||isNaN(e.Longitude)) return;

      e.ParameterName = e.ParameterName||"AQHI";
      e.Units = unitsLookup[e.ParameterName]||"";
      e.Abbreviation = abbrLookup[e.ParameterName]||"";
      e.Shortform = shortLookup[e.ParameterName]||"";

      let v = parseFloat(e.Value);
      if (["Ozone","Total Oxides of Nitrogen","Hydrogen Sulphide","Total Reduced Sulphur","Sulphur Dioxide","Nitric Oxide","Nitrogen Dioxide"].includes(e.ParameterName)) {
        v *= 1000;
      }
      if (isNaN(v)) return;
      e.Value = v;

      const utc = new Date(e.ReadingDate);
      e.ReadingDate = utc.toLocaleString("en-CA",{ timeZone:"America/Edmonton" });

      raw[e.StationName] = raw[e.StationName]||[];
      raw[e.StationName].push(e);
    });

    Object.entries(raw).forEach(([station, arr]) => {
      arr.sort((a,b)=>new Date(b.ReadingDate)-new Date(a.ReadingDate));
      const byParam = {};
      arr.forEach(e => {
        const param = e.ParameterName;
        if (!byParam[param] || new Date(e.ReadingDate) > new Date(byParam[param].ReadingDate)) {
          byParam[param] = e;
        }
      });
      dataByStation[station] = Object.values(byParam);
      recentData.push(...dataByStation[station]);
    });
  });


window.fetchRecentStationData = function(stationName) {
  if (!dataByStation[stationName]) {
    return Promise.resolve("<b>No data found for this station.</b>");
  }

  const stationData = dataByStation[stationName];

  const orderedParams = [
    "AQHI", "Outdoor Temperature", "Relative Humidity", "Wind Speed", "Wind Direction", 
    "Nitrogen Dioxide", "Total Oxides of Nitrogen", "Nitric Oxide", "Ozone",
    "Fine Particulate Matter", "Sulphur Dioxide", "Hydrogen Sulphide", "Total Reduced Sulphur",
    "Carbon Monoxide", "Total Hydrocarbons", "Methane", "Non-methane Hydrocarbons"  
  ];

  const paramLookup = {};
  stationData.forEach(r => {
    paramLookup[r.ParameterName] = r;
  });
  
  const timestamp = new Date(stationData[0].ReadingDate).toLocaleString("en-CA", {
    timeZone: "America/Edmonton",
    hour12: true
  });
  
    // Group by ParameterName, keep latest
  const latestPerParam = {};
  stationData.forEach(row => {
    const param = row.ParameterName;
    if (!latestPerParam[param] || new Date(row.ReadingDate) > new Date(latestPerParam[param].ReadingDate)) {
      latestPerParam[param] = row;
    }
  });
  
  // Optional: extract AQHI separately
  const aqhiRow = latestPerParam["AQHI"];
  const aqhiValue = aqhiRow ? parseFloat(aqhiRow.Value).toFixed(1) : "N/A";


  const rows = orderedParams
    .filter(p => latestPerParam[p])
    .map(p => {
      const r = latestPerParam[p];
      const label = r.Shortform || p;
      const value = r.Value;
      const unit = r.Units || "";
      return `${label}: ${value}${unit}`;
    });
  
  const html = `
    <div style="font-size:0.9em;">
      <strong>${stationName}</strong><br>
      <small><em>${timestamp}</em></small><br>
      AQHI: ${paramLookup["AQHI"] ? paramLookup["AQHI"].Value + "AQHI" : "n/a"}<br>
      ${rows.join("<br>")}
    </div>
  `;

  return Promise.resolve(html);
};
