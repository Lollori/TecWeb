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

const MONGO_URI = (credentials) => {
    const isLocal = process.env.MONGO_LOCAL === 'true';
    return isLocal
        ? 'mongodb://localhost:27017/artaround'
        : `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/artaround?authSource=admin&writeConcern=majority`;
};

async function connect(credentials) {
    const state = mongoose.connection.readyState;
    if (state === 1 || state === 2) return;
    if (state === 3) {
        await new Promise(resolve => mongoose.connection.once('close', resolve));
    }
    await mongoose.connect(MONGO_URI(credentials));
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
    } catch (e) { return { ok: false, error: e.message }; }
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
    } catch (e) { return { ok: false, error: e.message }; }
};

exports.getOne = async (credentials, id) => {
    try {
        await connect(credentials);
        const item = await Item.findById(id, { __v: 0 });
        if (!item) return { ok: false, error: "Item non trovato." };
        return { ok: true, data: item };
    } catch (e) { return { ok: false, error: e.message }; }
};

exports.create = async (credentials, body) => {
    try {
        await connect(credentials);
        const item = new Item(body);
        await item.save();
        return { ok: true, data: item };
    } catch (e) { return { ok: false, error: e.message }; }
};

exports.update = async (credentials, id, body) => {
    try {
        await connect(credentials);
        const updated = await Item.findByIdAndUpdate(id, body, { new: true, runValidators: true });
        if (!updated) return { ok: false, error: "Item non trovato." };
        return { ok: true, data: updated };
    } catch (e) { return { ok: false, error: e.message }; }
};

exports.remove = async (credentials, id) => {
    try {
        await connect(credentials);
        const deleted = await Item.findByIdAndDelete(id);
        if (!deleted) return { ok: false, error: "Item non trovato." };
        return { ok: true, message: "Item eliminato." };
    } catch (e) { return { ok: false, error: e.message }; }
};
