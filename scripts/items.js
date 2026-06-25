const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
    museumId: { type: String, required: true },
    objectId: { type: String, default: '' },
    /*
     * toni — tre livelli di contenuto:
     *   semplice  (~3 s)  linguaggio elementare, utenti giovani
     *   medio     (~15 s) linguaggio accessibile, pubblico generale
     *   avanzato  (~40 s) terminologia tecnica, pubblico esperto
     */
    toni: {
        semplice: {
            testo:  { type: String, default: '' },
            durata: { type: Number, default: 3  },
        },
        medio: {
            testo:  { type: String, default: '' },
            durata: { type: Number, default: 15 },
        },
        avanzato: {
            testo:  { type: String, default: '' },
            durata: { type: Number, default: 40 },
        },
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    image:    { type: String, default: '' },
    authorId: { type: String, required: true },
    operaId:  { type: String, required: true, index: true },
    pubblica: { type: Boolean, default: false },
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
