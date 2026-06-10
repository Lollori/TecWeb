/*
================================================================================
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║                     ⚠️  SCRIPT DI TEST FITIZIO  ⚠️                      ║
  ╠══════════════════════════════════════════════════════════════════════════╣
  ║  Questo file è uno script TEMPORANEO e FITTIZIO pensato esclusivamente  ║
  ║  per popolare il database locale con dati di prova durante lo sviluppo  ║
  ║  e il testing della sezione Analytics della dashboard admin.            ║
  ║                                                                        ║
  ║  ❌ NON utilizzare in produzione.                                       ║
  ║  ❌ NON committare nel repository (aggiungere a .gitignore).            ║
  ║  ✅ Eliminare dopo aver terminato i test.                               ║
  ║                                                                        ║
  ║  Utilizzo:  node scripts/seed-test.js                                   ║
  ╚══════════════════════════════════════════════════════════════════════════╝
================================================================================
*/

const mongoose = require("mongoose");
const fs = require("fs").promises;

// ── CREDENZIALI LOCALHOST ──────────────────────────────────────────────────
const credentials = {
    user: "site252630",
    pwd:  "Tei2xiip",
    site: "localhost"
};

const MONGO_URI = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/artaround?authSource=admin&writeConcern=majority`;

// ── SCHEMI ─────────────────────────────────────────────────────────────────

const museoSchema = new mongoose.Schema({
    nome:              { type: String, required: true },
    citta:             { type: String, required: true },
    indirizzo:         { type: String },
    codiceIsil:        { type: String, unique: true },
    immagineCopertina: { type: String },
    descrizioneBreve:  { type: String },
    curatoreId:        { type: String },
    mappaEmbed:        { type: String },
    mappaLink:         { type: String },
    mappaInterna:      [{ piano: { type: String }, url: { type: String } }],
});

const operaSchema = new mongoose.Schema({
    codiceIsil:  { type: String, required: true, index: true },
    operaId:     { type: String, required: true },
    tipo:        { type: String, default: '' },
    autore:      { type: String, default: '' },
    datazione:   { type: String, default: '' },
    immagine:    { type: String, default: '' },
    descrizione: { type: String, default: '' },
    linguaggio:  { type: String, default: 'semplice' },
    lunghezza:   { type: String, default: '1min' },
    testo:       { type: String, default: '' },
    licenza:     { type: String, default: 'gratuita' },
    prezzo:      { type: Number, default: 0 },
    pubblica:    { type: Boolean, default: false },
    adozioni:    { type: Number, default: 0 },
    creatoDa:    { type: String, default: '' },
    altezza:     { type: Number, default: 0 },
    larghezza:   { type: Number, default: 0 },
    profondita:  { type: Number, default: 0 },
    tecnica:     { type: String, default: '' },
    materiali:   { type: String, default: '' },
    sala:        { type: String, default: '' },
});

const visitaSchema = new mongoose.Schema({
    nomeVisita:    { type: String, required: true },
    nomeMnemonico: { type: String },
    logistica:     { type: String },
    quizDomanda:   { type: String },
    opereCount:    { type: Number, default: 0 },
    codiceIsil:    { type: String },
    autoreId:      { type: String },
    pubblica:      { type: Boolean, default: false },
    prezzo:        { type: Number,  default: 0 },
    acquirenti:    { type: Number,  default: 0 }
});

const itemSchema = new mongoose.Schema({
    museumId: { type: String, required: true },
    objectId: { type: String, default: '' },
    contents: { type: [String], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    image:    { type: String, default: '' },
    authorId: { type: String, required: true },
    operaId:  { type: String, required: true, index: true },
});

// ═══════════════════════════════════════════════════════════════════════════
//  DATI DI TEST
// ═══════════════════════════════════════════════════════════════════════════

const MUSEI = [
    {
        nome: "Galleria degli Uffizi",
        citta: "Firenze",
        indirizzo: "Piazzale degli Uffizi, 6",
        codiceIsil: "IT-FI0001",
        descrizioneBreve: "Uno dei musei più famosi al mondo, custode di capolavori del Rinascimento italiano.",
        curatoreId: "curatore_test_01",
        immagineCopertina: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Galleria_degli_Uffizi.jpg/1280px-Galleria_degli_Uffizi.jpg"
    },
    {
        nome: "Musei Vaticani",
        citta: "Città del Vaticano",
        indirizzo: "Viale Vaticano",
        codiceIsil: "IT-RM0001",
        descrizioneBreve: "Complesso museale che ospita la Cappella Sistina e una delle più grandi collezioni d'arte al mondo.",
        curatoreId: "curatore_test_02",
        immagineCopertina: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Vatican_Museums_entrance.jpg/1280px-Vatican_Museums_entrance.jpg"
    },
    {
        nome: "Pinacoteca di Brera",
        citta: "Milano",
        indirizzo: "Via Brera, 28",
        codiceIsil: "IT-MI0001",
        descrizioneBreve: "Importante galleria d'arte antica e moderna, situata nel palazzo di Brera.",
        curatoreId: "curatore_test_01",
        immagineCopertina: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Pinacoteca_di_Brera.jpg/1280px-Pinacoteca_di_Brera.jpg"
    }
];

const OPERE = [
    // Uffizi
    { codiceIsil: "IT-FI0001", operaId: "La Nascita di Venere", tipo: "Dipinto", autore: "Sandro Botticelli", datazione: "1485", sala: "Sala 10-14", tecnica: "Tempera su tela", altezza: 172, larghezza: 278, descrizione: "Capolavoro del Rinascimento che raffigura la dea Venere emergere dal mare.", linguaggio: "semplice", pubblica: true, adozioni: 12 },
    { codiceIsil: "IT-FI0001", operaId: "La Primavera", tipo: "Dipinto", autore: "Sandro Botticelli", datazione: "1478", sala: "Sala 10-14", tecnica: "Tempera su tavola", altezza: 203, larghezza: 314, descrizione: "Allegoria primaverile con figure mitologiche in un giardino d'aranci.", linguaggio: "semplice", pubblica: true, adozioni: 8 },
    { codiceIsil: "IT-FI0001", operaId: "Annunciazione", tipo: "Dipinto", autore: "Leonardo da Vinci", datazione: "1472", sala: "Sala 15", tecnica: "Olio e tempera su tavola", altezza: 98, larghezza: 217, descrizione: "L'arcangelo Gabriele annuncia a Maria la nascita di Gesù.", linguaggio: "avanzato", pubblica: true, adozioni: 5 },
    { codiceIsil: "IT-FI0001", operaId: "Madona del Cardellino", tipo: "Dipinto", autore: "Raffaello Sanzio", datazione: "1506", sala: "Sala 25", tecnica: "Olio su tavola", altezza: 107, larghezza: 77, descrizione: "La Vergine con il Bambino e San Giovanni che accarezzano un cardellino.", linguaggio: "semplice", pubblica: true, adozioni: 3 },
    // Vaticani
    { codiceIsil: "IT-RM0001", operaId: "Cappella Sistina - Volta", tipo: "Affresco", autore: "Michelangelo Buonarroti", datazione: "1512", sala: "Cappella Sistina", tecnica: "Affresco", altezza: 0, larghezza: 0, descrizione: "La volta della Cappella Sistina con le famose scene della Genesi e il Giudizio Universale.", linguaggio: "avanzato", pubblica: true, adozioni: 20 },
    { codiceIsil: "IT-RM0001", operaId: "Scuola di Atene", tipo: "Affresco", autore: "Raffaello Sanzio", datazione: "1511", sala: "Stanza della Segnatura", tecnica: "Affresco", altezza: 500, larghezza: 770, descrizione: "Raffigura i più grandi filosofi dell'antichità classica.", linguaggio: "avanzato", pubblica: true, adozioni: 15 },
    { codiceIsil: "IT-RM0001", operaId: "Trasfigurazione", tipo: "Dipinto", autore: "Raffaello Sanzio", datazione: "1520", sala: "Pinacoteca Vaticana", tecnica: "Olio su tavola", altezza: 410, larghezza: 279, descrizione: "L'ultimo dipinto di Raffaello, raffigurante la Trasfigurazione di Cristo.", linguaggio: "semplice", pubblica: true, adozioni: 7 },
    // Brera
    { codiceIsil: "IT-MI0001", operaId: "Sposalizio della Vergine", tipo: "Dipinto", autore: "Raffaello Sanzio", datazione: "1504", sala: "Sala VIII", tecnica: "Olio su tavola", altezza: 170, larghezza: 118, descrizione: "Cerimonia dello sposale tra la Vergine Maria e San Giuseppe.", linguaggio: "semplice", pubblica: true, adozioni: 6 },
    { codiceIsil: "IT-MI0001", operaId: "Cena in Emmaus", tipo: "Dipinto", autore: "Caravaggio", datazione: "1601", sala: "Sala XXIV", tecnica: "Olio su tela", altezza: 141, larghezza: 196, descrizione: "Cristo benedice il pane davanti ai due discepoli riconoscenti.", linguaggio: "semplice", pubblica: true, adozioni: 9 },
    { codiceIsil: "IT-MI0001", operaId: "Pietà", tipo: "Dipinto", autore: "Giovanni Bellini", datazione: "1505", sala: "Sala I", tecnica: "Olio su tavola", altezza: 86, larghezza: 107, descrizione: "La Vergine tiene in grempo il corpo morto di Cristo.", linguaggio: "semplice", pubblica: true, adozioni: 4 },
];

const VISITE = [
    { nomeVisita: "Capolavori del Rinascimento", nomeMnemonico: "uffizi_rinascimento", codiceIsil: "IT-FI0001", logistica: "Percorso di 2 ore attraverso le sale 10-15-25. Punto d'incontro: biglietteria.", pubblica: true, prezzo: 12.50, acquirenti: 34, opereCount: 4, quizDomanda: "Chi ha dipinto La Nascita di Venere?", autoreId: "autore_test_01" },
    { nomeVisita: "Botticelli e Leonardo", nomeMnemonico: "uffizi_botticelli_leonardo", codiceIsil: "IT-FI0001", logitica: "Visita guidata di 90 minuti dedicata ai due maestri.", pubblica: true, prezzo: 0, acquirenti: 52, opereCount: 3, quizDomanda: "In che anno è stata dipinta l'Annunciazione di Leonardo?", autoreId: "autore_test_01" },
    { nomeVisita: "Raffaello e Michelangelo a Roma", nomeMnemonico: "vaticani_maestri", codiceIsil: "IT-RM0001", logistica: "Tour completo di 3 ore: Cappella Sistina, Stanze di Raffaello, Pinacoteca.", pubblica: true, prezzo: 18.00, acquirenti: 67, opereCount: 3, quizDomanda: "Quale artista ha dipinto la Volta della Cappella Sistina?", autoreId: "autore_test_02" },
    { nomeVisita: "La Cappella Sistina", nomeMnemonico: "vaticani_sistina", codiceIsil: "IT-RM0001", logistica: "Visita focalizzata sulla Cappella Sistina, circa 1 ora.", pubblica: true, prezzo: 8.00, acquirenti: 89, opereCount: 1, quizDomanda: "Cosa raffigura il Giudizio Universale?", autoreId: "autore_test_02" },
    { nomeVisita: "Caravaggio e il Barocco", nomeMnemonico: "brera_caravaggio", codiceIsil: "IT-MI0001", logistica: "Percorso nelle sale dedicate al Seicento italiano.", pubblica: true, prezzo: 0, acquirenti: 21, opereCount: 2, quizDomanda: "Quale tecnica usa Caravaggio nella Cena in Emmaus?", autoreId: "autore_test_01" },
    { nomeVisita: "Raffaello: viaggio nella perfezione", nomeMnemonico: "brera_raffaello", codiceIsil: "IT-MI0001", logistica: "Focus sulle opere di Raffaello alla Brera.", pubblica: false, prezzo: 10.00, acquirenti: 0, opereCount: 1, quizDomanda: "In che anno Raffaello ha dipinto lo Sposalizio?", autoreId: "autore_test_01" },
    { nomeVisita: "Tour completo Brera", nomeMnemonico: "brera_completo", codiceIsil: "IT-MI0001", logistica: "Visita completa della pinacoteca, circa 2 ore e mezza.", pubblica: true, prezzo: 14.00, acquirenti: 18, opereCount: 3, quizDomanda: "Chi è l'autore della Pietà esposta a Brera?", autoreId: "autore_test_01" },
];

const ITEMS = [
    // La Nascita di Venere
    { museumId: "IT-FI0001", operaId: "La Nascita di Venere", authorId: "autore_test_01", objectId: "item-nascita-venere-01", contents: ["La Nascita di Venere è uno dei dipinti più iconici del Rinascimento italiano. Botticelli si ispira al classico tema della nascita della dea dall'acqua."], metadata: { materiale: "Tempera su tela", periodo: "1485", provenienza: "Firenzi, Villa di Castello" }, image: "" },
    { museumId: "IT-FI0001", operaId: "La Nascita di Venere", authorId: "autore_test_01", objectId: "item-nascita-venere-02", contents: ["Curiosità: il modello per Venere potrebbe essere Simonetta Vespucci, celebre bellezza fiorentina."], metadata: { materiale: "Tempera su tela", prezzo: 2.99 }, image: "" },
    { museumId: "IT-FI0001", operaId: "La Nascita di Venere", authorId: "autore_test_02", objectId: "item-nascita-venere-03", contents: ["Analisi iconografica: Venere al centro, Zefiro a sinistra, l'Ora a destra che le offre un mantello fiorito."], metadata: { materiale: "Tempera su tela" }, image: "" },
    // La Primavera
    { museumId: "IT-FI0001", operaId: "La Primavera", authorId: "autore_test_01", objectId: "item-primavera-01", contents: ["La Primavera è un'allegoria complessa: al centro Venere, sopra Cupido, a destra Zefiro che insegue Clori."], metadata: { materiale: "Tempera su tavola", periodo: "1478" }, image: "" },
    { museumId: "IT-FI0001", operaId: "La Primavera", authorId: "autore_test_02", objectId: "item-primavera-02", contents: ["Le oltre 500 specie botaniche raffigurate nel giardino sono state identificate dai botanici."], metadata: { materiale: "Tempera su tavola", prezzo: 1.99 }, image: "" },
    // Annunciazione
    { museumId: "IT-FI0001", operaId: "Annunciazione", authorId: "autore_test_01", objectId: "item-annunciazione-01", contents: ["L'Annunciazione di Leonardo mostra la sua rivoluzionaria tecnica dello sfumato e l'attenzione botanica."], metadata: { materiale: "Olio e tempera su tavola", periodo: "1472" }, image: "" },
    // Cappella Sistina
    { museumId: "IT-RM0001", operaId: "Cappella Sistina - Volta", authorId: "autore_test_02", objectId: "item-sistina-01", contents: ["Michelangelo ha dipinto la volta in 4 anni, lavorando supino su impalcature appositamente costruite."], metadata: { materiale: "Affresco", periodo: "1508-1512" }, image: "" },
    { museumId: "IT-RM0001", operaId: "Cappella Sistina - Volta", authorId: "autore_test_02", objectId: "item-sistina-02", contents: ["Il Giudizio Universale, dipinto 25 anni dopo la volta, copre l'altare della cappella."], metadata: { materiale: "Affresco", prezzo: 3.99 }, image: "" },
    { museumId: "IT-RM0001", operaId: "Cappella Sistina - Volta", authorId: "autore_test_01", objectId: "item-sistina-03", contents: ["La Creazione di Adamo è una delle immagini più riprodotte della storia dell'arte."], metadata: { materiale: "Affresco" }, image: "" },
    // Scuola di Atene
    { museumId: "IT-RM0001", operaId: "Scuola di Atene", authorId: "autore_test_02", objectId: "item-scuola-atene-01", contents: ["Al centro Platone e Aristotele: Platone punta verso l'alto (mondo delle idee), Aristotele verso il basso (mondo empirico)."], metadata: { materiale: "Affresco", periodo: "1511" }, image: "" },
    { museumId: "IT-RM0001", operaId: "Scuola di Atene", authorId: "autore_test_01", objectId: "item-scuola-atene-02", contents: ["Raffaello inserse i ritratti di Michelangelo, Leonardo e se stesso tra i filosofi."], metadata: { materiale: "Affresco", prezzo: 2.49 }, image: "" },
    // Cena in Emmaus
    { museumId: "IT-MI0001", operaId: "Cena in Emmaus", authorId: "autore_test_01", objectId: "item-cina-emmaus-01", contents: ["Caravaggio usa il chiaroscuro drammatico per evidenziare il momento del riconoscimento di Cristo."], metadata: { materiale: "Olio su tela", periodo: "1601" }, image: "" },
    // Sposalizio della Vergine
    { museumId: "IT-MI0001", operaId: "Sposalizio della Vergine", authorId: "autore_test_01", objectId: "item-sposalizio-01", contents: ["Lo Sposalizio mostra la perfezione prospettica raffaelliana con il tempio poligonale al centro."], metadata: { materiale: "Olio su tavola", periodo: "1504" }, image: "" },
    // Trasfigurazione
    { museumId: "IT-RM0001", operaId: "Trasfigurazione", authorId: "autore_test_02", objectId: "item-trasfigurazione-01", contents: ["L'ultimo capolavoro di Raffaello, rimasto incompletto alla sua morte nel 1520."], metadata: { materiale: "Olio su tavola", periodo: "1516-1520" }, image: "" },
    // Pietà
    { museumId: "IT-MI0001", operaId: "Pietà", authorId: "autore_test_01", objectId: "item-pieta-01", contents: ["La Pietà di Bellini è nota per la sua intensità emotiva e il realismo dei dettagli anatomici."], metadata: { materiale: "Olio su tavola", periodo: "1505" }, image: "" },
];

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║          SEED DATI DI TEST — AROUND ART (locale)            ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log();

    let conn;
    try {
        conn = await mongoose.createConnection(MONGO_URI, { serverSelectionTimeoutMS: 5000 }).asPromise();
        console.log("[seed-test] Connesso a MongoDB locale.\n");
    } catch (e) {
        console.error("[seed-test] ❌ Errore di connessione MongoDB:", e.message);
        console.error("  Assicurati che MongoDB sia in esecuzione su localhost.");
        process.exit(1);
    }

    const Museo  = conn.model("Museo",  museoSchema);
    const Opera  = conn.model("Opera",  operaSchema);
    const Visita = conn.model("Visita", visitaSchema);
    const Item   = conn.model("Item",   itemSchema);

    try {
        // ── MUSEI ──────────────────────────────────────────────────────
        await Museo.deleteMany({});
        await Museo.insertMany(MUSEI);
        console.log(`[seed-test] ✅ Musei inseriti:    ${MUSEI.length}`);

        // ── OPERE ──────────────────────────────────────────────────────
        await Opera.deleteMany({});
        await Opera.insertMany(OPERE);
        console.log(`[seed-test] ✅ Opere inserite:    ${OPERE.length}`);

        // ── VISITE ─────────────────────────────────────────────────────
        await Visita.deleteMany({});
        await Visita.insertMany(VISITE);
        console.log(`[seed-test] ✅ Visite inserite:   ${VISITE.length}`);

        // ── ITEMS ──────────────────────────────────────────────────────
        await Item.deleteMany({});
        await Item.insertMany(ITEMS);
        console.log(`[seed-test] ✅ Items inseriti:    ${ITEMS.length}`);

        console.log();
        console.log("╔══════════════════════════════════════════════════════════════╗");
        console.log("║  ✅ Seed completato con successo!                            ║");
        console.log("║                                                              ║");
        console.log("║  Ora puoi accedere alla Dashboard Admin → Analytics          ║");
        console.log("║  per vedere i grafici popolati con i dati di test.           ║");
        console.log("╚══════════════════════════════════════════════════════════════╝");

    } catch (e) {
        console.error("[seed-test] ❌ Errore durante il seed:", e.message);
    } finally {
        await conn.close();
        process.exit(0);
    }
}

main();
