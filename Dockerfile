FROM node:13.11.0-slim

ENV NODE_ENV=development

WORKDIR /app

COPY package*.json ./

RUN npm install -g nodemon
RUN npm install

COPY . .

EXPOSE 1000
