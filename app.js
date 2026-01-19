require('dotenv').config();
const express = require('express');
const cors = require('cors');
const owner = require('./src/routes/ownerAuthRouter');
const room = require('./src/routes/roomRouter');
const tenant = require('./src/routes/tenantRouter');
const startPaymentReminderJob = require('./src/cron/paymentReminder');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.get('/api', (req, res) => {
  res.json({ message: 'Hello Kostify' });
});

app.use('/api', owner);
app.use('/api', room);
app.use('/api', tenant);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Mulai Job Scheduler
startPaymentReminderJob();

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}/`);
});
