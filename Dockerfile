FROM node:18

WORKDIR /src

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4100

CMD ["npm", "run", "dev"]
