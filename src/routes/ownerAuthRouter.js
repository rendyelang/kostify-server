const { addAdmin } = require('../controllers/ownerAuthController');

const router = require('express').Router();

router.post('/owner/add-owner', addAdmin);

module.exports = router;