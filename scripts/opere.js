const mongoose = require("mongoose");

const operaSchema = new mongoose.Schema({
    codiceIsil: { type: String, required: true, index: true },
    operaId:    { type: String, required: true },
    tipo:       { type: String, default: '' },
    autore:     { type: String, default: '' },
    datazione:  { type: String, default: '' },
    immagine:   { type: String, default: '' },
    descrizione:{ type: String, default: '' },
    linguaggio: { type: String, default: 'semplice' },
    lunghezza:  { type: String, default: '1min' },
    testo:      { type: String, default: '' },
    licenza:    { type: String, default: 'gratuita' },
    prezzo:     { type: Number, default: 0 },
    pubblica:   { type: Boolean, default: false },
    adozioni:   { type: Number, default: 0 },
    creatoDa:   { type: String, default: '' },
    altezza:    { type: Number, default: 0 },
    larghezza:  { type: Number, default: 0 },
    profondita: { type: Number, default: 0 },
    tecnica:    { type: String, default: '' },
    materiali:  { type: String, default: '' },
    sala:       { type: String, default: '' },
});

const Opera = mongoose.models.Opera || mongoose.model("Opera", operaSchema);

// ── HELPER: connessione ──────────────────────────────────────

async function connect(credentials) {
    if (mongoose.connection.readyState === 1) return;

    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/artaround?authSource=admin&writeConcern=majority`;

    try {
        await mongoose.connect(mongouri, { serverSelectionTimeoutMS: 5000 });
        console.log(`[opere.js] Connesso a MongoDB (${credentials.site}).`);
    } catch(e) {
        console.error("[opere.js] Errore di connessione:", e.message);
        throw e;
    }
}

// ── SEED ─────────────────────────────────────────────────────

exports.seed = async (credentials) => {
    const fs = require('fs').promises;
    try {
        await connect(credentials);
        const raw  = await fs.readFile(global.rootDir + '/public/data/opere.json', 'utf8');
        const data = JSON.parse(raw);
        await Opera.deleteMany({});
        await Opera.insertMany(data);
        return { ok: true, message: `Inseriti ${data.length} opere.` };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

// ── GET ALL ──────────────────────────────────────────────────

exports.getAll = async (credentials, query) => {
    try {
        await connect(credentials);
        let filter = {};
        if (query.codiceIsil) filter.codiceIsil = query.codiceIsil;
        if (query.sala)       filter.sala = query.sala;
        const data = await Opera.find(filter, { __v: 0 });
        return { ok: true, data };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

// ── GET ONE ──────────────────────────────────────────────────

exports.getOne = async (credentials, id) => {
    try {
        await connect(credentials);
        const data = await Opera.findById(id, { __v: 0 });
        if (!data) return { ok: false, error: 'Opera non trovata.' };
        return { ok: true, data };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

// ── CREATE ───────────────────────────────────────────────────

exports.create = async (credentials, data) => {
    try {
        await connect(credentials);
        const nuova = new Opera(data);
        await nuova.save();
        return { ok: true, data: nuova };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

// ── UPDATE ───────────────────────────────────────────────────

exports.update = async (credentials, id, data) => {
    try {
        await connect(credentials);
        const updated = await Opera.findByIdAndUpdate(id, data, { new: true, runValidators: true, projection: { __v: 0 } });
        if (!updated) return { ok: false, error: 'Opera non trovata.' };
        return { ok: true, data: updated };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

// ── DELETE ───────────────────────────────────────────────────

exports.remove = async (credentials, id) => {
    try {
        await connect(credentials);
        const deleted = await Opera.findByIdAndDelete(id);
        if (!deleted) return { ok: false, error: 'Opera non trovata.' };
        return { ok: true, message: "Opera rimossa correttamente" };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};
