# Insegnamento di Tecnologie Web
# CdS In Informatica   
# (A.A. 2025-26)

# Progetto ArtAround 18-27   
_cancellare le dizioni non rilevanti_ 
 
# READ ME DEL PROGETTO ARTAROUND
_una copia IDENTICA di questo file deve trovarsi nella directory del progetto_

## Nome del gruppo: 
Pizza Capricciosa


## Membri del gruppo 
_(ripetere le righe seguenti secondo necessità)_  

* Nome e cognome: Lorenzo Ricci, matricola: 0001044327, mail: lorenzo.ricci27@studio.unibo.it
* Nome e cognome: Maria Paola Klein Serini, matricola:  0001069177, mail: maria.kleinserini@studio.unibo.it
* Nome e cognome: Leonardo Monaco, matricola: 0001161289, mail: leonardorocco.monaco@studio.unibo.it
* LLM (nome e versione e licenza): 

_Il primo membro della lista verrà considerato come punto di contatto primario. Sarà la persona 
incaricata di spedire mail (sempre e solo dall'indirizzo studio.unibo.it) e tenere contatti con i docenti. Ogni mail deve sempre includere tutti i componenti del gruppo in cc, e deve essere indirizzata a tutti i docenti del corso:_ 

* fabio.vitali@unibo.it
* andrea.schimmenti2@unibo.it
* gianmarco.spinaci2@unibo.it
* remo.grillo@unibo.it

## Tipo progetto
18-27 
_Cancellare le dizioni non rilevanti_

## Data di disponibilità delle applicazioni
_ Al massimo 15 giorni dopo la data di sottomissione del file README_

## Locazione del progetto:

* URI del marketplace: https://www.site252630.tw.cs.unibo.it/Editor-Marketplace
* URI del navigator: https://www.site252630.tw.cs.unibo.it/Navigator
* Altri URI rilevanti: https://www.site252630.tw.cs.unibo.it (URI del menu' principale)

## Organizzazione dei sorgenti
* _creare una directory source all'interno della directory html_
* _Cambiare i permessi di accesso a questi file a 755 e 644_
* _Creare una directory per applicazione più una directory per la applicazione server-side_
* _Descrivere qui l'organizzazione interna di queste directory_

  
## Tecnologie utilizzate
_Inserire qui il linguaggio utilizzato, il o i framework utilizzati e ogni pacchetto NPM installato a parte quelli preinstallati_

#### Server-side: Node.js, Express

#### Applicazione marketplace: HTML, CSS, JavaScript (vanilla)

#### Applicazione navigator: CSS, JavaScript (React JSX per la precisione)


## Contributo individuale
#### Lorenzo Ricci: -Implementazione della pagina principale dell'editor-marketplace, creazione di cards per la gestione di musei, opere e items + grafica coerente col menu' principale dell'applicazione
-Implementazione della pagina principale del navigator e implementazione delle sessioni per gestire le visite coordinate tra insegnanti e studenti + grafica coerente col menu' principale dell'applicazione 
-Implementazione nell'editor-marketplace del form di creazione delle visite, creato per aggiungere item, assegnare nomi mnemonici e nomi univoci, possibilita' di pubblicarle sul marketplace (a una determinata cifra) o tenerle private 
-Implementazione di sezione per aggiungere items alle varie opere
-Creazione degli schemi mongoose di musei, items, visite. Gestione di API lato backend per comunicare col database MongoDB
-Creazione delle dashboard personalizzate per ogni ruolo dei vari utenti (ciascun utente vede una determinata dashboard in base al suo ruolo all'interno dell'editor-marketplace) e della dashboard unica del navigator
-Implementazione della chat e renderizzazione di immagini, items e mappe all'interno delle visite (con appositi bottoni)
-Implementazione della schermata di riordinamento degli items di una visita prima di farla partire all'interno del navigator

#### Maria Paola Klein Serini: 1. Login & Registrazione
    * Sviluppo completo del sistema di login e registrazione (sia lato backend che frontend).

2. Marketplace (Editor) & sezione dedicata all’utente admin
    * Gestione delle opere: modelli Mongoose, API di gestione dati e integrazione col profilo utente lato backend; realizzazione delle relative interfacce lato frontend. 
    * Creazione di meccanismi di filtraggio e dei menu a tendina per la gestione delle opere, degli items, dei musei e delle visite.
    * Focus sul profilo admin: aggiunta di filtri per una migliore visualizzazione dati (quali musei, items, opere) e sviluppo della sezione di analytics.
    * Sviluppo e implementazione della selezione dei toni degli items.
    * Caratterizzazione degli items: o associati alle singole opere, oppure indipendenti (attraverso sistema di etichette).

3. Marketplace (compra-vendita)
    * Sviluppo della sezione carrello (con gestione e persistenza sia per visite che per items. Items e visite risultano associati al singolo utente, no local storage)
    * Sviluppo del sistema di filtraggio all’interno del marketplace (sistema basato sui tag incluso), classifica delle visite e degli items più popolari.

4. Navigator 
    * Creazione, gestione e visualizzazione dei quiz per i curatori sia nell’applicazione Marketplace che nell’applicazione Navigator .
    * Meccanismo di sincronizzazione per impedire che l'insegnante mandi avanti o indietro la visita prima che gli studenti abbiano completato le rispettive attività.

5. Grafica & altri elementi
    * Definizione della grafica generale (navbar, stili, menu a tendina per l'aggiunta di contenuti) e inserimento di pop-up coerenti con il design del sito.
    * Creazione della schermata home
    * Scrittura del file CSS iniziale per lo stile della schermata home

#### Leonardo Rocco Monaco: xxxxxx

#### LLM: usato principalmente per refactoring (ci siamo ritrovati a lavorare con file incredibilmente lunghi, che gli abbiamo chiesto di dividere in moduli o componenti diversi), correzione di bug/errori, debugging, implementazione di comandi vocali tramite pacchetto TT(inserire nome, non ricordo come si chiama)(disponibile su npm), creazione immagini profilo, immagini della home page (anche per versione mobile e modalita' chiara)
