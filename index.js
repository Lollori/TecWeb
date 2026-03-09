const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const globalRootDir = __dirname;

/* ========================== */
/* CONFIG PERCORSI            */
/* ========================== */

// Risaliamo la gerarchia: TecWeb -> Editor-Marketplace -> Frontend
const editorPath = path.join(globalRootDir, 'Editor-Marketplace', 'Frontend'); 
const publicPath = path.join(globalRootDir, 'public');

/* ========================== */
/* EXPRESS CONFIG             */
/* ========================== */

// 1. Gestione file statici (CSS, Immagini, JS in /public)
app.use('/public', express.static(publicPath));

// 2. Permette a Express di trovare i file HTML dentro Frontend
app.use(express.static(editorPath)); 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.enable('trust proxy');

/* ========================== */
/* CARICAMENTO MODULI      */
/* ========================== */

const template = require(path.join(globalRootDir, 'scripts', 'tpl.js'));
const mymongo = require(path.join(globalRootDir, 'scripts', 'mongo.js'));

/* ========================== */
/* ROTTE                      */
/* ========================== */

// Rotta per la HOME (index.html)
app.get('/', function (req, res) { 
    res.sendFile(path.join(editorPath, 'index.html'), (err) => {
        if (err) res.status(404).send("Non trovo index.html in: " + editorPath);
    });
});

// Rotta specifica per OPERE.HTML
app.get('/', function (req, res) { 
    const opereFile = path.join(editorPath, 'opere.html');
    console.log("Tentativo di invio: " + opereFile);
    
    res.sendFile(opereFile, function (err) {
        if (err) {
            console.error("Errore:", err.message);
            res.status(404).send("File opere.html non trovato nel percorso: " + opereFile);
        }
    });
});

// Rotta automatica per tutte le altre pagine (musei, visite, utenti, ecc.)
app.get('/:page.html', function (req, res) {
    const pagePath = path.join(editorPath, req.params.page + '.html');
    res.sendFile(pagePath, (err) => {
        if (err) res.status(404).send("La pagina " + req.params.page + ".html non esiste.");
    });
});

/* ========================== */
/* MONGODB                    */
/* ========================== */

const mongoCredentials = {
    user: "site252630",
    pwd: "Tei2xiip",
    site: "mongo_site252630"
}  

app.get('/db/search', async function (req, res) {
    res.send(await mymongo.search(req.query, mongoCredentials))
});

/* ========================== */
/* ACTIVATE NODE SERVER       */
/* ========================== */

const PORT = 8000;
app.listen(PORT, function() { 
    console.log(`\n=========================================`);
    console.log(`SERVER ARTAROUND ATTIVO`);
    console.log(`URL: http://localhost:${PORT}/opere.html`);
    console.log(`Percorso HTML: ${editorPath}`);
    console.log(`=========================================\n`);
});
