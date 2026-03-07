const mongoose = require('mongoose');

const VisitaSchema = new mongoose.Schema({
  titolo: { type: String, required: true },
  museo: { type: String, required: true },
  autore: { type: String, required: true },
  descrizione: { type: String },
  items: [{ 
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    ordine: { type: Number }
  }],
  livello: { 
    type: String, 
    enum: ['infantile', 'elementare', 'medio', 'specialistico'] 
  },
  licenza: { type: String, default: 'CC-BY' },
  prezzo: { type: Number, default: 0 },
  pubblica: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Visita', VisitaSchema);
