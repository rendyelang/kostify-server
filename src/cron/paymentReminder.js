const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

// Konfigurasi Email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD, // Gunakan App Password jika pakai Gmail
  },
});

const startPaymentReminderJob = () => {
    // Jalan setiap jam 08:00 Pagi
    cron.schedule('0 8 * * *', async () => {
        console.log('⏰ Running Payment Reminder Job (H-0 & H-7)...');
        
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7); // Tanggal 7 hari ke depan

        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        
        // Prediksi bulan & tahun untuk tagihan "minggu depan" (jika loncat bulan)
        const nextWeekMonth = nextWeek.getMonth() + 1;
        const nextWeekYear = nextWeek.getFullYear();

        try {
            // Ambil semua tenant aktif
            const activeTenants = await prisma.tenants.findMany({
                where: { status: 'active' },
                include: { rooms: true }
            });

            for (const tenant of activeTenants) {
                const entryDate = new Date(tenant.entry_date);
                const entryDay = entryDate.getDate(); // Misal: tgl 19

                // --- CEK 1: JATUH TEMPO HARI INI (H-0) ---
                if (entryDay === today.getDate()) {
                    await checkAndSend(tenant, currentMonth, currentYear, 'TODAY');
                }

                // --- CEK 2: JATUH TEMPO 1 MINGGU LAGI (H-7) ---
                // Jika tanggal masuk user sama dengan tanggal 7 hari lagi
                if (entryDay === nextWeek.getDate()) {
                   await checkAndSend(tenant, nextWeekMonth, nextWeekYear, 'NEXT_WEEK');
                }
            }

        } catch (error) {
            console.error('Error in payment reminder job:', error);
        }
    });

    console.log('✅ Payment Reminder Scheduler is Active');
};

// Helper function untuk cek status bayar & kirim email
async function checkAndSend(tenant, month, year, type) {
    // Cek apakah sudah lunas untuk periode tersebut?
    const hasPaid = await prisma.payments.findFirst({
        where: {
            tenant_id: tenant.tenant_id,
            period_month: month,
            period_year: year,
            status: 'paid' // Hanya anggap lunas jika status payment 'paid'
        }
    });

    // Jika SUDAH bayar, jangan kirim email
    if (hasPaid) return;

    // Siapkan konten email bedasarkan Tipe
    let subject = '';
    let htmlContent = '';
    let notificationMsg = '';

    const priceFormatted = tenant.rooms.price.toLocaleString('id-ID');

    if (type === 'TODAY') {
        subject = '⚠️ Tagihan Jatuh Tempo HARI INI';
        notificationMsg = `Tagihan kamar ${tenant.rooms.room_name} jatuh tempo HARI INI.`;
        htmlContent = `
            <h3>Hai ${tenant.name},</h3>
            <p>Ini adalah pengingat bahwa tagihan sewa <b>${tenant.rooms.room_name}</b> jatuh tempo <b>HARI INI</b>.</p>
            <p>Total: <b>Rp ${priceFormatted}</b></p>
            <p style="color:red">Mohon segera lakukan pembayaran.</p>
        `;
    } else if (type === 'NEXT_WEEK') {
        subject = '📅 Pengingat: Tagihan Kost Minggu Depan';
        notificationMsg = `Tagihan kamar ${tenant.rooms.room_name} akan jatuh tempo dalam 7 hari.`;
        htmlContent = `
            <h3>Hai ${tenant.name},</h3>
            <p>Sekedar mengingatkan, tagihan sewa kamar <b>${tenant.rooms.room_name}</b> akan jatuh tempo dalam <b>1 minggu lagi</b>.</p>
            <p>Total: <b>Rp ${priceFormatted}</b></p>
            <p>Anda bisa melakukan pembayaran mulai sekarang agar lebih tenang.</p>
        `;
    }

    console.log(`Sending ${type} reminder to ${tenant.name} (${tenant.email})...`);

    // 1. Kirim Email
    await transporter.sendMail({
        from: `"Admin Kostify" <${process.env.SMTP_EMAIL}>`,
        to: tenant.email,
        subject: subject,
        html: htmlContent
    });

    // 2. Simpan Notifikasi ke Database
    await prisma.notifications.create({
        data: {
            owner_id: tenant.owner_id,
            tenant_id: tenant.tenant_id,
            title: subject,
            message: notificationMsg,
            type: 'reminder',
        }
    });
}

module.exports = startPaymentReminderJob;