const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const globalRootDir = __dirname;

/* ========================== */
/* CONFIG PERCORSI            */
/* ========================== */

// PERCORSO CORRETTO: Entriamo in Editor-Marketplace e poi in Frontend
const editorPath = path.join(globalRootDir, 'Editor-Marketplace', 'Frontend'); 
const publicPath = path.join(globalRootDir, 'public');

/* ========================== */
/* EXPRESS CONFIG             */
/* ========================== */

app.use('/public', express.static(publicPath));
app.use(express.static(editorPath)); 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.enable('trust proxy');

const template = require(path.join(globalRootDir, 'scripts', 'tpl.js'));
const mymongo = require(path.join(globalRootDir, 'scripts', 'mongo.js'));

/* ========================== */
/* ROTTE                      */
/* ========================== */

// HOME
app.get('/', function (req, res) { 
    res.sendFile(path.join(editorPath, 'index.html'), (err) => {
        if (err) res.status(404).send("Non trovo index.html in: " + editorPath);
    });
});

// OPERE.HTML (Finalmente col percorso giusto!)
app.get('/opere.html', function (req, res) { 
    const operePath = path.join(editorPath, 'opere.html');
    res.sendFile(operePath, (err) => {
        if (err) {
            console.error("Errore invio opere.html:", err.message);
            res.status(404).send("File non trovato. Il server cercava qui: " + operePath);
        }
    });
});

// Rotta automatica per le altre pagine (.html)
app.get('/:page.html', function (req, res) {
    const pagePath = path.join(editorPath, req.params.page + '.html');
    res.sendFile(pagePath, (err) => {
        if (err) res.status(404).send("Pagina non trovata.");
    });
});

/* ========================== */
/* MONGODB E AVVIO            */
/* ========================== */

const mongoCredentials = { user: "site252630", pwd: "Tei2xiip", site: "mongo_site252630" };
app.get('/db/search', async (req, res) => res.send(await mymongo.search(req.query, mongoCredentials)));

const PORT = 8000;
app.listen(PORT, () => { 
    console.log(`\n=========================================`);
    console.log(`SERVER ARTAROUND ATTIVO`);
    console.log(`URL: http://localhost:${PORT}/opere.html`);
    console.log(`Percorso HTML: ${editorPath}`);
    console.log(`=========================================\n`);
});