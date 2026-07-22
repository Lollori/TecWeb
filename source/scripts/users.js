const mongoose = require("mongoose");
const fs = require("fs").promises;

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

const connections = {};

async function connect(credentials) {
    const key = `${credentials.site}_users_artaround`;
    if (connections[key]?.readyState === 1) return connections[key];

    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/users_artaround?authSource=admin&writeConcern=majority`;

    try {
        const conn = await mongoose.createConnection(mongouri, { serverSelectionTimeoutMS: 5000 });
        connections[key] = conn;
        console.log(`[users.js] Connesso a users_artaround (${credentials.site}).`);
        return conn;
    } catch (e) {
        console.error("[users.js] Errore di connessione:", e.message);
        throw e;
    }
}

function model(conn) {
    return conn.models['User'] || conn.model('User', userSchema);
}

exports.registerUser = async (userData, credentials) => {
    try {
        const conn = await connect(credentials);
        const User = model(conn);
        const newUser = new User(userData);
        await newUser.save();
        return { success: true };
    } catch (e) {
        throw e;
    }
};

exports.findUser = async (query, credentials) => {
    try {
        const conn = await connect(credentials);
        const User = model(conn);
        const user = await User.findOne(query, { password: 0, __v: 0 });
        return user;
    } catch (e) {
        throw e;
    }
};

exports.getAllUsers = async (credentials) => {
    try {
        const conn = await connect(credentials);
        const User = model(conn);
        const users = await User.find({}, { password: 0, __v: 0 });
        return { ok: true, data: users };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};

exports.seedUsers = async (credentials) => {
    try {
        const data = JSON.parse(await fs.readFile(global.rootDir + '/public/data/utenti.json', 'utf8'));
        const conn = await connect(credentials);
        const User = model(conn);
        await User.deleteMany({});
        await User.insertMany(data);
        return { ok: true, message: `Inseriti ${data.length} utenti.` };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};

exports.deleteUser = async (id, credentials) => {
    try {
        const conn = await connect(credentials);
        const User = model(conn);
        const result = await User.findByIdAndDelete(id);
        if (!result) return { ok: false, error: 'Utente non trovato.' };
        return { ok: true, message: 'Utente eliminato.' };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};
