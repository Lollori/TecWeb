const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// IMPORTAZIONE ROTTE
const itemsRouter = require('./routes/items');
const visiteRouter = require('./routes/visite');
const museiRouter = require('./routes/musei');
const utentiRouter = require('./routes/utenti');

// DEFINIZIONE ENDPOINTS
app.use('/api/items', itemsRouter);
app.use('/api/visite', visiteRouter);
app.use('/api/musei', museiRouter);
app.use('/api/utenti', utentiRouter);
app.use('/Artaroundeditor', express.static(path.join(__dirname, 'Artaroundeditor')));

// ROTTA DI TEST
app.get('/', (req, res) => res.send('ArtAround Editor API attiva ✅'));

// CONNESSIONE DATABASE
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/artaround')
  .then(() => console.log('MongoDB connesso ✅'))
  .catch(err => console.error('Errore MongoDB:', err));

// AVVIO SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server su http://localhost:${PORT}`));