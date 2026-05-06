const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
    museumId: { type: String, required: true },
    objectId: { type: String, default: '' },
    contents: { type: [String], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    image:    { type: String, default: '' },
    authorId: { type: String, required: true },
    operaId:  { type: String, required: true, index: true },
});

const Item = mongoose.models.Item || mongoose.model("Item", itemSchema);

let isConnected = false;

async function connect(credentials) {
    if (mongoose.connection.readyState === 1) {
        console.log('[items.js] Già connesso a MongoDB.');
        return;
    }

    const isLocal = credentials.site === 'localhost' ||
                    process.env.NODE_ENV !== 'production';

    let mongouri;
    if (isLocal) {
        mongouri = 'mongodb://localhost:27017/artaround';
        console.log('[items.js] Connessione locale a MongoDB (senza auth)...');
    } else {
        mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/artaround?authSource=admin&writeConcern=majority`;
        console.log('[items.js] Connessione a production con credenziali...');
    }

    try {
        await mongoose.connect(mongouri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
        });
        isConnected = true;
        console.log('[items.js] Connessione a MongoDB riuscita.');
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
        const updated = await Item.findByIdAndUpdate(id, body, { new: true, runValidators: true, projection: { __v: 0 } });
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
