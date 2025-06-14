  let recentData = [];
  let dataByStation = {};

  fetch('https://raw.githubusercontent.com/DKevinM/AB_datapull/main/data/last6h.csv')
    .then(res => res.text())
    .then(text => {
      const rows = text.trim().split('\n');
      const headers = rows[0].split(',');

      rows.slice(1).forEach(line => {
	const cols = line.split(',');
	const entry = Object.fromEntries(headers.map((h, i) => [h, cols[i]]));
	if (!entry.Value || isNaN(entry.Latitude) || isNaN(entry.Longitude)) return;

	recentData.push(entry);
	const name = entry.StationName;
	if (!dataByStation[name]) dataByStation[name] = [];
	dataByStation[name].push(entry);
      });

      console.log("Loaded station data from CSV.");
    });
