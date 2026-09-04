const https = require('https');

const data = JSON.stringify({
  bbox: [-122.436, 47.495, -122.236, 47.734],
  collections: ["naip"],
  datetime: "2010-01-01T00:00:00Z/2024-12-31T23:59:59Z",
  limit: 200
});

const options = {
  hostname: 'planetarycomputer.microsoft.com',
  port: 443,
  path: '/api/stac/v1/search',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => {
    const result = JSON.parse(body);
    const features = result.features || [];
    
    console.log(`Total items found: ${features.length}`);
    
    const yearSummary = {};
    const itemsList = [];
    
    features.forEach(f => {
      const dt = f.properties.datetime;
      const year = dt.substring(0, 4);
      const gsd = f.properties.gsd || 'N/A';
      const crs = f.properties['proj:epsg'] || 'N/A';
      
      if (!yearSummary[year]) yearSummary[year] = 0;
      yearSummary[year]++;
      
      itemsList.push({
        year,
        date: dt,
        id: f.id,
        gsd,
        crs
      });
    });
    
    console.log('\n--- Year Summary ---');
    Object.keys(yearSummary).sort().forEach(y => {
      console.log(`${y}: ${yearSummary[y]} items`);
    });
    
    console.log('\n--- Sample Items per Year ---');
    Object.keys(yearSummary).sort().forEach(y => {
      const sample = itemsList.find(i => i.year === y);
      console.log(`${y}: ID=${sample.id}, Date=${sample.date}, GSD=${sample.gsd}m, CRS=EPSG:${sample.crs}`);
    });
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
