const XLSX = require('xlsx');
const fs = require('fs');

const filePath = '/Users/adam/Desktop/tad/tadfuq-platform/نسخة  خالد - ملخص عام 2025.xlsx';
const data = fs.readFileSync(filePath);
const workbook = XLSX.read(data, { type: 'buffer' });

console.log('Sheets:', workbook.SheetNames);

const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

console.log('\nTotal rows:', jsonData.length);
console.log('\nFirst 10 rows:');
for (let i = 0; i < Math.min(10, jsonData.length); i++) {
  console.log(`Row ${i}:`, jsonData[i].slice(0, 8));
}
