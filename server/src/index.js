require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const serveIndex = require('serve-index');

const { connectDatabase } = require('./config/database');
const participantRoutes = require('./routes/participants');
const photoRoutes = require('./routes/photos');
const { getUploadRoot } = require('./utils/storage');

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const uploadRoot = path.join(process.cwd(), getUploadRoot());
app.use('/uploads', express.static(uploadRoot));
app.use('/uploads', serveIndex(uploadRoot, { icons: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/participants', participantRoutes);
app.use('/api/photos', photoRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ message });
});

connectDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Food Memories backend listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  });
