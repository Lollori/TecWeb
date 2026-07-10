const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
    museumId: { type: String, required: true },
    objectId: { type: String, default: '' },
    /*
     * toni — tre livelli di linguaggio (semplice/medio/avanzato).
     * Ogni tono può avere fino a 3 varianti di durata (d3/d15/d40 secondi);
     * l'autore può compilare le 3 varianti per uno, due o tutti e tre i toni,
     * ma per essere valido un tono deve avere tutte e 3 le varianti compilate.
     */
    toni: {
        semplice: {
            d3:  { type: String, default: '' },
            d15: { type: String, default: '' },
            d40: { type: String, default: '' },
        },
        medio: {
            d3:  { type: String, default: '' },
            d15: { type: String, default: '' },
            d40: { type: String, default: '' },
        },
        avanzato: {
            d3:  { type: String, default: '' },
            d15: { type: String, default: '' },
            d40: { type: String, default: '' },
        },
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    image:    { type: String, default: '' },
    authorId:   { type: String, required: true },
    /*
     * Un item può riferirsi a un'opera specifica (operaId valorizzato) oppure
     * essere contenuto indipendente non legato a una singola opera — es.
     * movimenti culturali, stili, artisti, eventi storici (vedi specifiche
     * progetto). In quel caso operaId resta vuoto e si usa "topic".
     */
    contentType: { type: String, enum: ['opera', 'indipendente'], default: 'opera' },
    operaId:    { type: String, default: '', index: true },
    topic:      { type: String, default: '' },
    // Tag liberi facoltativi (es. "caravaggio", "rinascimento") per la ricerca nel marketplace.
    tags:       { type: [String], default: [], index: true },
    pubblica:   { type: Boolean, default: false },
    acquirenti: { type: Number, default: 0 },
    acquirentiIds: { type: [String], default: [] },
});

const Item = mongoose.models.Item || mongoose.model("Item", itemSchema);

async function connect(credentials) {
    if (mongoose.connection.readyState === 1) return;

    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/artaround?authSource=admin&writeConcern=majority`;

    try {
        await mongoose.connect(mongouri, { serverSelectionTimeoutMS: 5000 });
        console.log(`[items.js] Connesso a MongoDB (${credentials.site}).`);
    } catch(e) {
        console.error("[items.js] Errore di connessione:", e.message);
        throw e;
    }
}

exports.seed = async (credentials) => {
    const fs = require("fs").promises;
    try {
        await connect(credentials);
        const raw  = await fs.readFile(global.rootDir + "/public/data/items.json", "utf8");
        const data = JSON.parse(raw);
        const cleared = await Item.deleteMany({});
        await Item.insertMany(data);
        return { ok: true, message: `Seed completato: ${data.length} items inseriti.` };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.getAll = async (credentials, query) => {
    try {
        await connect(credentials);
        const filter = {};
        if (query.operaId)  filter.operaId  = query.operaId;
        if (query.museumId) filter.museumId = query.museumId;
        if (query.authorId) filter.authorId = query.authorId;
        if (query.pubblica !== undefined) filter.pubblica = query.pubblica === 'true';
        const data = await Item.find(filter, { __v: 0 });
        return { ok: true, data };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.getOne = async (credentials, id) => {
    try {
        await connect(credentials);
        const item = await Item.findById(id, { __v: 0 });
        if (!item) return { ok: false, error: "Item non trovato." };
        return { ok: true, data: item };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.create = async (credentials, body) => {
    try {
        await connect(credentials);
        const item = new Item(body);
        await item.save();
        return { ok: true, data: item };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.update = async (credentials, id, body) => {
    try {
        await connect(credentials);
        const updated = await Item.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true, projection: { __v: 0 } });
        if (!updated) return { ok: false, error: "Item non trovato." };
        return { ok: true, data: updated };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.remove = async (credentials, id) => {
    try {
        await connect(credentials);
        const deleted = await Item.findByIdAndDelete(id);
        if (!deleted) return { ok: false, error: "Item non trovato." };
        return { ok: true, message: "Item rimosso correttamente" };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

// Registra l'acquisto lato server (idempotente): l'utente resta proprietario
// dell'item anche dopo logout o su un altro dispositivo/browser.
exports.acquista = async (credentials, id, userId) => {
    try {
        await connect(credentials);
        if (!userId) return { ok: false, error: "Utente mancante." };

        let item = await Item.findOneAndUpdate(
            { _id: id, acquirentiIds: { $ne: userId } },
            { $addToSet: { acquirentiIds: userId }, $inc: { acquirenti: 1 } },
            { new: true, projection: { __v: 0 } }
        );
        if (!item) item = await Item.findById(id, { __v: 0 });
        if (!item) return { ok: false, error: "Item non trovato." };

        return { ok: true, data: item };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};
