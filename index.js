const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000
require("dotenv").config()

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Password}@cluster0.fp4hyac.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try{
        await client.connect();
        const serviceCollection = client.db("doctors-portal").collection("services");
        
        app.get("/service", async(req, res) => {
            const query = {}
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services)
        })
    } finally {

    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Doctors listening on port ${port}`)
})

/*
 * Api naming convention
* app.get("/booking") // get all booking collection. or get more than one or by filter
* app.get("/booking:id") // get spcific id
* app.post("/booking") // add a new booking
* app.patch("/booking:id") // update a booking
* app.delete("/booking:id") // delete a booking
 */