const mongoose = require("mongoose");

const museoSchema = new mongoose.Schema({
    nome:             { type: String, required: true },
    citta:            { type: String, required: true },
    indirizzo:        { type: String, required: false },
    codiceIsil:       { type: String, required: false, unique: true },
    immagineCopertina:{ type: String, required: false },
    descrizioneBreve: { type: String, required: false },
    curatoreId:       { type: String, required: false },
    mappaEmbed:       { type: String, required: false },
    mappaLink:        { type: String, required: false },
    mappaInterna:     [{ piano: { type: String }, url: { type: String } }],
});

const Museo = mongoose.model("Museo", museoSchema);
mongoose.set("strictQuery", false);


async function connect(credentials) {
    if (mongoose.connection.readyState === 1) return;

    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/artaround?authSource=admin&writeConcern=majority`;

    try {
        await mongoose.connect(mongouri, { serverSelectionTimeoutMS: 5000 });
        console.log(`[musei.js] Connesso a MongoDB (${credentials.site}).`);
    } catch(e) {
        console.error("[musei.js] Errore di connessione:", e.message);
        throw e;
    }
}


exports.seed = async (credentials) => {
    const fs = require("fs").promises;
    try {
        await connect(credentials);
        const raw = await fs.readFile(global.rootDir + "/public/data/musei.json", "utf8");
        const data = JSON.parse(raw);
        await Museo.deleteMany({});
        await Museo.insertMany(data);
        return { ok: true, message: `Seed completato: ${data.length} musei inseriti.` };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};


exports.getAll = async (credentials, query) => {
    try {
        await connect(credentials);
        let filter = {};
        if (query.citta)       filter.citta       = { $regex: new RegExp(query.citta, "i") };
        if (query.nome)        filter.nome        = { $regex: new RegExp(query.nome, "i") };
        if (query.curatoreId)  filter.curatoreId  = query.curatoreId;
        const musei = await Museo.find(filter, { __v: 0 });
        return { ok: true, data: musei };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};


exports.getOne = async (credentials, codiceIsil) => {
    try {
        await connect(credentials);
        const museo = await Museo.findOne({ codiceIsil }, { __v: 0 });
        if (!museo) return { ok: false, error: "Museo non trovato." };
        return { ok: true, data: museo };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};


exports.create = async (credentials, body) => {
    try {
        await connect(credentials);
        const museo = new Museo(body);
        await museo.save();
        return { ok: true, data: museo };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};


exports.update = async (credentials, codiceIsil, body) => {
    try {
        await connect(credentials);
        const updated = await Museo.findOneAndUpdate(
            { codiceIsil },
            body,
            { new: true, runValidators: true, projection: { __v: 0 } }
        );
        if (!updated) return { ok: false, error: "Museo non trovato." };
        return { ok: true, data: updated };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};


exports.remove = async (credentials, codiceIsil) => {
    try {
        await connect(credentials);
        const deleted = await Museo.findOneAndDelete({ codiceIsil });
        if (!deleted) return { ok: false, error: "Museo non trovato." };
        return { ok: true, message: `Museo "${deleted.nome}" eliminato.` };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};
