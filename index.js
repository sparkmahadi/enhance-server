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
    const reviewCollection = client.db("enhance").collection("reviews");

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

    app.get('/reviews/:id', async (req, res) => {
        const id = req.params.id;
        const query = { serviceId: id };
        const cursor = reviewCollection.find(query);
        const reviews = await cursor.toArray();
        res.send(reviews);
    })

    app.get('/MyReviews/:email', async(req, res)=>{
        const email = req.params.email;
        const query = { reviewerEmail: email};
        const cursor = reviewCollection.find(query);
        const reviews = await cursor.toArray();
        res.send(reviews);
    })

    // to load a specific review for updating
    app.get('/review/:id', async(req, res)=>{
        const id = req.params.id;
        console.log(id);
        const query = { _id: ObjectId(id)};
        const result = await reviewCollection.findOne(query);
        res.send(result);
    })

    // to update a review
    app.put('/review/:id', async(req, res)=>{
        const id = req.params.id;
        const query = { _id: ObjectId(id)};
        const review = req.body;
        const option = {upsert: true};
        const updatedReview = {
            $set: {
                reviewTitle: review.reviewTitle,
                description: review.description
            }
        }
        const result = await reviewCollection.updateOne(query, updatedReview, option);
        res.send(result);
    })


    app.post('/services', async (req, res) => {
        const service = req.body;
        const result = await serviceCollection.insertOne(service);
        res.send(result);
    })

    app.post('/services/:id', async (req, res) => {
        const review = req.body;
        console.log(review);
        const result = await reviewCollection.insertOne(review);
        res.send(result);
    })

    app.delete('/reviews/:id', async(req, res)=>{
        const id = req.params.id;
        const query = { _id: ObjectId(id)};
        const result = await reviewCollection.deleteOne(query);
        res.send(result);
    })


}

run().catch(err => console.log(err))


app.get('/', (req, res) => {
    res.send('enhance server is running')
})

app.listen(port, () => {
})