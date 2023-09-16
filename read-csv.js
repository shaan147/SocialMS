const fs = require('fs');
const csv = require('csv-parser');

const csvFilePath = './extras/Book1.csv';
const data = [];

fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
    data.push(row);
  })
  .on('end', () => {
    console.log(data); 
  });
