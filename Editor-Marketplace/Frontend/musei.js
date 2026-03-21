const mongoose = require("mongoose");
const fs = require("fs").promises;
const template = require(global.rootDir + "/scripts/tpl.js");

// Definizione dello Schema del Museo
const museoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    citta: { type: String, required: true },
    indirizzo: { type: String },
    codiceIsil: { type: String, required: true, unique: true }, // Identificatore Universale
    immagineCopertina: { type: String },
    descrizioneBreve: { type: String }
});

const Museo = mongoose.model("Museo", museoSchema);

// Parametri presi dal tuo template
let fn = "./public/data/musei.json";
let dbname = "artaround_db"; 

mongoose.set('strictQuery', false);

// Funzione per inizializzare il DB partendo dal JSON
exports.create = async (credentials) => {
    let debug = [];
    try {
        const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbname}?authSource=admin&writeConcern=majority`;
        
        await mongoose.connect(mongouri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        debug.push(`Connesso a MongoDB per il marketplace ArtAround...`);
        
        // Lettura del file JSON
        let doc = await fs.readFile(global.rootDir + fn, 'utf8');
        let data = JSON.parse(doc);
        debug.push(`Letto file JSON: ${data.length} musei trovati.`);

        // Pulizia collezione (opzionale, utile in fase di test)
        let cleared = await Museo.deleteMany({});
        debug.push(`Rimossi ${cleared.deletedCount || 0} record precedenti.`);

        // Inserimento nuovi dati
        let inserted = await Museo.insertMany(data);
        debug.push(`Inseriti ${inserted.length} musei con successo.`);

        await mongoose.connection.close();
        return {
            message: `<h1>Database sincronizzato: ${inserted.length} musei caricati</h1>`, 
            debug: debug
        };
    } catch (e) {
        e.debug = debug;
        return e;
    }
};

// Funzione per la ricerca (usata dal pannello di scelta multipla)
exports.search = async (q, credentials) => {
    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbname}?authSource=admin&writeConcern=majority`;
    let data = { query: q.nome, result: null };
    
    try {
        await mongoose.connect(mongouri);
        
        // Ricerca per nome o città (case insensitive)
        const musei = await Museo.find({
            $or: [
                { nome: { $regex: new RegExp(q.nome, "i") } },
                { citta: { $regex: new RegExp(q.nome, "i") } }
            ]
        });

        await mongoose.connection.close();

        data.result = musei;
        
        if (q.ajax) {
            return data;
        } else {
            return await template.generate("musei.html", data);
        }
    } catch (e) {
        data.error = e;
        return data;
    }
};