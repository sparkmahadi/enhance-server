const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gp7ekja.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    const serviceCollection = client.db("enhance").collection("services");

    app.get('/', async (req, res) => {
        const query = {};
        const cursor = serviceCollection.find(query);
        const result = await cursor.limit(3).toArray();
        res.send(result);
    })

    app.get('/services', async (req, res) => {
        const query = {};
        const cursor = serviceCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    })
    app.get('/services/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await serviceCollection.findOne(query);
        res.send(result);
    })
}

run().catch(err => console.log(err))


app.get('/', (req, res) => {
    res.send('enhance server is running')
})

app.listen(port, () => {
})