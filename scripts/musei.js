/*
File: musei.js
Gestione musei con Mongoose.
Segue lo stesso pattern di mongoDB.js del professore.
*/

console.log('[musei.js] modulo caricato');
const mongoose = require("mongoose");
console.log('[musei.js] mongoose importato');

// ── SCHEMA ──────────────────────────────────────────────────────────────────
// Lo Schema descrive la "forma" di un documento museo in MongoDB.
// Mongoose controlla che i dati rispettino questa struttura prima di salvarli.

const museoSchema = new mongoose.Schema({
    nome:             { type: String, required: true },
    citta:            { type: String, required: true },
    indirizzo:        { type: String, required: false },
    codiceIsil:       { type: String, required: false, unique: true },
    immagineCopertina:{ type: String, required: false },
    descrizioneBreve: { type: String, required: false },
});

// Il "Model" è la classe che usiamo per interagire con la collection "museos" in MongoDB.
// Mongoose crea automaticamente la collection al plurale del nome ("Museo" → "museos").
const Museo = mongoose.model("Museo", museoSchema);
console.log('[musei.js] schema e model definiti');

mongoose.set("strictQuery", false);


// ── HELPER: connessione ──────────────────────────────────────────────────────
// Funzione interna riutilizzata da tutte le operazioni CRUD.
// Costruisce la URI di connessione dal formato usato dal professore.
async function connect(credentials) {
    // In locale (senza VPN) usa MongoDB installato sul tuo PC.
    // In produzione (server UniBo o con VPN) usa le credenziali del prof.
    const isLocal = process.env.MONGO_LOCAL === 'true';
    const mongouri = isLocal
        ? 'mongodb://localhost:27017/artaround'
        : `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/artaround?authSource=admin&writeConcern=majority`;
    await mongoose.connect(mongouri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
}

async function disconnect() {
    await mongoose.connection.close();
}


// ── SEED: carica il JSON nel DB ──────────────────────────────────────────────
// Chiamata da GET /api/musei/seed
// Legge musei.json, svuota la collection, reinserisce tutto.
// Utile per inizializzare o resettare i dati.
exports.seed = async (credentials) => {
    console.log('[musei.js] seed() chiamato');
    const fs = require("fs").promises;
    let debug = [];
    try {
        console.log('[musei.js] tentativo connessione MongoDB...');
        await connect(credentials);
        debug.push("Connesso a MongoDB.");

        const raw = await fs.readFile(global.rootDir + "/public/data/musei.json", "utf8");
        const data = JSON.parse(raw);
        debug.push(`Letti ${data.length} musei dal file JSON.`);

        const cleared = await Museo.deleteMany({});
        debug.push(`Eliminati ${cleared.deletedCount} documenti esistenti.`);

        await Museo.insertMany(data);
        debug.push(`Inseriti ${data.length} nuovi musei.`);

        await disconnect();
        return { ok: true, message: `Seed completato: ${data.length} musei inseriti.`, debug };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message, debug };
    }
};


// ── READ: tutti i musei ──────────────────────────────────────────────────────
// Chiamata da GET /api/musei
// Supporta filtro opzionale per città: GET /api/musei?citta=Torino
exports.getAll = async (credentials, query) => {
    let filter = {};
    if (query.citta) {
        filter.citta = { $regex: new RegExp(query.citta, "i") };
    }
    if (query.nome) {
        filter.nome = { $regex: new RegExp(query.nome, "i") };
    }
    try {
        await connect(credentials);
        const musei = await Museo.find(filter, { __v: 0 }); // esclude il campo interno __v
        await disconnect();
        return { ok: true, data: musei };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};


// ── READ: singolo museo per codiceIsil ──────────────────────────────────────
// Chiamata da GET /api/musei/:codiceIsil
exports.getOne = async (credentials, codiceIsil) => {
    try {
        await connect(credentials);
        const museo = await Museo.findOne({ codiceIsil }, { __v: 0 });
        await disconnect();
        if (!museo) return { ok: false, error: "Museo non trovato." };
        return { ok: true, data: museo };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};


// ── CREATE: aggiunge un museo ────────────────────────────────────────────────
// Chiamata da POST /api/musei
// Il body della richiesta deve contenere i campi del museo.
exports.create = async (credentials, body) => {
    try {
        await connect(credentials);
        const museo = new Museo(body);
        await museo.save();
        await disconnect();
        return { ok: true, data: museo };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};


// ── UPDATE: modifica un museo ────────────────────────────────────────────────
// Chiamata da PUT /api/musei/:codiceIsil
exports.update = async (credentials, codiceIsil, body) => {
    try {
        await connect(credentials);
        const updated = await Museo.findOneAndUpdate(
            { codiceIsil },
            body,
            { new: true, runValidators: true, projection: { __v: 0 } }
        );
        await disconnect();
        if (!updated) return { ok: false, error: "Museo non trovato." };
        return { ok: true, data: updated };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};


// ── DELETE: elimina un museo ─────────────────────────────────────────────────
// Chiamata da DELETE /api/musei/:codiceIsil
exports.remove = async (credentials, codiceIsil) => {
    try {
        await connect(credentials);
        const deleted = await Museo.findOneAndDelete({ codiceIsil });
        await disconnect();
        if (!deleted) return { ok: false, error: "Museo non trovato." };
        return { ok: true, message: `Museo "${deleted.nome}" eliminato.` };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};
