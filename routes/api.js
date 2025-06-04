const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const router = express.Router();

// /api/prices?type=...&startDate=...&endDate=...&city=...
router.get('/prices', (req, res) => {
  const { type, startDate, endDate, city } = req.query;
  const results = [];
  // 日期轉民國年格式
  function toROC(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(y, 10) - 1911}.${parseInt(m, 10)}.${parseInt(d, 10)}`;
  }
  // 補零函數，讓日期格式統一為 114.06.04
  function padROCDate(rocDate) {
    if (!rocDate) return '';
    const [y, m, d] = rocDate.split('.');
    return `${y.padStart(3, '0')}.${m.padStart(2, '0')}.${d.padStart(2, '0')}`;
  }
  const start = padROCDate(toROC(startDate));
  const end = padROCDate(toROC(endDate));
  const priceCsvPath = __dirname + '/../price.csv';
  fs.createReadStream(priceCsvPath)
    .pipe(csv())
    .on('data', (row) => {
      // 民國日期比對，補零
      const rowDate = row['日期'] && padROCDate(row['日期'].replace(/\s/g, ''));
      // 處理 BOM 問題，並同時支援 '縣市' 與 '﻿縣市' 欄位
      const rowCity = (row['縣市'] || row['﻿縣市'] || '').replace(/\s/g, '');
      // 取出 type 欄位的值，處理 BOM 與所有可能的空白
      let typeValue = '';
      if (type) {
        // 嘗試所有可能的欄位名稱（去除空白、BOM）
        const possibleTypeKeys = [
          type,
          type.replace(/\s/g, ''),
          '\uFEFF' + type,
          '\uFEFF' + type.replace(/\s/g, '')
        ];
        for (const key of possibleTypeKeys) {
          if (row[key] !== undefined) {
            typeValue = row[key];
            break;
          }
        }
        typeValue = typeValue.replace(/\s/g, '');
      }
      if (typeValue === '' && type) {
        // 再嘗試所有欄位名去除所有全形/半形空白後比對
        const normalize = s => s.replace(/[\s\u3000]/g, '');
        const typeNorm = normalize(type);
        for (const key in row) {
          if (normalize(key) === typeNorm) {
            typeValue = row[key];
            break;
          }
        }
        typeValue = typeValue.replace(/\s/g, '');
      }
      // 日期範圍、縣市、type 欄位比對
      if (
        (!city || rowCity === city) &&
        rowDate && start <= rowDate && rowDate <= end &&
        type && typeValue && typeValue !== '0'
      ) {
        // 只回傳有 type 欄位值的資料
        results.push({
          city: rowCity,
          date: rowDate,
          type: type,
          value: typeValue
        });
      }
    })
    .on('end', () => {
      res.json(results);
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
});

module.exports = router;
