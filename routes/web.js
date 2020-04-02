const router = require('express').Router();
const homepageController = require('../controllers/HomepageController');

router.get('/', homepageController.index);

module.exports = router;
