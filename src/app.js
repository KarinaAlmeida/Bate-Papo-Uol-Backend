import express from 'express';
import cors from 'cors';
import {MongoClient} from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";

const server = express();
dotenv.config();
server.use(cors());
server.use(express.json());

const mongoClient = new MongoClient(process.env.DATABASE_URL);
const PORT= process.env.PORT
let time= dayjs().format("HH:mm:ss");

try{
await mongoClient.connect()
console.log("banco conectado")

}catch (err) {
    console.log(err.message)
}
const db=mongoClient.db()

server.post("/participants", async (req, res) => {
    const {name} = req.body;

    try {
        const userUsado= await db.collection("participants").findOne({name})
        if (userUsado) return res.status(409).send("Esse usuário já existe!")
        await db.collection("participants").insertOne({name,lastStatus: Date.now() })

        await db.collection("messages").insertOne({
            from: name, 
            to: "Todos", 
            text: "entra na sala...", 
            type: "status",
            time: time})

        return res.sendStatus(201);

    } catch (err) {
        return res.status(422).send(err.message);
    }
});

server.get("/participants", async (req,res) => {
    try{
    const listaParticipantes= await db.collection("participants").find({}).toArray();
    res.send(listaParticipantes);
    } catch (err) {
        console.log(err);
       
    }
})

server.post("/messages", async (req, res) => { 
const {to, text, type} = req.body;
const {user} = req.headers;

try {
    const userAtivo = await db.collection("participants").findOne({name:user})
    if (!userAtivo) return res.status(422).send("Usuário desconectado")

    const message= db.collection("messages").insertOne({
        from: user, 
        to,
        text,
        type,
        time: time})

res.status(201).send(message);

}catch {
    return res.status(422).send(err.message);

}

})



server.listen(PORT, () => {
    console.log(`Servidor rodando na porta: ${PORT}`)
})