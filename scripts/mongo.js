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

// --- [NUOVO] SCHEMA PER GLI UTENTI ---
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model("User", userSchema);

mongoose.set('strictQuery', false);

/* ========================================== */
/* FUNZIONI ORIGINALI (NON TOCCATE)          */
/* ========================================== */

exports.create = async (credentials) => {
    let debug = [];
    try {
        const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbname}?authSource=admin&writeConcern=majority`;
        await mongoose.connect(mongouri, { useNewUrlParser: true, useUnifiedTopology: true });
        debug.push(`Connected to ${credentials.site}...`)
        let doc = await fs.readFile(global.rootDir + fn, 'utf8')
        let data = JSON.parse(doc)
        let cleared = await Capital.deleteMany({});
        let insertedCount = 0;
        await Capital.insertMany(data).then(() => { insertedCount += data.length; });
        await mongoose.connection.close();
        return { message: `Removed ${cleared.deletedCount}, added ${insertedCount} records`, debug: debug }
    } catch (e) { return e }
}

exports.search = async (q, credentials) => {
    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbname}?authSource=admin&writeConcern=majority`;
    let debug = [];
    let data = { query: q.country, result: null };
    try {
        await mongoose.connect(mongouri, { useNewUrlParser: true, useUnifiedTopology: true });
        const countries = await Capital.find({
            country: { $regex: new RegExp(q.country, "i") },
        });
        mongoose.connection.close();
        data.result = countries.map(country => {
            const { _id, __v, ...rest } = country._doc;
            return rest;
        });
        return data;
    } catch (e) { return e }
};

/* ========================================== */
/* [NUOVE] FUNZIONI PER GESTIONE UTENTI      */
/* ========================================== */

// Database separato per non mischiare utenti e capitali
const userDB = "users_artaround"; 

exports.registerUser = async (userData, credentials) => {
    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${userDB}?authSource=admin&writeConcern=majority`;
    try {
        await mongoose.connect(mongouri, { useNewUrlParser: true, useUnifiedTopology: true });
        const newUser = new User(userData);
        await newUser.save();
        await mongoose.connection.close();
        return { success: true };
    } catch (e) {
        if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
        throw e;
    }
}

exports.findUser = async (query, credentials) => {
    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${userDB}?authSource=admin&writeConcern=majority`;
    try {
        await mongoose.connect(mongouri, { useNewUrlParser: true, useUnifiedTopology: true });
        const user = await User.findOne(query);
        await mongoose.connection.close();
        return user;
    } catch (e) {
        if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
        throw e;
    }
}

exports.getAllUsers = async (credentials) => {
    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${userDB}?authSource=admin&writeConcern=majority`;
    try {
        await mongoose.connect(mongouri, { useNewUrlParser: true, useUnifiedTopology: true });
        const users = await User.find({}, { password: 0, __v: 0 }); // nasconde password
        await mongoose.connection.close();
        return { ok: true, data: users };
    } catch (e) {
        if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
        return { ok: false, error: e.message };
    }
}

exports.isConnected = async function (mongouri) {
    let client = await mongoose.connect(mongouri, { useNewUrlParser: true, useUnifiedTopology: true });
    return !!client && !!client.topology && client.topology.isConnected()
}
