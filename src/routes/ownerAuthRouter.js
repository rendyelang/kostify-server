const { addAdmin, signInOwner } = require('../controllers/ownerAuthController');

const router = require('express').Router();

router.post('/owner/sign-up', addAdmin);
router.post('/owner/sign-in', signInOwner)

module.exports = router;