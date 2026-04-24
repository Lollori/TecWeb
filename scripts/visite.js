/*
File: visite.js
Gestione visite con Mongoose - Schema Server Globale (Persistente)
*/

console.log('[visite.js] modulo caricato');
const mongoose = require("mongoose");
console.log('[visite.js] mongoose importato');

const visitaSchema = new mongoose.Schema({
    nomeVisita:       { type: String, required: true },
    nomeMnemonico:    { type: String, required: false },
    logistica:        { type: String, required: false },
    quizDomanda:      { type: String, required: false },
    opereCount:       { type: Number, default: 0 },
    codiceIsil:       { type: String, required: false },
    autoreId:         { type: String, required: false },
    pubblica:         { type: Boolean, default: false },
    prezzo:           { type: Number,  default: 0 },
    acquirenti:       { type: Number,  default: 0 }
});

const Visita = mongoose.models.Visita || mongoose.model("Visita", visitaSchema);

const MONGO_URI_ARTAROUND = (credentials) => {
    const isLocal = process.env.MONGO_LOCAL === 'true';
    return isLocal
        ? 'mongodb://localhost:27017/artaround'
        : `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/artaround?authSource=admin&writeConcern=majority`;
};

async function connect(credentials) {
    const state = mongoose.connection.readyState;
    // 1 = connected, 2 = connecting
    if (state === 1 || state === 2) return;
    // 3 = disconnecting: aspetta prima di riconnettersi
    if (state === 3) {
        await new Promise(resolve => mongoose.connection.once('close', resolve));
    }
    try {
        await mongoose.connect(MONGO_URI_ARTAROUND(credentials));
    } catch(e) {
        console.error("Errore di connessione in visite.js:", e.message);
        throw e;
    }
}

exports.seed = async (credentials) => {
    const fs = require("fs").promises;
    let debug = [];
    try {
        await connect(credentials);
        debug.push("Connesso a MongoDB.");

        const raw = await fs.readFile(global.rootDir + "/public/data/visite.json", "utf8");
        const data = JSON.parse(raw);
        debug.push(`Letti ${data.length} visite dal file JSON.`);

        const cleared = await Visita.deleteMany({});
        debug.push(`Eliminati ${cleared.deletedCount} documenti esistenti.`);

        await Visita.insertMany(data);
        debug.push(`Inserite ${data.length} nuove visite.`);

        return { ok: true, message: `Seed completato: ${data.length} visite inserite.`, debug };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message, debug };
    }
};

exports.getAll = async (credentials, query) => {
    let filter = {};
    if (query.codiceIsil) filter.codiceIsil = query.codiceIsil;
    
    try {
        await connect(credentials);
        const visite = await Visita.find(filter, { __v: 0 });
        return { ok: true, data: visite };
    } catch (e) {
        console.error("visite.getAll API error:", e);
        return { ok: false, error: e.message };
    }
};

exports.getOne = async (credentials, id) => {
    try {
        await connect(credentials);
        const visita = await Visita.findById(id, { __v: 0 });
        if (!visita) return { ok: false, error: "Visita non trovata." };
        return { ok: true, data: visita };
    } catch (e) {
        console.error("visite.getOne API error:", e);
        return { ok: false, error: e.message };
    }
};

exports.create = async (credentials, body) => {
    try {
        await connect(credentials);
        const visita = new Visita(body);
        await visita.save();
        return { ok: true, data: visita };
    } catch (e) {
        console.error("visite.create API error:", e);
        return { ok: false, error: e.message };
    }
};

exports.update = async (credentials, id, body) => {
    try {
        await connect(credentials);
        const updated = await Visita.findByIdAndUpdate(
            id,
            body,
            { new: true, runValidators: true, projection: { __v: 0 } }
        );
        if (!updated) return { ok: false, error: "Visita non trovata." };
        return { ok: true, data: updated };
    } catch (e) {
        console.error("visite.update API error:", e);
        return { ok: false, error: e.message };
    }
};

exports.remove = async (credentials, id) => {
    try {
        await connect(credentials);
        const deleted = await Visita.findByIdAndDelete(id);
        if (!deleted) return { ok: false, error: "Visita non trovata." };
        return { ok: true, message: `Visita "${deleted.nomeVisita}" eliminata.` };
    } catch (e) {
        console.error("visite.remove API error:", e);
        return { ok: false, error: e.message };
    }
};
