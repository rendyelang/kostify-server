const tenantModel = require('../models/tenants');
const roomModel = require('../models/rooms'); // Tambahkan ini
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { parse } = require('path');

// Helper: Validasi Input Tenant
function validateTenantInput({room_id, name, email, phone_number, address, birth_place, birth_date, emergency_number}) {
    if (!room_id || !name || !email || !phone_number || !address || !birth_place || !birth_date || !emergency_number) {
        return "room_id, name, email, phone_number, address, birth_place, birth_date, emergency_number are required fields.";
    }
    return null;
}

// 1. Setup Kurir Email (Transporter)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Helper: Bikin Password Random 8 Karakter
const generateRandomPassword = () => {
  return crypto.randomBytes(4).toString('hex');
};

const createTenant = async (req, res) => {
  try {
    const { 
      room_id, name, email, phone_number, entry_date,
      address, birth_place, birth_date, emergency_number,  
    } = req.body;

    const validationError = validateTenantInput({room_id, name, email, phone_number, address, birth_place, birth_date, emergency_number});
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    const owner_id = req.user.ownerId;

    // VALIDASI: Cek apakah room_id valid (ada di database dan milik owner ini)
    const room = await roomModel.getRoomById(parseInt(room_id));
    
    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: `Kamar dengan ID ${room_id} tidak ditemukan.`
      });
    }

    // Cek apakah kamar milik owner yang sedang login
    if (room.owner_id !== parseInt(owner_id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Anda tidak memiliki akses ke kamar ini.'
      });
    }

    // Cek apakah kamar masih kosong
    if (room.status === 'full') {
      return res.status(400).json({
        status: 'error',
        message: `Kamar "${room.room_name}" sudah terisi. Pilih kamar lain.`
      });
    }

    // A. GENERATE PASSWORD
    const rawPassword = generateRandomPassword();

    // B. HASHING PASSWORD
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(rawPassword, saltRounds);

    // Validasi Entry Date agar tidak Invalid Date
    let finalEntryDate = new Date(); // Default NOW

    if (entry_date) {
        // Pakai new Date(entry_date) langsung sebenarnya bisa,
        // tapi kadang timezonenya geser. Paling aman format YYYY-MM-DD
        const parsed = new Date(entry_date);
        if (!isNaN(parsed.getTime())) {
            finalEntryDate = parsed;
        }
    }

    // console.log("Tanggal Masuk yang akan disimpan:", finalEntryDate); // Cek terminal nanti

    // C. PERSIAPAN DATA KE DATABASE
    const tenantPayload = {
      owner_id: parseInt(owner_id),
      room_id: parseInt(room_id),
      name,
      email: email,
      password: hashedPassword,
      phone: phone_number,
      status: 'active',
      entry_date: finalEntryDate,
      emergency_number: emergency_number,
      birth_place: birth_place,
      birth_date: new Date(birth_date),
      address: address,
    };

    // D. EKSEKUSI KE DATABASE (Model)
    const newTenant = await tenantModel.createTenant(tenantPayload);

    // E. KIRIM EMAIL
    const mailOptions = {
      from: `"Admin Kostify" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: 'Selamat Datang! Ini Akses Masuk Kostify Anda',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Halo, ${name}!</h2>
          <p>Selamat bergabung. Akun Anda telah dibuat oleh pemilik kos.</p>
          <p>Silakan gunakan detail berikut untuk login ke aplikasi:</p>
          <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><b>Email:</b> ${email}</p>
            <p style="margin: 5px 0;"><b>Password:</b> ${rawPassword}</p>
          </div>
          <p style="color: #d9534f; font-size: 0.9em;">
            *Penting: Password ini digenerate otomatis. Harap segera ganti password Anda setelah login pertama kali.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    // F. RESPONSE SUKSES
    res.status(201).json({
      status: 'success',
      message: 'Tenant berhasil ditambahkan dan email notifikasi sudah dikirim.',
      data: {
        tenant_id: newTenant.tenant_id,
        email: newTenant.email,
        generated_password: rawPassword 
      }
    });

  } catch (error) {
    console.error('Error createTenant:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Terjadi kesalahan pada server.'
    });
  }
};

const getTenantsByOwner = async (req, res) => {
    const owner_id = req.user.ownerId;
    const owner_name = req.user.name;
    // console.log(req.user)
    try {
        const tenants = await tenantModel.getTenantsByOwnerId(owner_id)
        if (!tenants || tenants.length === 0) {
            return res.status(404).json({
                message: "No tenants found for this owner"
            })
        }

        // Format response agar lebih flat
        const formattedTenants = tenants.map(tenant => ({
            tenant_id: tenant.tenant_id,
            name: tenant.name,
            email: tenant.email,
            phone: tenant.phone,
            status: tenant.status,
            room_name: tenant.rooms.room_name
        }));

        res.status(200).json({
            message: `Tenants for ${owner_name} retrieved successfully`,
            data: formattedTenants
        })
    } catch (error) {
        res.status(500).json({
            message: "Error retrieving tenants",
            error: error.message
        })
    }
}

// GET detail tenant by ID (untuk mengisi form edit)
const getTenantById = async (req, res) => {
  try {
    const { id } = req.params;
    const owner_id = req.user.ownerId;

    const tenant = await tenantModel.getTenantById(parseInt(id));

    if (!tenant) {
      return res.status(404).json({
        status: 'error',
        message: 'Tenant tidak ditemukan.'
      });
    }

    // Pastikan tenant milik owner yang login
    if (tenant.owner_id !== parseInt(owner_id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Anda tidak memiliki akses ke data tenant ini.'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        tenant_id: tenant.tenant_id,
        room_id: tenant.room_id,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        status: tenant.status,
        emergency_number: tenant.emergency_number,
        birth_place: tenant.birth_place,
        birth_date: tenant.birth_date,
        address: tenant.address,
        room_name: tenant.rooms?.room_name
      }
    });
  } catch (error) {
    console.error('Error getTenantById:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// PATCH update tenant
const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const owner_id = req.user.ownerId;
    const { name, email, phone, birth_place, birth_date, emergency_number, address, room_id } = req.body;

    // Cek tenant exists
    const existingTenant = await tenantModel.getTenantById(parseInt(id));

    if (!existingTenant) {
      return res.status(404).json({
        status: 'error',
        message: 'Tenant tidak ditemukan.'
      });
    }

    // Pastikan tenant milik owner yang login
    if (existingTenant.owner_id !== parseInt(owner_id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Anda tidak memiliki akses untuk mengubah data tenant ini.'
      });
    }

    const oldRoomId = existingTenant.room_id;
    const isRoomChanged = room_id && parseInt(room_id) !== oldRoomId;

    // Validasi room_id jika ada perubahan kamar
    if (isRoomChanged) {
      const newRoom = await roomModel.getRoomById(parseInt(room_id));

      if (!newRoom) {
        return res.status(404).json({
          status: 'error',
          message: 'Kamar tidak ditemukan.'
        });
      }

      if (newRoom.owner_id !== parseInt(owner_id)) {
        return res.status(403).json({
          status: 'error',
          message: 'Anda tidak memiliki akses ke kamar ini.'
        });
      }

      if (newRoom.status === 'full') {
        return res.status(400).json({
          status: 'error',
          message: `Kamar "${newRoom.room_name}" sudah terisi.`
        });
      }
    }

    // Data yang akan diupdate
    const updateData = {
      name,
      email,
      phone,
      birth_place,
      // birth_date: new Date(birth_date),
      emergency_number,
      address
    };

    // Validasi Tanggal: Hanya masukkan jika valid date untuk menghindari error "Invalid Date"
    if (birth_date) {
      const parsedDate = new Date(birth_date);
      if (!isNaN(parsedDate.getTime())) {
        updateData.birth_date = parsedDate;
      }
    }

    // Jika ada perubahan kamar, gunakan rooms.connect
    if (room_id) {
      updateData.rooms = {
        connect: { room_id: parseInt(room_id) }
      };
    }

    // Update tenant dan status kamar (jika ada perubahan kamar)
    const updatedTenant = await tenantModel.updateTenantWithRoom(
      parseInt(id), 
      updateData, 
      isRoomChanged ? oldRoomId : null,
      isRoomChanged ? parseInt(room_id) : null
    );

    res.status(200).json({
      status: 'success',
      message: 'Data tenant berhasil diperbarui.',
      data: updatedTenant
    });
  } catch (error) {
    console.error('Error updateTenant:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// DELETE tenant
const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const owner_id = req.user.ownerId;

    // Cek tenant exists
    const existingTenant = await tenantModel.getTenantById(parseInt(id));

    if (!existingTenant) {
      return res.status(404).json({
        status: 'error',
        message: 'Tenant tidak ditemukan.'
      });
    }

    // Pastikan tenant milik owner yang login
    if (existingTenant.owner_id !== parseInt(owner_id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Anda tidak memiliki akses untuk menghapus tenant ini.'
      });
    }

    // Hapus tenant dan update status kamar jadi empty
    await tenantModel.deleteTenant(parseInt(id), existingTenant.room_id);

    res.status(200).json({
      status: 'success',
      message: 'Tenant berhasil dihapus.'
    });
  } catch (error) {
    console.error('Error deleteTenant:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = { createTenant, getTenantsByOwner, getTenantById, updateTenant, deleteTenant };