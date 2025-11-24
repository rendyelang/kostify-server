const {PrismaClient} = require("@prisma/client")
const prisma = new PrismaClient()

// Check is admin exists by email
const isOwnerExists = async (email) => {
    const owner = await prisma.owners.findUnique({
        where: {
            email: email
        }
    })
    return owner
}

// Create new owner
const createOwner = async (name, email, password, phone) => {
    const newOwner = await prisma.owners.create({
        data: {
            name: name,
            email: email,
            password: password,
            phone: phone
        }
    })
    return newOwner
}

module.exports = {
    isOwnerExists,
    createOwner
}