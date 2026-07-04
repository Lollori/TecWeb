/*
File: visite.js
Gestione visite con Mongoose
*/

const mongoose = require("mongoose");

const visitaSchema = new mongoose.Schema({
    nomeVisita:       { type: String, required: true },
    nomeMnemonico:    { type: String, required: false },
    logistica:        { type: String, required: false },
    quizDomanda:      { type: String, required: false },
    quizDomande:      {
        type: [{
            testo:    { type: String, required: true },
            opzioni:  { type: [String], required: true },
            corretta: { type: Number, required: true },
        }],
        default: [],
    },
    opereCount:       { type: Number, default: 0 },
    codiceIsil:       { type: String, required: false },
    autoreId:         { type: String, required: false },
    pubblica:         { type: Boolean, default: false },
    prezzo:           { type: Number,  default: 0 },
    acquirenti:       { type: Number,  default: 0 },
    acquirentiIds:    { type: [String], default: [] },
    itemIds:          { type: [String], default: [] },
});

const Visita = mongoose.models.Visita || mongoose.model("Visita", visitaSchema);

async function connect(credentials) {
    if (mongoose.connection.readyState === 1) return;

    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/artaround?authSource=admin&writeConcern=majority`;

    try {
        await mongoose.connect(mongouri, { serverSelectionTimeoutMS: 5000 });
        console.log(`[visite.js] Connesso a MongoDB (${credentials.site}).`);
    } catch(e) {
        console.error("[visite.js] Errore di connessione:", e.message);
        throw e;
    }
}

exports.seed = async (credentials) => {
    const fs = require("fs").promises;
    try {
        await connect(credentials);
        const raw = await fs.readFile(global.rootDir + "/public/data/visite.json", "utf8");
        const data = JSON.parse(raw);
        const cleared = await Visita.deleteMany({});
        await Visita.insertMany(data);
        return { ok: true, message: `Seed completato: ${data.length} visite inserite.` };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.getAll = async (credentials, query) => {
    try {
        await connect(credentials);
        const filter = {};
        if (query.codiceIsil) filter.codiceIsil = query.codiceIsil;

        const validIds = (query.ids || '')
            .split(',')
            .filter(id => id && mongoose.isValidObjectId(id));

        if (query.autoreId) {
            const or = [
                { autoreId: query.autoreId },
                { acquirentiIds: query.autoreId },
            ];
            if (validIds.length) or.push({ _id: { $in: validIds } });
            filter.$or = or;
        } else if (validIds.length) {
            filter._id = { $in: validIds };
        }

        const visite = await Visita.find(filter, { __v: 0 });
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
        return { ok: true, data: visita };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.update = async (credentials, id, body) => {
    try {
        await connect(credentials);
        const updated = await Visita.findByIdAndUpdate(id, body, { new: true, runValidators: true, projection: { __v: 0 } });
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
        if (!deleted) return { ok: false, error: "Visita non trovata." };
        return { ok: true, message: `Visita "${deleted.nomeVisita}" eliminata.` };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

// Registra l'acquisto lato server (idempotente): l'utente resta proprietario
// della visita anche dopo logout o su un altro dispositivo/browser.
exports.acquista = async (credentials, id, userId) => {
    try {
        await connect(credentials);
        if (!userId) return { ok: false, error: "Utente mancante." };

        let visita = await Visita.findOneAndUpdate(
            { _id: id, acquirentiIds: { $ne: userId } },
            { $addToSet: { acquirentiIds: userId }, $inc: { acquirenti: 1 } },
            { new: true, projection: { __v: 0 } }
        );
        if (!visita) visita = await Visita.findById(id, { __v: 0 });
        if (!visita) return { ok: false, error: "Visita non trovata." };

        return { ok: true, data: visita };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};
