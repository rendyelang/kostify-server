const router = require('express').Router()
const { addRoom } = require('../controllers/roomController')
const multerMiddleware = require('../middlewares/multerMiddleware')
const protectedToken = require('../middlewares/verifyAccessTokenMiddleware')

router.post('/rooms/add-room', protectedToken, multerMiddleware('rooms'), addRoom)

module.exports = router