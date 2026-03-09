/*
File: index.js
Author: Fabio Vitali (Modificato per ArtAround Editor)
Version: 1.1 
*/

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const globalRootDir = __dirname;

/* ========================== */
/* CONFIG PERCORSI       */
/* ========================== */

// La cartella dove si trovano i tuoi file HTML (visto che index.js è in TecWeb)
const editorPath = path.join(globalRootDir, 'Editor-Marketplace'); 
const publicPath = path.join(globalRootDir, 'public');

/* ========================== */
/* EXPRESS CONFIG          */
/* ========================== */

// 1. Gestione file statici (CSS, Immagini, JS in /public)
app.use('/public', express.static(publicPath));

// 2. Permette a Express di trovare i file HTML direttamente dentro Editor-Marketplace
app.use(express.static(editorPath)); 

// Middleware per leggere i dati inviati dai form (POST) e abilitare CORS
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// Configurazione per HTTPS dietro proxy (Server Unibo)
app.enable('trust proxy');

/* ========================== */
/* CARICAMENTO MODULI      */
/* ========================== */

const template = require(path.join(globalRootDir, 'scripts', 'tpl.js'));
const mymongo = require(path.join(globalRootDir, 'scripts', 'mongo.js'));

/* ========================== */
/* ROTTE            */
/* ========================== */

// Rotta per la HOME (index.html)
app.get('/', function (req, res) { 
    const indexPath = path.join(editorPath, 'index.html');
    res.sendFile(indexPath, function (err) {
        if (err) {
            console.error("Errore invio index.html:", err.message);
            res.status(404).send("Il server non ha trovato index.html in: " + editorPath);
        }
    });
});

// Rotta specifica per OPERE.HTML
app.get('/opere.html', function (req, res) { 
    const operePath = path.join(editorPath, 'opere.html');
    res.sendFile(operePath, function (err) {
        if (err) {
            console.error("Errore invio opere.html:", err.message);
            res.status(404).send("File opere.html non trovato nel percorso: " + operePath);
        }
    });
});

// Rotta automatica per tutte le altre pagine (musei, visite, utenti, ecc.)
app.get('/:page.html', function (req, res) {
    const pagePath = path.join(editorPath, req.params.page + '.html');
    res.sendFile(pagePath, function (err) {
        if (err) {
            res.status(404).send("La pagina " + req.params.page + ".html non esiste in Editor-Marketplace.");
        }
    });
});

// Rotte di Test e Info
app.get('/hw', async function(req, res) { 
    res.send("<h1>Hello world as a Node service</h1><p><a href='javascript:history.back()'>Go back</a></p>");
});

const info = async function(req, res) {
    let data = {
        startDate: global.startDate ? global.startDate.toLocaleString() : "N/D", 
        requestDate: (new Date()).toLocaleString(), 
        request: { host: req.hostname, method: req.method, path: req.path }, 
        query: req.query,
        body: req.body
    }
    res.send(await template.generate('info.html', data));
}
app.get('/info', info);
app.post('/info', info);

/* ========================== */
/* MONGODB          */
/* ========================== */

const mongoCredentials = {
    user: "site252630",
    pwd: "Tei2xiip",
    site: "mongo_site252630"
}  

app.get('/db/create', async function (req, res) {
    res.send(await mymongo.create(mongoCredentials))
});

app.get('/db/search', async function (req, res) {
    res.send(await mymongo.search(req.query, mongoCredentials))
});

/* ========================== */
/* ACTIVATE NODE SERVER    */
/* ========================== */

const PORT = 8000;
app.listen(PORT, function() { 
    global.startDate = new Date(); 
    console.log(`\n=========================================`);
    console.log(`SERVER ARTAROUND ATTIVO`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Cartella HTML: ${editorPath}`);
    console.log(`Cartella Public: ${publicPath}`);
    console.log(`Avviato il: ${global.startDate.toLocaleString()}`);
    console.log(`=========================================\n`);
});