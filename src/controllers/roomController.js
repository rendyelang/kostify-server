const roomModel = require('../models/rooms')
const cloudinary = require('../config/cloudinary')
const jwt = require('jsonwebtoken');
const { get } = require('../routes/ownerAuthRouter');

// Helper validasi
function validateRoomInput({ room_number, price, status, facilities, description }) {
    if (!room_number || !price || !status || !facilities || !description) {
        return 'room_number, price, status, facilities, and description are required';
    }
    if (isNaN(Number(price)) || Number(price) < 0) {
        return 'price must be a positive number';
    }
    return null;
}

// Add room with optional images
const addRoom = async (req, res) => {
	const { room_number, price, status, facilities, description } = req.body

	const ownerId = req.user.ownerId

	const validationError = validateRoomInput({ room_number, price, status, facilities, description });
	if (validationError) {
		return res.status(400).json({ message: validationError });
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

// Get all rooms
const getRooms = async (req, res) => {
	try {
		const rooms = await roomModel.getRooms()
		if (!rooms || rooms.length === 0) {
			return res.status(404).json({ message: 'No rooms found, add some first' });
		}

		res.status(200).json({
			message: "Rooms retrieved successfully",
			data: rooms
		})
	} catch (error) {
		res.status(500).json({ message: 'Error retrieving rooms', error: error.message })
	}
}

// Get all rooms by owner ID
const getRoomsByOwnerId = async (req, res) => {
	const ownerId = req.user.ownerId

	try {
		const rooms = await roomModel.getRoomsbyOwnerId(ownerId)
		if (!rooms || rooms.length === 0) {
			return res.status(404).json({ message: 'No rooms found for this owner' });
		}
		res.status(200).json({
			message: "Rooms retrieved successfully",
			data: rooms
		})
	} catch (error) {
		res.status(500).json({ message: 'Error retrieving rooms for this owner', error: error.message })
	}
}

// Get room details by ID
const getRoomById = async (req, res) => {
	const roomId = req.params.id
	const ownerId = req.user.ownerId
	
	try {
		const existingRoom = await roomModel.getRoomById(roomId)
        if (!existingRoom) {
            return res.status(404).json({ message: 'Room not found' })
        }
		// Check if the room belongs to the logged-in owner
		if (existingRoom.owner_id !== ownerId) {
			return res.status(403).json({ message: 'Forbidden: You do not have permission to edit this room' })
		}

		res.status(200).json({
			message: "Room retrieved successfully",
			data: existingRoom
		})
	}
	catch (error) {
		res.status(500).json({ message: 'Error retrieving room', error: error.message })
	}
}

// Edit room details
const editRoom = async (req, res) => {
    const roomId = req.params.id
    const dataToUpdate = req.body
    const ownerId = req.user.ownerId
    const replaceImages = req.body.replace_images === 'true' || req.body.replace_images === true

    // Validasi data (hanya jika field dikirim)
    if (dataToUpdate.price && (isNaN(Number(dataToUpdate.price)) || Number(dataToUpdate.price) < 0)) {
        return res.status(400).json({ message: 'price must be a positive number' });
    }

    try {
        const existingRoom = await roomModel.getRoomById(roomId)
        if (!existingRoom) {
            return res.status(404).json({ message: 'Room not found' })
        }
        // Check if the room belongs to the logged-in owner
        if (existingRoom.owner_id !== ownerId) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to edit this room' })
        }

        // Handle multiple images
        if (req.files && req.files.length > 0) {
            const newImageUrls = req.files.map(file => file.path || file.secure_url);

            if (replaceImages) {
                // REPLACE MODE: Hapus semua gambar lama dari Cloudinary, lalu ganti dengan yang baru
                if (Array.isArray(existingRoom.image_url)) {
                    for (const imgUrl of existingRoom.image_url) {
                        if (imgUrl && imgUrl.includes('res.cloudinary.com')) {
                            try {
                                const urlParts = imgUrl.split('/upload/')[1];
                                const pathWithoutVersion = urlParts.replace(/^v\d+\//, '');
                                const publicId = pathWithoutVersion.replace(/\.\w+$/, '');

                                await cloudinary.uploader.destroy(publicId);
                                console.log(`Deleted old image: ${publicId}`);
                            } catch (error) {
                                console.error('Error deleting old image from Cloudinary:', error)
                            }
                        }
                    }
                }
                // Set image_url dengan gambar baru saja
                dataToUpdate.image_url = newImageUrls;
            } else {
                // APPEND MODE: Tambahkan gambar baru ke array yang sudah ada
                const existingImages = Array.isArray(existingRoom.image_url) ? existingRoom.image_url : [];
                dataToUpdate.image_url = [...existingImages, ...newImageUrls];
            }
        }

        // Pastikan price tetap number jika diupdate
        if (dataToUpdate.price) dataToUpdate.price = Number(dataToUpdate.price);

        // Hapus field yang tidak perlu dikirim ke Prisma
        delete dataToUpdate.images;
        delete dataToUpdate.replace_images;

        const updatedRoom = await roomModel.editRoom(roomId, dataToUpdate)
        res.status(200).json({
            message: 'Room updated successfully',
            updated_room: updatedRoom
        })
    } catch (error) {
        res.status(500).json({
            message: 'Error updating room',
            error: error.message
        })
    }
}

// Edit room status
const editRoomStatus = async (req, res) => {
	const roomId = req.params.id
	const { status } = req.body
	const ownerId = req.user.ownerId

	try {
		const existingRoom = await roomModel.getRoomById(roomId)
		if (!existingRoom) {
			return res.status(404).json({ message: 'Room not found' })
		}
		// Check if the room belongs to the logged-in owner
		if (existingRoom.owner_id !== ownerId) {
			return res.status(403).json({ message: 'Forbidden: You do not have permission to edit this room' })
		}

		if (!status) {
			return res.status(400).json({ message: 'Status is required. (Either "full" or "empty")' })
		}

		if (status !== "full" && status !== "empty") {
			return res.status(400).json({ message: 'Invalid status value. Allowed values are "full" or "empty"' })
		}

		const updatedRoom = await roomModel.editRoomStatus(roomId, status)
		res.status(200).json({ 
			message: 'Room status updated successfully',
			updated_room: updatedRoom })
	} catch (error) {
		res.status(500).json({ 
			message: 'Error updating room status',
			error: error.message
		})
	}
}

// Delete room
const deleteRoom = async (req, res) => {
	const roomId = req.params.id
	const ownerId = req.user.ownerId

	try {
		const existingRoom = await roomModel.getRoomById(roomId)
		if (!existingRoom) {
			return res.status(404).json({ message: 'Room not found' })
		}
		// Check if the room belongs to the logged-in owner
		if (existingRoom.owner_id !== ownerId) {
			return res.status(403).json({ message: 'Forbidden: You do not have permission to edit this room' })
		}

		// Hapus semua gambar dari Cloudinary jika ada
		if (Array.isArray(existingRoom.image_url)) {
			for (const imgUrl of existingRoom.image_url) {
				if (imgUrl && imgUrl.includes('res.cloudinary.com')) {
					try {
						// Ekstrak public_id dengan benar
						// Contoh URL: https://res.cloudinary.com/xxx/image/upload/v123456789/kostify/rooms/abc123.jpg
						const urlParts = imgUrl.split('/upload/')[1]; // v123456789/kostify/rooms/abc123.jpg
						const pathWithoutVersion = urlParts.replace(/^v\d+\//, ''); // kostify/rooms/abc123.jpg
						const publicId = pathWithoutVersion.replace(/\.\w+$/, ''); // kostify/rooms/abc123

						// console.log(`Attempting to delete: ${publicId}`);
						
						const result = await cloudinary.uploader.destroy(publicId);
						// console.log(`Delete result for ${publicId}:`, result);
					} catch (error) {
						console.error('Error deleting image from Cloudinary:', error)
					}
				}
			}
		}

		const deletedRoom = await roomModel.deleteRoom(roomId)
		res.status(200).json({ 
			message: 'Room deleted successfully',
			deleted_room: deletedRoom })
	} catch (error) {
		res.status(500).json({ 
			message: 'Error deleting room',
			error: error.message
		})
	}
}

module.exports = {
	addRoom, 
	getRooms,
	getRoomsByOwnerId,
	editRoom,
	editRoomStatus,
	deleteRoom,
	getRoomById
}
