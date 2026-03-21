const mongoose = require("mongoose");
const fs = require("fs").promises;
const template = require(global.rootDir + "/public/scripts/tpl.js");

const museoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    citta: { type: String, required: true },
    indirizzo: { type: String },
    codiceIsil: { type: String, required: true, unique: true },
    immagineCopertina: { type: String },
    descrizioneBreve: { type: String }
});

const Museo = mongoose.model("Museo", museoSchema);

let fn = "./public/data/musei.json";
let dbname = "artaround_db"; 

mongoose.set('strictQuery', false);

exports.create = async (credentials) => {
    let debug = [];
    try {
        const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbname}?authSource=admin&writeConcern=majority`;
        await mongoose.connect(mongouri);
        
        let doc = await fs.readFile(global.rootDir + fn, 'utf8');
        let data = JSON.parse(doc);

        await Museo.deleteMany({});
        let inserted = await Museo.insertMany(data);

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

exports.search = async (q, credentials) => {
    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbname}?authSource=admin&writeConcern=majority`;
    
    // Assicuriamoci che query non sia undefined per evitare errori nel template
    let data = { query: q.nome || "", result: null };
    
    try {
        await mongoose.connect(mongouri);
        
        // MODIFICA: Aggiunto .lean() per rendere i dati compatibili con Handlebars
        const musei = await Museo.find({
            $or: [
                { nome: { $regex: new RegExp(q.nome, "i") } },
                { citta: { $regex: new RegExp(q.nome, "i") } }
            ]
        }).lean(); 

        await mongoose.connection.close();

        data.result = musei;
        
        if (q.ajax) {
            return data;
        } else {
            // Qui tpl.js prenderà i dati "lean" e sostituirà correttamente {{_id}}
            return await template.generate("musei.html", data);
        }
    } catch (e) {
        data.error = e;
        return data;
    }
};