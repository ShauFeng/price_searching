var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Express',
    city: '',
    type: '',
    startDate: '',
    endDate: ''
  });
});

module.exports = router;
