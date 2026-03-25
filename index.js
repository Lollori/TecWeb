// DOVREBBE FUNZIONARE GODO COME UN RICCIO...

/*
File: index.js
Author: Fabio Vitali
Version: 1.0 
Last change on: 2 April 2024


Copyright (c) 2024 by Fabio Vitali

   Permission to use, copy, modify, and/or distribute this software for any
   purpose with or without fee is hereby granted, provided that the above
   copyright notice and this permission notice appear in all copies.

   THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
   WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
   MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
   SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
   WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
   OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
   CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

*/



/* ========================== */
/*                            */
/*           SETUP            */
/*                            */
/* ========================== */

global.rootDir = __dirname ;
global.startDate = null; 



const template = require(global.rootDir + '/scripts/tpl.js');
const mymongo = require(global.rootDir + '/scripts/mongo.js');
let musei;
try {
    musei = require(global.rootDir + '/scripts/musei.js');
    console.log('[index.js] scripts/musei.js caricato correttamente');
} catch(e) {
    console.error('[index.js] ERRORE nel caricare scripts/musei.js:', e.message);
}
const express = require('express');
const cors = require('cors')
const path = require('path');





/* ========================== */
/*                            */
/*  EXPRESS CONFIG & ROUTES   */
/*                            */
/* ========================== */

let app= express(); 
app.use('/js'  , express.static(global.rootDir +'/public/js'));
app.use('/css' , express.static(global.rootDir +'/public/css'));
app.use('/data', express.static(global.rootDir +'/public/data'));
app.use('/docs', express.static(global.rootDir +'/public/html'));
app.use('/img' , express.static(global.rootDir +'/public/media'));
app.use('/Editor-Marketplace', express.static(global.rootDir + '/Editor-Marketplace'));
// login prova
app.use('/login', express.static(global.rootDir + '/Login'));

app.use(express.urlencoded({ extended: true })) 
app.use(express.json())
app.use(cors())

// https://stackoverflow.com/questions/40459511/in-express-js-req-protocol-is-not-picking-up-https-for-my-secure-link-it-alwa
app.enable('trust proxy');


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


const info = async function(req, res) {
	let data = {
		startDate: global.startDate.toLocaleString(), 
		requestDate: (new Date()).toLocaleString(), 
		request: {
			host: req.hostname,
			method: req.method,
			path: req.path,
			protocol: req.protocol
		}, 
		query: req.query,
		body: req.body
	}
	res.send( await template.generate('info.html', data));
}

app.get('/info', info )
app.post('/info', info )





/* ========================== */
/*                            */
/*           MONGODB          */
/*       using mongoose       */
/* ========================== */

/* Replace these info with the ones you were given when activating mongoDB */ 
const mongoCredentials = {
	user: "site252630",
	pwd: "Tei2xiip",
	site: "mongo_site252630"
}  
/* end */

app.get('/db/create', async function (req, res) {
	res.send(await mymongo.create(mongoCredentials))
});
app.get('/db/search', async function (req, res) {
	res.send(await mymongo.search(req.query, mongoCredentials))
});

/* login errato */
/* sezione aggiunta per il login reale */
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    console.log(`[index.js] Tentativo di login per: ${email}`);

    try {
        // Usiamo la funzione search che è già definita nel tuo modulo mymongo
        // Cerchiamo un documento che abbia esattamente quella email e quella password
        const result = await mymongo.search({ email: email, password: password }, mongoCredentials);
        
        // result sarà un array. Se è vuoto, le credenziali sono sbagliate.
        if (!result || result.length === 0) {
            console.log(`[index.js] Login fallito per: ${email}`);
            return res.status(401).json({ 
                success: false, 
                message: "Email o password errati. Accesso negato." 
            });
        }

        // Se arriviamo qui, l'utente esiste
        console.log(`[index.js] Login successo per: ${email}`);
        res.json({ 
            success: true, 
            message: "Login effettuato",
            user: result[0] // Mandiamo i dati dell'utente al frontend
        });

    } catch (error) {
        console.error('[index.js] Errore durante il login:', error);
        res.status(500).json({ success: false, message: "Errore interno del server" });
    }
});




/* ========================== */
/*                            */
/*        API MUSEI           */
/*                            */
/* ========================== */

// Route di test: verifica che il server risponda alle route dinamiche
// senza toccare MongoDB. GET /api/test → {"ok":true}
app.get('/api/test', (_req, res) => {
    console.log('[index.js] /api/test chiamato');
    res.json({ ok: true, message: 'Il server risponde correttamente.' });
});

console.log('[index.js] route /api/test registrata');
console.log('[index.js] musei module disponibile:', !!musei);

// Seed: carica i musei da musei.json nel database.
// Da chiamare una volta sola per inizializzare i dati.
// GET /api/musei/seed
app.get('/api/musei/seed', async function (_req, res) {
	const result = await musei.seed(mongoCredentials);
	res.json(result);
});

// Legge tutti i musei. Supporta filtri opzionali via query string.
// GET /api/musei
// GET /api/musei?citta=Torino
// GET /api/musei?nome=egizio
app.get('/api/musei', async function (req, res) {
	const result = await musei.getAll(mongoCredentials, req.query);
	res.json(result);
});

// Legge un singolo museo tramite il suo codice ISIL.
// GET /api/musei/IT-TO0576
app.get('/api/musei/:codiceIsil', async function (req, res) {
	const result = await musei.getOne(mongoCredentials, req.params.codiceIsil);
	res.json(result);
});

// Crea un nuovo museo. I dati arrivano nel body JSON.
// POST /api/musei
app.post('/api/musei', async function (req, res) {
	const result = await musei.create(mongoCredentials, req.body);
	res.json(result);
});

// Aggiorna un museo esistente tramite codice ISIL.
// PUT /api/musei/IT-TO0576
app.put('/api/musei/:codiceIsil', async function (req, res) {
	const result = await musei.update(mongoCredentials, req.params.codiceIsil, req.body);
	res.json(result);
});

// Elimina un museo tramite codice ISIL.
// DELETE /api/musei/IT-TO0576
app.delete('/api/musei/:codiceIsil', async function (req, res) {
	const result = await musei.remove(mongoCredentials, req.params.codiceIsil);
	res.json(result);
});








/* ========================== */
/*                            */
/*    ACTIVATE NODE SERVER    */
/*                            */
/* ========================== */

app.listen(8000, function() { 
	global.startDate = new Date() ; 
	console.log(`App listening on port 8000 started ${global.startDate.toLocaleString()}` )
})


/*       END OF SCRIPT        */