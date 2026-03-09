/*

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const globalRootDir = __dirname;

// ==========================
// CONFIG PERCORSI
// ==========================

const editorPath = path.resolve(globalRootDir, 'Editor-Marketplace', 'Frontend');
const publicPath = path.resolve(globalRootDir, 'public');

// Debug percorsi all'avvio
console.log('globalRootDir:', globalRootDir);
console.log('editorPath:', editorPath);
console.log('Frontend esiste:', fs.existsSync(editorPath));
console.log('opere.html esiste:', fs.existsSync(path.join(editorPath, 'opere.html')));
console.log('publicPath:', publicPath, 'esiste:', fs.existsSync(publicPath));

// ==========================
// EXPRESS CONFIG
// ==========================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.enable('trust proxy');

// 1. File statici /public (prima)
app.use('/public', express.static(publicPath));

// ==========================
// CARICAMENTO MODULI
// ==========================

const template = require(path.join(globalRootDir, 'scripts', 'tpl.js'));
const mymongo = require(path.join(globalRootDir, 'scripts', 'mongo.js'));

// ==========================
// ROTTE HTML (prima di static)
// ==========================

// Home
app.get('/', function (req, res) {
    const indexPath = path.join(editorPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html non trovato: ' + indexPath);
    }
});

// Opere.html specifica
app.get('/opere.html', function (req, res) {
    const operePath = path.join(editorPath, 'opere.html');
    console.log('Richiesta opere.html:', operePath);
    console.log('File esiste:', fs.existsSync(operePath));
    
    if (fs.existsSync(operePath)) {
        res.sendFile(operePath);
    } else {
        res.status(404).send('opere.html non trovato: ' + operePath);
    }
});

// Altre pagine .html
app.get('/:page.html', function (req, res) {
    const pagePath = path.join(editorPath, req.params.page + '.html');
    console.log('Richiesta pagina:', pagePath);
    
    if (fs.existsSync(pagePath)) {
        res.sendFile(pagePath);
    } else {
        res.status(404).send('Pagina ' + req.params.page + '.html non trovata: ' + pagePath);
    }
});

// ==========================
// MONGODB
// ==========================

const mongoCredentials = {
    user: "site252630",
    pwd: "Tei2xiip",
    site: "mongo_site252630"
};

app.get('/db/search', async function (req, res) {
    try {
        res.send(await mymongo.search(req.query, mongoCredentials));
    } catch (err) {
        console.error('Errore MongoDB:', err);
        res.status(500).send('Errore server DB');
    }
});

// ==========================
// FALLBACK STATIC (dopo rotte)
// ==========================
app.use(express.static(editorPath)); // Serve tutto da Frontend come fallback

// 404 generico
app.use(function(req, res) {
    res.status(404).send('Pagina non trovata: ' + req.url);
});

// ==========================
// AVVIO SERVER
// ==========================

const PORT = 8000;
app.listen(PORT, function() {
    console.log('\n=========================================');
    console.log('SERVER ARTAROUND ATTIVO');
    console.log(`URL: http://localhost:${PORT}/`);
    console.log(`Opere: http://localhost:${PORT}/opere.html`);
    console.log(`Percorso Frontend: ${editorPath}`);
    console.log('=========================================\n');
});
*/
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const editorPath = path.resolve(__dirname, 'Editor-Marketplace', 'Frontend');
const publicPath = path.resolve(__dirname, 'public');  // ← AGGIUNGI

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ← AGGIUNGI PRIMA DI STATIC
app.use('/public', express.static(publicPath));  
app.use(express.static(editorPath));

app.listen(8000, () => {
    console.log('✅ SERVER ATTIVO http://localhost:8000/opere.html');
});
