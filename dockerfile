# FROM node:13.11.0-slim 
# ENV NODE_ENV=production

# WORKDIR /app

# COPY . .

# RUN npm install

# EXPOSE 1000
# CMD node server.js --server:port=1000 --redis:url=redis://redis-dock:6379


FROM node:13.11.0-slim
ENV NODE_ENV=development

WORKDIR /app

COPY package*.json ./

RUN npm install -g nodemon
RUN npm install

COPY . .

EXPOSE 1000
# CMD ["nodemon", "server.js", "--server:port=1000", "--redis:url=redis://redis-dock:6379"]
