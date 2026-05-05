/*
File: mongo.js
Author: Fabio Vitali (Originale) + Modifiche per Utenti
*/

const mongoose = require("mongoose");
const fs = require("fs").promises;

// --- CONFIGURAZIONE E SCHEMI ESISTENTI (Paesi/Capitali) ---
let fn = "/public/data/country-by-capital-city.json"
let dbname = "countries"

const capitalSchema = new mongoose.Schema({
    country: { type: String, required: true },
    city: { type: String, required: false }
});
const Capital = mongoose.model("Capital", capitalSchema);

// --- SCHEMA PER GLI UTENTI ---
function generateUserId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

const userSchema = new mongoose.Schema({
    userId:   { type: String, unique: true, default: generateUserId },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    ruolo:    { type: String, enum: ['curatore', 'visitatore', 'autore'], required: true }
});
const User = mongoose.model("User", userSchema);

mongoose.set('strictQuery', false);

// --- SCHEMA PER LE OPERE ---
const operaSchema = new mongoose.Schema({
    codiceIsil: { type: String, required: true, index: true },
    operaId:    { type: String, required: true },
    tipo:       { type: String, default: '' },
    autore:     { type: String, default: '' },
    datazione:  { type: String, default: '' },
    immagine:   { type: String, default: '' },
    descrizione:{ type: String, default: '' },
    linguaggio: { type: String, default: 'semplice' },
    lunghezza:  { type: String, default: '1min' },
    testo:      { type: String, default: '' },
    licenza:    { type: String, default: 'gratuita' },
    prezzo:     { type: Number, default: 0 },
    pubblica:   { type: Boolean, default: false },
    adozioni:   { type: Number, default: 0 },
    creatoDa:   { type: String, default: '' },
    altezza:    { type: Number, default: 0 },
    larghezza:  { type: Number, default: 0 },
    profondita:  { type: Number, default: 0 },
    tecnica:    { type: String, default: '' },
    materiali:  { type: String, default: '' },
});

const Opera = mongoose.model("Opera", operaSchema);

exports.Opera = Opera;

// ── HELPER: connessione ──────────────────────────────────────

async function connect(credentials, dbName) {
    if (mongoose.connection.readyState === 1) {
        console.log('[mongo.js] Già connesso a MongoDB.');
        return;
    }

    const isLocal = credentials.site === 'localhost' ||
                    process.env.NODE_ENV !== 'production' ||
                    process.env.MONGO_LOCAL === 'true';

    let mongouri;
    if (isLocal) {
        mongouri = `mongodb://localhost:27017/${dbName}`;
        console.log(`[mongo.js] Connessione locale a ${dbName}...`);
    } else {
        mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbName}?authSource=admin&writeConcern=majority`;
        console.log(`[mongo.js] Connessione a ${credentials.site}...`);
    }

    try {
        await mongoose.connect(mongouri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('[mongo.js] Connessione riuscita.');
    } catch(e) {
        console.error("[mongo.js] Errore di connessione:", e.message);
        throw e;
    }
}

// --- FUNZIONI ORIGINALI (Paesi/Capitali) ---

exports.create = async (credentials) => {
    let debug = [];
    try {
        await connect(credentials, dbname);
        debug.push(`Connected to ${credentials.site}...`);
        let doc = await fs.readFile(global.rootDir + fn, 'utf8');
        let data = JSON.parse(doc);
        let cleared = await Capital.deleteMany({});
        await Capital.insertMany(data);
        let insertedCount = data.length;
        return { message: `Removed ${cleared.deletedCount}, added ${insertedCount} records`, debug: debug };
    } catch (e) { return e; }
};

exports.search = async (q, credentials) => {
    let data = { query: q.country, result: null };
    try {
        await connect(credentials, dbname);
        const countries = await Capital.find({
            country: { $regex: new RegExp(q.country, "i") },
        });
        data.result = countries.map(country => {
            const { _id, __v, ...rest } = country._doc;
            return rest;
        });
        return data;
    } catch (e) { return e; }
};

// --- FUNZIONI PER GESTIONE UTENTI ---

const userDB = "users_artaround";

exports.registerUser = async (userData, credentials) => {
    try {
        await connect(credentials, userDB);
        const newUser = new User(userData);
        await newUser.save();
        return { success: true };
    } catch (e) {
        throw e;
    }
};

exports.findUser = async (query, credentials) => {
    try {
        await connect(credentials, userDB);
        const user = await User.findOne(query, { password: 0, __v: 0 });
        return user;
    } catch (e) {
        throw e;
    }
};

exports.getAllUsers = async (credentials) => {
    try {
        await connect(credentials, userDB);
        const users = await User.find({}, { password: 0, __v: 0 });
        return { ok: true, data: users };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};

exports.seedUsers = async (credentials) => {
    try {
        const data = JSON.parse(await fs.readFile(global.rootDir + '/public/data/utenti.json', 'utf8'));
        await connect(credentials, userDB);
        await User.deleteMany({});
        await User.insertMany(data);
        return { ok: true, message: `Inseriti ${data.length} utenti.` };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};
