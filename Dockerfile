FROM node:20.12.1-slim

WORKDIR /app
COPY . .

RUN npm install -g nodemon
RUN npm install


EXPOSE 1000
