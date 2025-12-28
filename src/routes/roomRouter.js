const router = require('express').Router()
const { addRoom, getRooms, getRoomsByOwnerId, editRoom, editRoomStatus, deleteRoom, getRoomById, getAvailableRoomsByOwner } = require('../controllers/roomController')
const multerMiddleware = require('../middlewares/multerMiddleware')
const protectedToken = require('../middlewares/verifyAccessTokenMiddleware')
const { route } = require('./ownerAuthRouter')

router.post('/rooms/add-room', protectedToken, multerMiddleware('rooms'), addRoom)
router.get('/rooms', getRooms)
router.get('/room/:id', protectedToken, getRoomById)

// Get rooms for the logged-in owner
router.get('/rooms/me', protectedToken, getRoomsByOwnerId)

router.put('/rooms/edit/:id', protectedToken, multerMiddleware('rooms'), editRoom)
router.patch('/room/edit-status/:id', protectedToken, editRoomStatus)
router.delete('/rooms/delete/:id', protectedToken, deleteRoom)
router.get('/rooms/available/me', protectedToken, getAvailableRoomsByOwner)

module.exports = router