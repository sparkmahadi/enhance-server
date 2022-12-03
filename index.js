const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gp7ekja.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

app.post('/jwt', (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' })
    res.send({ token });
})

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    const serviceCollection = client.db("enhance").collection("services");
    const reviewCollection = client.db("enhance").collection("reviews");
    const usersCollection = client.db("enhance").collection("users");
    const serviceBookingsCollection = client.db("enhance").collection("serviceBookings");

    // to load three services at landing page
    app.get('/', async (req, res) => {
        const query = {};
        const cursor = serviceCollection.find(query);
        const result = await cursor.limit(3).toArray();
        res.send(result);
    })

    app.post('/create-payment-intent', async (req, res) => {
        const booked = req.body;
        const price = booked.price;
        const amount = price * 100;

        const paymentIntent = await stripe.paymentIntents.create({
            currency: 'usd',
            amount: amount,
            'payment_method_types': [
                'card'
            ],
        });

        res.send({ clientSecret: paymentIntent.client_secret })
    })

    // to get all the services
    app.get('/services', async (req, res) => {
        const query = {};
        const cursor = serviceCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    })

    // to load a specific service
    app.get('/services/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await serviceCollection.findOne(query);
        res.send(result);
    })

    // to update a specific service
    app.put('/service/update/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const newService = req.body;
        const option = { upsert : true};
        const updatedService = {
            $set:{
                name: newService.name,
                img: newService.img,
                description: newService.description,
                price: newService.price
            }
        }
        const result = await serviceCollection.updateOne(query, updatedService, option);
        res.send(result);
    })

    // to post new services
    app.post('/services', async (req, res) => {
        const service = req.body;
        const result = await serviceCollection.insertOne(service);
        res.send(result);
    })

    // to delete a service
    app.delete('/services/:id', async(req, res)=>{
        const id = req.params.id;
        const query = { _id: ObjectId(id)};
        const result = serviceCollection.deleteOne(query);
        res.send(result);
    })

    // to insert reviews with time
    app.post('/services/:id', async (req, res) => {
        const review = req.body;
        const data = { ...review, createdAt: new Date() };
        const result = await reviewCollection.insertOne(data);
        res.send(result);
    })

    // to find service bookings by user
    app.get('/serviceBookings', async (req, res) => {
        const email = req.query.email;
        const query = { buyerEmail: email }
        const result = await serviceBookingsCollection.find(query).toArray();
        res.send(result);
    })

    // to find a service booking for payment
    app.get('/serviceBookings/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) }
        const result = await serviceBookingsCollection.findOne(query);
        res.send(result);
    })

    // to book a service
    app.post('/serviceBookings', async (req, res) => {
        const email = req.query.email;
        const serviceId = req.query.serviceId;
        const booking = req.body;
        const result = await serviceBookingsCollection.insertOne(booking);
        res.send(result);
    })

    // to update a service booking after payment
    app.put('/serviceBookings/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const paymentInfo = req.body;
        const option = { upsert: true };
        const updatedBooking = {
            $set: {
                payment: paymentInfo.payment,
                paymentTime: paymentInfo.paymentTime
            }
        }
        const result = await serviceBookingsCollection.updateOne(query, updatedBooking, option);
        res.send(result);
    })

    // load my reviews
    app.get('/myreviews', verifyJWT, async (req, res) => {
        const decoded = req.decoded;
        if (decoded.email !== req.query.email) {
            res.status(403).send({ message: 'unauthorized access' })
        }

        let query = {};
        if (req.query.email) {
            query = {
                reviewerEmail: req.query.email
            }
        }
        const cursor = reviewCollection.find(query);
        const reviews = await cursor.toArray();
        res.send(reviews);
    })

    // load all reviews by users
    app.get('/reviews', async (req, res) => {
        const query = {};
        const cursor = reviewCollection.find(query);
        const reviews = await cursor.toArray();
        res.send(reviews);
    })

    // load and sort reviews on service details page
    app.get('/reviews/:id', async (req, res) => {
        const id = req.params.id;
        const query = { serviceId: id };
        const cursor = reviewCollection.find(query).sort({ createdAt: -1 });
        const reviews = await cursor.toArray();
        res.send(reviews);
    })

    // to load a specific review for updating
    app.get('/review/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await reviewCollection.findOne(query);
        res.send(result);
    })

    // to update a review
    app.put('/review/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const review = req.body;
        const option = { upsert: true };
        const updatedReview = {
            $set: {
                reviewTitle: review.reviewTitle,
                description: review.description
            }
        }
        const result = await reviewCollection.updateOne(query, updatedReview, option);
        res.send(result);
    })

    // temp api to insert extra data
    app.put('/services/update', async(req, res)=>{
        const query = {};
        const slot = ["09:00 AM - 11:00 AM", "11:00 AM - 1:00 PM", "02:00 PM - 04:00 PM", "04:00 PM - 06:00 PM"];
        const option = {upsert : true};
        const updatedService = {
            $set:{
                slots: slot
            }
        }
        const result = await serviceCollection.updateMany(query, updatedService, option);
        res.send(result);
    })

    // to delete a review
    app.delete('/reviews/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await reviewCollection.deleteOne(query);
        res.send(result);
    })

    // to get a single user to verify admin
    app.get('/users/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        res.send(user);
    })
    // to get all user
    app.get('/users', async (req, res) => {
        const query = {};
        const users = await usersCollection.find(query).toArray();
        res.send(users);
    })

    // to post a user
    app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        res.send(result);
    })
}

run().catch(err => console.log(err))


app.get('/', (req, res) => {
    res.send('enhance server is running')
})

app.listen(port, () => {
})