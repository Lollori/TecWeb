/*
File: visite.js
Gestione visite con Mongoose - Riscritto con Connection Pooling Isolato
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

// NON usiamo il connect() e disconnect() globale di mongoose perché causa "Race Conditions".
// Se musei.js chiude la connessione globale mentre visite.js sta leggendo, ottieni un alert di errore!
let localConnection = null;
let VisitaModel = null;

async function getModel(credentials) {
    if (!localConnection) {
        const isLocal = process.env.MONGO_LOCAL === 'true';
        const mongouri = isLocal
            ? 'mongodb://localhost:27017/artaround'
            : `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/artaround?authSource=admin&writeConcern=majority`;
        
        // createConnection instrada la comunicazione su un pool protetto e privato
        localConnection = await mongoose.createConnection(mongouri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }).asPromise();
        
        VisitaModel = localConnection.model("Visita", visitaSchema);
    }
    return VisitaModel;
}

exports.getAll = async (credentials, query) => {
    let filter = {};
    if (query.codiceIsil) filter.codiceIsil = query.codiceIsil;
    
    try {
        const Visita = await getModel(credentials);
        const visite = await Visita.find(filter, { __v: 0 });
        return { ok: true, data: visite };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.getOne = async (credentials, id) => {
    try {
        const Visita = await getModel(credentials);
        const visita = await Visita.findById(id, { __v: 0 });
        if (!visita) return { ok: false, error: "Visita non trovata." };
        return { ok: true, data: visita };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.create = async (credentials, body) => {
    try {
        const Visita = await getModel(credentials);
        const visita = new Visita(body);
        await visita.save();
        return { ok: true, data: visita };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.update = async (credentials, id, body) => {
    try {
        const Visita = await getModel(credentials);
        const updated = await Visita.findByIdAndUpdate(
            id,
            body,
            { new: true, runValidators: true, projection: { __v: 0 } }
        );
        if (!updated) return { ok: false, error: "Visita non trovata." };
        return { ok: true, data: updated };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.remove = async (credentials, id) => {
    try {
        const Visita = await getModel(credentials);
        const deleted = await Visita.findByIdAndDelete(id);
        if (!deleted) return { ok: false, error: "Visita non trovata." };
        return { ok: true, message: `Visita "${deleted.nomeVisita}" eliminata.` };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};
