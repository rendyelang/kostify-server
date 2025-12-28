const {PrismaClient} = require("@prisma/client")
const prisma = new PrismaClient()

const createTenant = async (tenantData) => {
    const { owner_id, room_id, name, email, password, phone, status, emergency_number, birth_place, birth_date, address } = tenantData
    const newTenant = await prisma.tenants.create({
        data: {
            owner_id: owner_id,
            room_id: room_id,
            name: name,
            email: email,
            password: password,
            phone: phone,
            status: status,
            emergency_number: emergency_number,
            birth_place: birth_place,
            birth_date: birth_date,
            address: address
        }
    })

    await prisma.rooms.update({
        where: { room_id: parseInt(room_id) },
        data: { status: 'full' }, 
    });

    return newTenant
};

const getTenantsByOwnerId = async (ownerId) => {
    return await prisma.tenants.findMany({
        where: { owner_id: parseInt(ownerId) },
        select: {
            tenant_id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            rooms: {
                select: {
                    room_name: true
                }
            }
        }
    });
}

const getTenantById = async (tenantId) => {
    return await prisma.tenants.findUnique({
        where: { tenant_id: parseInt(tenantId) },
        include: {
            rooms: {
                select: {
                    room_name: true,
                }
            }
        }
    });
}

const updateTenant = async (tenantId, updateData) => {
    return await prisma.tenants.update({
        where: { tenant_id: parseInt(tenantId) },
        data: updateData
    });
}

const updateTenantWithRoom = async (tenantId, updateData, oldRoomId, newRoomId) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Update tenant
    const updatedTenant = await tx.tenants.update({
      where: { tenant_id: tenantId },
      data: updateData
    });

    // 2. Jika ada perubahan kamar, update status kamar
    if (oldRoomId && newRoomId) {
      // Set kamar lama jadi empty
      await tx.rooms.update({
        where: { room_id: oldRoomId },
        data: { status: 'empty' }
      });

      // Set kamar baru jadi full
      await tx.rooms.update({
        where: { room_id: newRoomId },
        data: { status: 'full' }
      });
    }

    return updatedTenant;
  });
};

const deleteTenant = async (tenantId, roomId) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Hapus tenant
    await tx.tenants.delete({
      where: { tenant_id: tenantId }
    });

    // 2. Update status kamar jadi empty
    await tx.rooms.update({
      where: { room_id: roomId },
      data: { status: 'empty' }
    });
  });
};

module.exports = {
    createTenant,
    getTenantsByOwnerId,
    getTenantById,
    updateTenant,
    updateTenantWithRoom,
    deleteTenant
};