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
    site: "mongo_site252630"
}  

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

        await mymongo.registerUser({ username: username, password: password, ruolo: ruolo || 'VIS' }, mongoCredentials);
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
/* ACTIVATE NODE SERVER    */
/* ========================== */
app.listen(8000, function() { 
    global.startDate = new Date() ; 
    console.log(`App listening on port 8000 started ${global.startDate.toLocaleString()}` )
});


/*       END OF SCRIPT        */