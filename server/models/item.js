const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  opera: { type: String, required: true },      // es. "Q126599960" (Wikidata ID)
  autore: { type: String },                      // es. "Q1527051"
  stile: { type: String },                       // es. "Q131808"
  titolo: { type: String, required: true },      // titolo leggibile
  testo: { type: String, required: true },       // il testo della descrizione
  lunghezza: { 
    type: String, 
    enum: ['3s', '15s', '40s', '1min', '4min'], 
    required: true 
  },
  linguaggio: { 
    type: String, 
    enum: ['infantile', 'elementare', 'medio', 'specialistico'], 
    required: true 
  },
  autoreContenuto: { type: String },             // chi ha scritto il testo
  licenza: { type: String, default: 'CC-BY' },
  prezzo: { type: Number, default: 0 },
  museo: { type: String, required: true },       // a quale museo appartiene
  immagine: { type: String }                     // URL immagine opzionale
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);
