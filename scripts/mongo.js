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
    ruolo:    { type: String, enum: ['curatore', 'visitatore', 'autore', 'admin'], required: true }
});

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
    sala:       { type: String, default: '' },
});

const Opera = mongoose.model("Opera", operaSchema);

exports.Opera = Opera;

// ── HELPER: connessione per DB (pool separato per ogni DB) ───
const connections = {};

async function connect(credentials, dbName) {
    const key = `${credentials.site}_${dbName}`;
    if (connections[key]?.readyState === 1) return connections[key];

    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbName}?authSource=admin&writeConcern=majority`;

    try {
        const conn = await mongoose.createConnection(mongouri, { serverSelectionTimeoutMS: 5000 });
        connections[key] = conn;
        console.log(`[mongo.js] Connesso a ${dbName} (${credentials.site}).`);
        return conn;
    } catch(e) {
        console.error("[mongo.js] Errore di connessione:", e.message);
        throw e;
    }
}

function m(conn, name, schema) {
    return conn.models[name] || conn.model(name, schema);
}

// --- FUNZIONI ORIGINALI (Paesi/Capitali) ---

exports.create = async (credentials) => {
    let debug = [];
    try {
        const conn = await connect(credentials, dbname);
        debug.push(`Connected to ${credentials.site}...`);
        let doc = await fs.readFile(global.rootDir + fn, 'utf8');
        let data = JSON.parse(doc);
        const CapModel = m(conn, 'Capital', capitalSchema);
        let cleared = await CapModel.deleteMany({});
        await CapModel.insertMany(data);
        let insertedCount = data.length;
        return { message: `Removed ${cleared.deletedCount}, added ${insertedCount} records`, debug: debug };
    } catch (e) { return e; }
};

exports.search = async (q, credentials) => {
    let data = { query: q.country, result: null };
    try {
        const conn = await connect(credentials, dbname);
        const CapModel = m(conn, 'Capital', capitalSchema);
        const countries = await CapModel.find({
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
        const conn = await connect(credentials, userDB);
        const UserModel = m(conn, 'User', userSchema);
        const newUser = new UserModel(userData);
        await newUser.save();
        return { success: true };
    } catch (e) {
        throw e;
    }
};

exports.findUser = async (query, credentials) => {
    try {
        const conn = await connect(credentials, userDB);
        const UserModel = m(conn, 'User', userSchema);
        const user = await UserModel.findOne(query, { password: 0, __v: 0 });
        return user;
    } catch (e) {
        throw e;
    }
};

exports.getAllUsers = async (credentials) => {
    try {
        const conn = await connect(credentials, userDB);
        const UserModel = m(conn, 'User', userSchema);
        const users = await UserModel.find({}, { password: 0, __v: 0 });
        return { ok: true, data: users };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};

exports.seedUsers = async (credentials) => {
    try {
        const data = JSON.parse(await fs.readFile(global.rootDir + '/public/data/utenti.json', 'utf8'));
        const conn = await connect(credentials, userDB);
        const UserModel = m(conn, 'User', userSchema);
        await UserModel.deleteMany({});
        await UserModel.insertMany(data);
        return { ok: true, message: `Inseriti ${data.length} utenti.` };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};

exports.deleteUser = async (id, credentials) => {
    try {
        const conn = await connect(credentials, userDB);
        const UserModel = m(conn, 'User', userSchema);
        const result = await UserModel.findByIdAndDelete(id);
        if (!result) return { ok: false, error: 'Utente non trovato.' };
        return { ok: true, message: 'Utente eliminato.' };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};
