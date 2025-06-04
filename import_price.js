const fs = require('fs');
const csv = require('csv-parser');

fs.createReadStream('price.csv')
  .pipe(csv())
  .on('data', (row) => {
    console.log(row);
  })
  .on('end', () => {
    console.log('CSV 檔案讀取完成');
  });

