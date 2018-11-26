FROM node:latest
EXPOSE 8080
COPY ./app .
RUN npm install
ENTRYPOINT [ "node", "server.js" ]