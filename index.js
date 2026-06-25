/* ========================== */
/* SETUP            */
/* ========================== */
global.rootDir = __dirname ;
global.startDate = null;

const template = require(global.rootDir + '/scripts/tpl.js');
const mymongo = require(global.rootDir + '/scripts/mongo.js');
let musei;
try {
    musei = require(global.rootDir + '/scripts/musei.js');
} catch(e) {
    console.error('[index.js] ERRORE nel caricare scripts/musei.js:', e.message);
}
let visite;
try {
    visite = require(global.rootDir + '/scripts/visite.js');
} catch(e) {
    console.error('[index.js] ERRORE nel caricare scripts/visite.js:', e.message);
}

/* parte opere */

let opere;
try {
    opere = require(global.rootDir + '/scripts/opere.js');
} catch(e) {
    console.error('[index.js] ERRORE nel caricare scripts/opere.js:', e.message);
}

let items;
try {
    items = require(global.rootDir + '/scripts/items.js');
} catch(e) {
    console.error('[index.js] ERRORE nel caricare scripts/items.js:', e.message);
}

const sessioni = require(global.rootDir + '/scripts/sessioni.js');


const express = require('express');
const cors = require('cors')
const path = require('path');

/* ========================== */
/* EXPRESS CONFIG & ROUTES   */
/* ========================== */
let app = express(); 
app.use('/js'  , express.static(global.rootDir +'/public/js'));
app.use('/css' , express.static(global.rootDir +'/public/css'));
app.use('/data', express.static(global.rootDir +'/public/data'));
app.use('/docs', express.static(global.rootDir +'/public/html'));
app.use('/img' , express.static(global.rootDir +'/public/media'));
app.use('/Editor-Marketplace', express.static(global.rootDir + '/Editor-Marketplace'));
app.use('/login', express.static(global.rootDir + '/Login'));
app.use('/Navigator', express.static(global.rootDir + '/Navigator'));
app.use('/maps',      express.static(global.rootDir + '/public/maps'));

app.use(express.urlencoded({ extended: true })) 
app.use(express.json())
app.use(cors())
app.enable('trust proxy');

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/* ========================== */
/* MONGODB          */
/* ========================== */
const mongoCredentials = {
    user: "site252630",
    pwd: "Tei2xiip",
    site: __dirname.startsWith('/webapp') ? "mongo_site252630" : "localhost"
}  

console.log(`Connessione DB impostata su: ${mongoCredentials.site}`);

app.get('/db/create', async function (req, res) {
    res.send(await mymongo.create(mongoCredentials))
});
app.get('/db/search', async function (req, res) {
    res.send(await mymongo.search(req.query, mongoCredentials))
});

/* --- ROTTA LOGIN --- */
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`[index.js] Tentativo di login per: ${username}`);

    try {
        const user = await mymongo.findUser({ username: username, password: password }, mongoCredentials);

        if (!user) {
            console.log(`[index.js] Login fallito per: ${username}`);
            return res.status(401).json({ success: false, message: "Username o password errati." });
        }

        console.log(`[index.js] Login successo per: ${username}`);
        res.json({ success: true, message: "Login effettuato", user: user });
    } catch (error) {
        console.error('[index.js] Errore login:', error);
        res.status(500).json({ success: false, message: "Errore interno del server" });
    }
});

