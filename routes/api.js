const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const router = express.Router();

// 連接 SQLite 資料庫
const dbPath = path.join(__dirname, '../rice.db');
const db = new sqlite3.Database(dbPath);

// 初始化資料表（如果不存在就建立）
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT,
    date TEXT,
    type TEXT,
    value TEXT
  )`);
});

// /api/prices?type=...&startDate=...&endDate=...&city=...
router.get('/prices', (req, res) => {
  const { type, startDate, endDate, city } = req.query;
  if (!type || !startDate || !endDate || !city) {
    return res.json([]);
  }
  // 日期轉民國年格式
  function toROC(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(y, 10) - 1911}.${m.padStart(2, '0')}.${d.padStart(2, '0')}`;
  }
  const start = toROC(startDate);
  const end = toROC(endDate);
  // 查詢資料庫
  db.all(
    `SELECT city, date, type, value FROM prices WHERE city = ? AND type = ? AND date >= ? AND date <= ?`,
    [city, type, start, end],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(row => ({
        city: row.city,
        date: row.date,
        type: row.type,
        value: row.value
      })));
    }
  );
});

// 匯入 CSV 到 SQLite 的 API（僅供初始化用）
const fs = require('fs');
const csv = require('csv-parser');
router.get('/import', (req, res) => {
  const priceCsvPath = path.join(__dirname, '../price.csv');
  const prices = [];
  fs.createReadStream(priceCsvPath)
    .pipe(csv())
    .on('data', (row) => {
      const city = (row['縣市'] || row['﻿縣市'] || '').replace(/\s/g, '');
      const date = (row['日期'] || '').replace(/\s/g, '');
      // 只匯入有用的欄位
      Object.keys(row).forEach(key => {
        if (key.includes('價格')) {
          prices.push({
            city,
            date,
            type: key.replace(/\s/g, ''),
            value: (row[key] || '').replace(/\s/g, '')
          });
        }
      });
    })
    .on('end', () => {
      db.serialize(() => {
        db.run('DELETE FROM prices');
        const stmt = db.prepare('INSERT INTO prices (city, date, type, value) VALUES (?, ?, ?, ?)');
        prices.forEach(p => {
          stmt.run(p.city, p.date, p.type, p.value);
        });
        stmt.finalize();
        res.json({ message: '匯入完成', count: prices.length });
      });
    });
});

module.exports = router;
