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

/*
global.rootDir = __dirname ;
global.startDate = null; 



const template = require(global.rootDir + '/scripts/tpl.js');
const mymongo = require(global.rootDir + '/scripts/mongo.js');
const express = require('express');
const cors = require('cors')
const path = require('path');

const publicPath = path.resolve(__dirname, 'public'); 
*/
const express = require('express');
const cors = require('cors')
const path = require('path');
const globalRootDir = __dirname;

const template = require(path.join(globalRootDir, 'scripts', 'tpl.js'));
const mymongo = require(path.join(globalRootDir, 'scripts', 'mongo.js'));





// Se 'public' è nella stessa cartella di 'index.js':
const publicPath = path.join(__dirname, 'public');






/* ========================== */
/*                            */
/*  EXPRESS CONFIG & ROUTES   */
/*                            */
/* ========================== */

/* ========================== */
/* EXPRESS CONFIG & ROUTES   */
/* ========================== */

let app = express();

// 1. GESTIONE FILE STATICI (Tutto sotto /public)
// Questo risolve l'errore MIME perché mappa l'URL /public alla cartella fisica 'public'
app.use('/public', express.static(publicPath));

// Middleware per leggere i dati inviati dai form (POST) e abilitare CORS
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Configurazione per HTTPS dietro proxy (Server Unibo)
app.enable('trust proxy');

// 2. DEBUG PERCORSI (Vedi i log all'avvio)
const fs = require('fs');
console.log("--- ISPEZIONE CARTELLE ---");
try {
    const files = fs.readdirSync(__dirname);
    console.log("File presenti nella Root (__dirname):", files);
    if (fs.existsSync(publicPath)) {
        console.log("Contenuto cartella PUBLIC:", fs.readdirSync(publicPath));
    } else {
        console.warn("ATTENZIONE: La cartella 'public' non è stata trovata in:", publicPath);
    }
} catch(e) {
    console.log("Errore durante l'ispezione delle cartelle:", e.message);
}

// 3. ROTTA PRINCIPALE (Punta alla index.html nella root)
app.get('/', function (req, res) { 
    const indexPath = path.join(__dirname, 'index.html');
    
    res.sendFile(indexPath, function (err) {
        if (err) {
            console.error("Errore invio index.html:", err.message);
            res.status(404).send("Il server non ha trovato index.html nella root. Percorso provato: " + indexPath);
        }
    });
});

// 4. ROTTE DI TEST E INFO
app.get('/hw', async function(req, res) { 
    var text = "Hello world as a Node service";
    res.send(`
        <!doctype html>
        <html>
            <body>
                <h1>${text}</h1>
                <p><a href="javascript:history.back()">Go back</a></p>
            </body>
        </html>
    `);
});

app.get('/hwhb', async function(req, res) { 
    res.send(await template.generate('generic.html', {
        text: "Hello world as a Handlebar service",
    }));
});

const info = async function(req, res) {
    let data = {
        startDate: global.startDate ? global.startDate.toLocaleString() : "N/D", 
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
    res.send(await template.generate('info.html', data));
}

app.get('/info', info);
app.post('/info', info);







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
