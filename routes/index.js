var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Express',
    city: req.query.city || '',
    type: req.query.type || '',
    startDate: req.query.startDate || '',
    endDate: req.query.endDate || ''
  });
});

module.exports = router;
