FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# On lance l'application en mode développement
CMD ["npm", "run", "dev"]