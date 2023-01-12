import express from 'express';
import cors from 'cors';
import {MongoClient} from "mongodb";
import dotenv from "dotenv";

const server = express();
dotenv.config();
server.use(cors());
server.use(express.json());
const mongoClient = new MongoClient(process.env.DATABASE_URL);
const PORT= process.env.PORT

try{
await mongoClient.connect()
console.log("banco conectado")

}catch (err) {
    console.log(err.message)
}
const db=mongoClient.db()





server.listen(PORT, () => {
    console.log(`Servidor rodando na porta: ${PORT}`)
})