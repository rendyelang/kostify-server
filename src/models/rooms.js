const {PrismaClient} = require("@prisma/client")
const prisma = new PrismaClient()

// Create new room
const createRoom = async (room) => {
    const { owner_id, room_name, price, status, facilities, description, image_url, floor, capacity } = room
    const newRoom = await prisma.rooms.create({
        data: {
            owner_id: owner_id,
            room_name,
            price: Number(price),
            status,
            facilities,
            description: description || null,
            image_url: image_url || [],
            floor,
            capacity
        }
    })

    return newRoom
}

// Get all rooms
const getRooms = async () => {
    const rooms = await prisma.rooms.findMany()
    return rooms
}

// Get all rooms by owner ID
const getRoomsbyOwnerId = async (owner_id) => {
    const rooms = await prisma.rooms.findMany({
        where: {
            owner_id: owner_id
        }
    })
    return rooms
}

// Get room by ID
const getRoomById = async (roomId) => {
    const room = await prisma.rooms.findUnique({
        where: { room_id: Number(roomId) }
    })
    return room
}

// Edit room details
const editRoom = async (roomId, updatedDetails) => {
    const updatedRoom = await prisma.rooms.update({
        where: { 
            room_id: Number(roomId)
        },
        data: updatedDetails
    })
    return updatedRoom
}

// Edit room status
const editRoomStatus = async (roomId, status) => {
    const updatedRoom = await prisma.rooms.update({
        where: { room_id: Number(roomId) },
        data: { status }
    })
    return updatedRoom
}

// Delete room
const deleteRoom = async (roomId) => {
    const deletedRoom = await prisma.rooms.delete({
        where: { room_id: Number(roomId) }
    })
    return deletedRoom
}

const getAvailableRoomsByOwner = async (ownerId) => {
    const rooms = await prisma.rooms.findMany({
        where: {
            owner_id: Number(ownerId),
            status: 'empty'
        }
    })
    return rooms
}

module.exports = {
    createRoom, 
    getRooms,
    getRoomsbyOwnerId, 
    editRoom,
    editRoomStatus,
    deleteRoom,
    getRoomById,
    getAvailableRoomsByOwner
}