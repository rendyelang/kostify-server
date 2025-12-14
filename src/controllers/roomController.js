const roomModel = require('../models/rooms')
const cloudinary = require('../config/cloudinary')
const jwt = require('jsonwebtoken')


// Add room with optional images
const addRoom = async (req, res) => {
	const { room_number, price, status, facilities, description } = req.body

	const ownerId = req.user.ownerId

	console.log(ownerId)

	if ( !room_number || !price || !status || !facilities) {
		return res.status(400).json({ message: 'room_number, price, status, and facilities are required' })
	}

	if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'At least one image file is required' });
    }

	// URL array to hold uploaded image URLs
	const imageUrls = req.files.map(file => file.path || file.secure_url);


	const roomPayload = {
		owner_id: ownerId,
		room_number,
		price,
		status,
		facilities,
		description,
		image_url: imageUrls
	}

	try {
		const newRoom = await roomModel.createRoom(roomPayload)
		res.status(201).json({ message: 'Room created successfully', room: newRoom })
	} catch (error) {
		res.status(500).json({ message: 'Error creating room', error: error.message })
	}
}

module.exports = {
	addRoom
}
