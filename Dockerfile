FROM node:20.12.1-slim

ENV NODE_ENV=development

WORKDIR /app
COPY . .

RUN npm install -g nodemon
RUN npm install


EXPOSE 1000