/* --- ROTTA REGISTRAZIONE --- */
app.post('/api/register', async (req, res) => {
    const { username, password, ruolo } = req.body;
    try {
        const check = await mymongo.findUser({ username: username }, mongoCredentials);
        if (check) {
            return res.status(400).json({ success: false, message: "Username già registrato!" });
        }

        await mymongo.registerUser({ username: username, password: password, ruolo: ruolo || 'visitatore' }, mongoCredentials);
        res.json({ success: true, message: "Registrazione avvenuta!" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Errore nel salvataggio DB" });
    }
});

/* ========================== */
/* API UTENTI          */
/* ========================== */
app.get('/api/utenti/seed', async (_req, res) => {
    const result = await mymongo.seedUsers(mongoCredentials);
    res.json(result);
});

app.get('/api/utenti', async (_req, res) => {
    const result = await mymongo.getAllUsers(mongoCredentials);
    res.json(result);
});

app.delete('/api/utenti/:id', async (req, res) => {
    const result = await mymongo.deleteUser(req.params.id, mongoCredentials);
    res.json(result);
});

/* ========================== */
/* API MUSEI           */
/* ========================== */
app.get('/api/test', (_req, res) => {
    res.json({ ok: true, message: 'Il server risponde correttamente.' });
});

app.get('/api/musei/seed', async function (_req, res) {
    const result = await musei.seed(mongoCredentials);
    res.json(result);
});

app.get('/api/musei', async function (req, res) {
    const result = await musei.getAll(mongoCredentials, req.query);
    res.json(result);
});

app.get('/api/musei/:codiceIsil', async function (req, res) {
    const result = await musei.getOne(mongoCredentials, req.params.codiceIsil);
    res.json(result);
});

app.post('/api/musei', async function (req, res) {
    const result = await musei.create(mongoCredentials, req.body);
    res.json(result);
});

app.put('/api/musei/:codiceIsil', async function (req, res) {
    const result = await musei.update(mongoCredentials, req.params.codiceIsil, req.body);
    res.json(result);
});

app.delete('/api/musei/:codiceIsil', async function (req, res) {
    const result = await musei.remove(mongoCredentials, req.params.codiceIsil);
    res.json(result);
});

/* ========================== */
/* API VISITE          */
/* ========================== */
app.get('/api/visite/seed', async function (_req, res) {
    const result = await visite.seed(mongoCredentials);
    res.json(result);
});

app.get('/api/visite', async function (req, res) {
    const result = await visite.getAll(mongoCredentials, req.query);
    res.json(result);
});

app.get('/api/visite/:id', async function (req, res) {
    const result = await visite.getOne(mongoCredentials, req.params.id);
    res.json(result);
});

app.post('/api/visite', async function (req, res) {
    const result = await visite.create(mongoCredentials, req.body);
    res.json(result);
});

app.put('/api/visite/:id', async function (req, res) {
    const result = await visite.update(mongoCredentials, req.params.id, req.body);
    res.json(result);
});

app.delete('/api/visite/:id', async function (req, res) {
    const result = await visite.remove(mongoCredentials, req.params.id);
    res.json(result);
});

/* ========================== */
/* API OPERE (Marketplace)    */
/* ========================== */

app.get('/api/opere/seed', async function (_req, res) {
    const result = await opere.seed(mongoCredentials);
    res.json(result);
});

// Recupera le opere (filtrate per codiceIsil se presente in query)
app.get('/api/opere', async function (req, res) {
    res.set('Cache-Control', 'no-store');
    const result = await opere.getAll(mongoCredentials, req.query);
    res.json(result);
});

// Recupera una singola opera per ID
app.get('/api/opere/:id', async function (req, res) {
    const result = await opere.getOne(mongoCredentials, req.params.id);
    res.json(result);
});

// Crea una nuova opera
app.post('/api/opere', async function (req, res) {
    const result = await opere.create(mongoCredentials, req.body);
    res.json(result);
});

// Modifica un'opera esistente
app.put('/api/opere/:id', async function (req, res) {
    const result = await opere.update(mongoCredentials, req.params.id, req.body);
    res.json(result);
});

// Elimina un'opera
app.delete('/api/opere/:id', async function (req, res) {
    const result = await opere.remove(mongoCredentials, req.params.id);
    res.json(result);
});


/* ========================== */
/* API ITEMS                  */
/* ========================== */

app.get('/api/items/seed', async function (_req, res) {
    const result = await items.seed(mongoCredentials);
    res.json(result);
});

app.get('/api/items', async function (req, res) {
    const result = await items.getAll(mongoCredentials, req.query);
    res.json(result);
});

app.get('/api/items/:id', async function (req, res) {
    const result = await items.getOne(mongoCredentials, req.params.id);
    res.json(result);
});

app.post('/api/items', async function (req, res) {
    const result = await items.create(mongoCredentials, req.body);
    res.json(result);
});

app.put('/api/items/:id', async function (req, res) {
    const result = await items.update(mongoCredentials, req.params.id, req.body);
    res.json(result);
});

app.delete('/api/items/:id', async function (req, res) {
    const result = await items.remove(mongoCredentials, req.params.id);
    res.json(result);
});


/* ========================== */
/* API SESSIONI (Navigator)   */
/* ========================== */

// Crea sessione (docente avvia una visita)
app.post('/api/sessioni', (req, res) => {
    const { codice, visitaId, visitaNome, museoIsil, itemIds } = req.body;
    if (!codice || !visitaId) return res.status(400).json({ error: 'Parametri mancanti.' });
    const result = sessioni.createSession(codice, visitaId, visitaNome, museoIsil, itemIds);
    if (result.error) return res.status(409).json(result);
    res.json(result);
});

// Stato sessione
app.get('/api/sessioni/:codice', (req, res) => {
    const session = sessioni.getSession(req.params.codice);
    if (!session) return res.status(404).json({ error: 'Sessione non trovata.' });
    const { clients, ...safeSession } = session;
    res.json({ ok: true, data: safeSession });
});

// Studente entra in sessione
app.post('/api/sessioni/:codice/join', (req, res) => {
    const result = sessioni.joinSession(req.params.codice);
    if (result.error) return res.status(404).json(result);
    res.json(result);
});

// Docente avvia la visita
app.post('/api/sessioni/:codice/avvia', (req, res) => {
    const result = sessioni.startSession(req.params.codice);
    if (result.error) return res.status(404).json(result);
    res.json(result);
});

// Docente naviga tra gli items
app.post('/api/sessioni/:codice/naviga', (req, res) => {
    const { direction } = req.body;
    if (!direction) return res.status(400).json({ error: 'Parametro direction mancante.' });
    const result = sessioni.navigaItem(req.params.codice, direction);
    if (result.error) return res.status(404).json(result);
    res.json(result);
});

// Docente termina la visita
app.post('/api/sessioni/:codice/chiudi', (req, res) => {
    const result = sessioni.closeSession(req.params.codice);
    if (result.error) return res.status(404).json(result);
    res.json(result);
});

// Partecipante invia un messaggio
app.post('/api/sessioni/:codice/messaggio', (req, res) => {
    const { sender, text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Testo mancante.' });
    const result = sessioni.sendMessage(req.params.codice, sender || 'Visitatore', text);
    if (result.error) return res.status(404).json(result);
    res.json(result);
});

// SSE stream – docente e studenti ricevono aggiornamenti in tempo reale
app.get('/api/sessioni/:codice/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const added = sessioni.addClient(req.params.codice, res);
    if (!added) {
        res.write(`data: ${JSON.stringify({ tipo: 'errore', messaggio: 'Sessione non trovata.' })}\n\n`);
        res.end();
    }
    // cleanup handled inside addClient via 'close' event
});

/* ========================== */
/* ACTIVATE NODE SERVER    */
/* ========================== */
app.listen(8000, function() {
    global.startDate = new Date() ; 
    console.log(`App listening on port 8000 started ${global.startDate.toLocaleString()}` )
});


/*       END OF SCRIPT        */