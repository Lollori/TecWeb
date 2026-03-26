/*
File: visite.js
Gestione visite con Mongoose.
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
    codiceIsil:       { type: String, required: false } // Riferimento al museo opzionale
});

const Visita = mongoose.model("Visita", visitaSchema);
console.log('[visite.js] schema e model definiti');

// helper di connessione (simile a musei.js)
async function connect(credentials) {
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

exports.getAll = async (credentials, query) => {
    let filter = {};
    if (query.codiceIsil) filter.codiceIsil = query.codiceIsil;
    
    try {
        await connect(credentials);
        const visite = await Visita.find(filter, { __v: 0 });
        await disconnect();
        return { ok: true, data: visite };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.getOne = async (credentials, id) => {
    try {
        await connect(credentials);
        const visita = await Visita.findById(id, { __v: 0 });
        await disconnect();
        if (!visita) return { ok: false, error: "Visita non trovata." };
        return { ok: true, data: visita };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.create = async (credentials, body) => {
    try {
        await connect(credentials);
        const visita = new Visita(body);
        await visita.save();
        await disconnect();
        return { ok: true, data: visita };
    } catch (e) {
        console.error(e);
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
        await disconnect();
        if (!updated) return { ok: false, error: "Visita non trovata." };
        return { ok: true, data: updated };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.remove = async (credentials, id) => {
    try {
        await connect(credentials);
        const deleted = await Visita.findByIdAndDelete(id);
        await disconnect();
        if (!deleted) return { ok: false, error: "Visita non trovata." };
        return { ok: true, message: `Visita "${deleted.nomeVisita}" eliminata.` };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};
