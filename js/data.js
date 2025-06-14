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

const abbreviationLookup = {
  "AQHI": "AQHI", "Ozone": "O₃", "Total Oxides of Nitrogen": "NOx",
  "Hydrogen Sulphide": "H₂S", "Total Reduced Sulphur": "TRS", "Sulphur Dioxide": "SO₂",
  "Fine Particulate Matter": "PM2.5", "Total Hydrocarbons": "THC", "Carbon Monoxide": "CO",
  "Wind Direction": "wd", "Relative Humidity": "RH", "Outdoor Temperature": "ET",
  "Nitric Oxide": "NO", "Wind Speed": "ws", "Non-methane Hydrocarbons": "NMHC",
  "Nitrogen Dioxide": "NO₂", "Methane": "CH₄"
};

const shortformLookup = {
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
    const headers = rows[0].split(',');
    const rawData = {};

    rows.slice(1).forEach(line => {
      const cols = line.split(',');
      const entry = Object.fromEntries(headers.map((h, i) => [h, cols[i]]));
      if (!entry.Value || isNaN(entry.Latitude) || isNaN(entry.Longitude)) return;

      entry.ParameterName ||= "AQHI";
      entry.Units = unitsLookup[entry.ParameterName] || "";
      entry.Abbreviation = abbreviationLookup[entry.ParameterName] || "";
      entry.Shortform = shortformLookup[entry.ParameterName] || "";

      let value = parseFloat(entry.Value);
      if (["Ozone", "Total Oxides of Nitrogen", "Hydrogen Sulphide", "Total Reduced Sulphur", "Sulphur Dioxide", "Nitric Oxide", "Nitrogen Dioxide"].includes(entry.ParameterName)) {
        value *= 1000;
      }

      if (isNaN(value)) return;
      entry.Value = value;

      const utc = new Date(entry.ReadingDate);
      entry.ReadingDate = utc.toLocaleString("en-CA", { timeZone: "America/Edmonton" });

      if (!rawData[entry.StationName]) rawData[entry.StationName] = [];
      rawData[entry.StationName].push(entry);
    });

    for (const station in rawData) {
      const sorted = rawData[station].sort((a, b) => new Date(b.ReadingDate) - new Date(a.ReadingDate));
      const latestTwo = sorted.slice(0, 2);
      latestTwo.forEach(row => {
        recentData.push(row);
        if (!dataByStation[station]) dataByStation[station] = [];
        dataByStation[station].push(row);
      });
    }

    console.log("✅ Loaded & processed latest station data.");
  });

function getLatestStationData(stationName) {
  const stationEntries = dataByStation[stationName];
  if (!stationEntries) return [];

  const sorted = stationEntries
    .filter(d => d.ParameterName !== "")
    .sort((a, b) => new Date(b.ReadingDate) - new Date(a.ReadingDate));

  const uniqueTimes = [...new Set(sorted.map(e => e.ReadingDate))];
  for (let i = 0; i < 3 && i < uniqueTimes.length; i++) {
    const time = uniqueTimes[i];
    const rows = sorted.filter(e => e.ReadingDate === time);
    if (rows.length > 0) return rows;
  }
  return [];
}
