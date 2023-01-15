import express from 'express';
import cors from 'cors';
import {MongoClient} from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from "joi";

//ATIVAÇÃO DE TODAS AS BIBLIOTECAS----------------------------------------------------------------
const server = express();
dotenv.config();
server.use(cors());
server.use(express.json());

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let time= dayjs().format("HH:mm:ss");

try{
await mongoClient.connect()
console.log("banco conectado")

}catch (err) {
    console.log(err.message)
}
const db=mongoClient.db()


//ROTA POST PARTICIPANTES----------------------------------------------------------------
server.post("/participants", async (req, res) => {
    const {name} = req.body;
    const userSchema = joi.object({
        name: joi.string().required(),
      });
      const validation= userSchema.validate (req.body)
      if (validation.error) return res.sendStatus(422);


    try {
        const userUsado= await db.collection("participants").findOne({name})
        if (userUsado) return res.status(409).send("Esse usuário já existe!")
        await db.collection("participants").insertOne({name,lastStatus: Date.now() })

        await db.collection("messages").insertOne({
            to: "Todos", 
            text: "entra na sala...", 
            type: "status",
            from: name, 
            time: time})

        return res.sendStatus(201);

    } catch (err) {
        return res.status(422).send(err.message);
    }
});

//ROTA GET PARTICIPANTES----------------------------------------------------------------
server.get("/participants", async (req,res) => {
    try{
    const listaParticipantes= await db.collection("participants").find({}).toArray();
    res.send(listaParticipantes);
    } catch (err) {
        console.log(err);
       
    }
})

//ROTA POST MENSAGENS----------------------------------------------------------------
server.post("/messages", async (req, res) => { 
const {to, text, type} = req.body;
const {user} = req.headers;
const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required(),
  });
  const validation= messageSchema.validate (req.body)
  if (validation.error) return res.sendStatus(422);

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

//ROTA GET MENSAGENS----------------------------------------------------------------
server.get("/messages/", async (req,res) => { 
    const limit = parseInt(req.query.limit);
    const {user} = req.headers;
   

    try {
        const listaMensagens= await db.collection("messages").find({
            $or :[ 
             { type: "message" 
             },
             { type: "status"
             },
                
            {  
                type: "private_message",
                to: user
            },
            {
                type: "private_message",
                from: user
            }
            ]
        }).toArray();
        
        if  (!limit){
            return res.send(listaMensagens.reverse());
   
        }else if(isNaN(limit) || limit <1 ) {
            return res.sendStatus(422);

        }else { (limit >0 && limit <=listaMensagens.length)
            return res.send(listaMensagens.slice(-limit).reverse());
        }
    }catch (err) {
        console.log(err);
    }
    
})

//ROTA POST DE STATUS----------------------------------------------------------------
server.post("/status", async (req, res) => { 
    const {user} = req.headers;
    try{
    const userNaLista = await db.collection("participants").findOne({name:user})
    if (!userNaLista) return res.sendStatus(404)
    await db.collection("participants").updateOne({ name:user}, 
        {$set: {lastStatus: Date.now()}
        
    })

    return res.sendStatus(200)

    }catch (err) {
        console.log(err);
    }

})


setInterval (removerUser, 15000)

async function removerUser() {
   const hora= Date.now()-10000;
   try {
    const usersOffline= await db.collection('participants').find({lastStatus:{$lt:hora}}).toArray();

    usersOffline.map(async (item) => {
        const mensagemRemovido= {
            from: item.name, 
            to: 'Todos', 
            text: 'sai da sala...', 
            type: 'status', 
            time: time
        };
        await db.collection('messages').insertOne(mensagemRemovido);
    })

    await db.collection('participants').deleteMany({lastStatus:{$lt:hora}})

   }catch (err) {
    console.log(err);
       }
   }


   //SERVIDOR--------------------------------------------------------------------------------
server.listen(5000, () => {
    console.log(`Servidor rodando na porta: ${5000}`)
})