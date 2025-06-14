// data.js
let recentData = [];
let dataByStation = {};

const unitsLookup = {
  "AQHI": "AQHI", "Ozone": "ppb", "Total Oxides of Nitrogen": "ppb",
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
      const two = arr.slice(0,2);
      two.forEach(e => {
        recentData.push(e);
        dataByStation[station] = dataByStation[station]||[];
        dataByStation[station].push(e);
      });
    });


window.fetchRecentStationData = function(stationName) {
  if (!dataByStation[stationName]) {
    return Promise.resolve("<b>No data found for this station.</b>");
  }

  const stationData = dataByStation[stationName];

  const rows = stationData.map(row => {
    const value = parseFloat(row.Value).toFixed(1);
    const param = row.ParameterName;
    const unit = row.Units || "";
    return `<tr><td>${param}</td><td>${value}</td><td>${unit}</td></tr>`;
  });

  const html = `
    <table style="font-size:0.85em;width:100%;">
      <tr><th>Parameter</th><th>Value</th><th>Unit</th></tr>
      ${rows.join("")}
    </table>
  `;

  return Promise.resolve(html);
};
