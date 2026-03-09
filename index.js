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
const express = require('express');
const cors = require('cors')
const path = require('path');





/* ========================== */
/*                            */
/*  EXPRESS CONFIG & ROUTES   */
/*                            */
/* ========================== */

let app= express(); 
app.use(express.static("public")); /* provamp */
app.use('/css' , express.static(global.rootDir +'/public/css'));
app.use('/data', express.static(global.rootDir +'/public/data'));
app.use('/docs', express.static(global.rootDir +'/public/html'));
app.use('/img' , express.static(global.rootDir +'/public/media'));
const scriptsPath = path.resolve(__dirname, 'Editor-Marketplace', 'Frontend', 'scripts');
app.use('/scripts', express.static(scriptsPath));
app.use(express.urlencoded({ extended: true })) 
app.use(cors())

// https://stackoverflow.com/questions/40459511/in-express-js-req-protocol-is-not-picking-up-https-for-my-secure-link-it-alwa
app.enable('trust proxy');

//Debug per vedere se viene trovata la cartella del frontend
const fs = require('fs');
console.log("--- ISPEZIONE CARTELLE ---");
console.log("Cosa c'è in /webapp?:", fs.readdirSync('/webapp'));
// Se vedi la cartella del marketplace, controlliamo cosa c'è dentro
try {
    // Prova a listare la cartella usando il nome che pensi sia giusto
    console.log("Contenuto Editor-Marketplace:", fs.readdirSync('/webapp/Editor-Marketplace'));
} catch(e) {
    console.log("Errore: Non riesco a leggere /webapp/Editor-Marketplace. Forse si chiama diversamente?");
}

app.get('/', function (req, res) { 
    // Risolviamo il percorso in modo assoluto
    const indexPath = path.resolve(__dirname, 'Editor-Marketplace', 'Frontend', 'index.html');
    
    res.sendFile(indexPath, function (err) {
        if (err) {
            console.error("Errore invio file:", err.message);
            // Se fallisce, stampiamo il percorso provato per capire l'errore
            res.status(404).send("Il server ha cercato il file qui: " + indexPath);
        }
    });
});

app.get('/hw', async function(req, res) { 
	var text = "Hello world as a Node service";
	res.send(
`<!doctype html>
<html>
	<body>
		<h1>${text}</h1>
		<p><a href="javascript:history.back()">Go back</a></p>
	</body>
</html>
			`)
});

app.get('/hwhb', async function(req, res) { 
	res.send(await template.generate('generic.html', {
		text: "Hello world as a Handlebar service",
	}));
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
