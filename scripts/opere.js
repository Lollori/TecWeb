const mongoose = require("mongoose");
const mymongo = require("./mongo.js"); // Importa gli schemi da mongo.js
const Opera = mymongo.Opera;

const dbCredentials = {
    user: "site252630",
    pwd: "Tei2xiip",
    site: "mongo_site252630"
};

const userDB = "users_artaround";

async function connect() {
    const mongouri = `mongodb://${dbCredentials.user}:${dbCredentials.pwd}@${dbCredentials.site}/${userDB}?authSource=admin&writeConcern=majority`;
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongouri);
    }
}

// SEED: carica opere.json nel DB
exports.seed = async (credentials) => {
    const fs = require('fs').promises;
    try {
        await connect();
        const raw  = await fs.readFile(global.rootDir + '/public/data/opere.json', 'utf8');
        const data = JSON.parse(raw);
        const cleared = await Opera.deleteMany({});
        await Opera.insertMany(data);
        return { ok: true, message: `Rimossi ${cleared.deletedCount}, inseriti ${data.length} opere.` };
    } catch (e) { return { ok: false, error: e.message }; }
};

// GET: Recupera opere di un museo specifico
exports.getAll = async (credentials, query) => {
    try {
        await connect();
        let filter = {};
        if (query.codiceIsil) filter.codiceIsil = query.codiceIsil; // FILTRO CHIAVE
        const data = await Opera.find(filter);
        return { ok: true, data: data };
    } catch (e) { return { ok: false, error: e.message }; }
};

// POST: Crea nuova opera
exports.create = async (credentials, data) => {
    try {
        await connect();
        const nuova = new Opera(data);
        await nuova.save();
        return { ok: true, data: nuova };
    } catch (e) { return { ok: false, error: e.message }; }
};

// PUT: Aggiorna opera per ID
exports.update = async (credentials, id, data) => {
    try {
        await connect();
        const updated = await Opera.findByIdAndUpdate(id, data, { new: true, runValidators: true });
        if (!updated) return { ok: false, error: 'Opera non trovata.' };
        return { ok: true, data: updated };
    } catch (e) { return { ok: false, error: e.message }; }
};

// DELETE: Elimina per ID
exports.remove = async (credentials, id) => {
    try {
        await connect();
        await Opera.findByIdAndDelete(id);
        return { ok: true, message: "Opera rimossa correttamente" };
    } catch (e) { return { ok: false, error: e.message }; }
};