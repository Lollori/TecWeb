# Usa una versione stabile di Node
FROM node:20

# Crea la cartella dell'app nel container
WORKDIR /usr/src/app

# Copia i file delle dipendenze
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia tutto il resto del codice (inclusi .env e le cartelle scripts/public)
COPY . .

# La tua app gira sulla porta 8000 (modificata per index.js)
EXPOSE 8000

# Comando per avviare l'app
CMD ["node", "index.js"]