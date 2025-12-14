const {PrismaClient} = require("@prisma/client")
const prisma = new PrismaClient()

// Create new room
const createRoom = async (room) => {
    const { owner_id, room_number, price, status, facilities, description, image_url } = room
    const newRoom = await prisma.rooms.create({
        data: {
            owner_id: owner_id,
            room_number,
            price: Number(price),
            status,
            facilities,
            description: description || null,
            image_url: image_url || []
        }
    })

    return newRoom
}

module.exports = {
    createRoom
}