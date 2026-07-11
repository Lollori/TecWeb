/*
File: carts.js
Gestione carrelli marketplace con Mongoose — un documento per utente,
sincronizzato dal client ad ogni modifica del carrello (vedi saveMktCart
in Editor-Marketplace/dashboard.js). Permette all'admin di aggregare i
carrelli di tutti gli utenti per l'analytics ("Top item/visite desiderati").
*/

const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    items:  { type: [String], default: [] },
    visite: { type: [String], default: [] },
});

const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

async function connect(credentials) {
    if (mongoose.connection.readyState === 1) return;

    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/artaround?authSource=admin&writeConcern=majority`;

    try {
        await mongoose.connect(mongouri, { serverSelectionTimeoutMS: 5000 });
        console.log(`[carts.js] Connesso a MongoDB (${credentials.site}).`);
    } catch (e) {
        console.error("[carts.js] Errore di connessione:", e.message);
        throw e;
    }
}

exports.getAll = async (credentials) => {
    try {
        await connect(credentials);
        const carts = await Cart.find({}, { __v: 0 });
        return { ok: true, data: carts };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.getOne = async (credentials, userId) => {
    try {
        await connect(credentials);
        const cart = await Cart.findOne({ userId }, { __v: 0 });
        return { ok: true, data: cart || { userId, items: [], visite: [] } };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};

exports.save = async (credentials, userId, body) => {
    try {
        await connect(credentials);
        const cart = await Cart.findOneAndUpdate(
            { userId },
            { userId, items: body.items || [], visite: body.visite || [] },
            { new: true, upsert: true, runValidators: true, projection: { __v: 0 } }
        );
        return { ok: true, data: cart };
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
};
