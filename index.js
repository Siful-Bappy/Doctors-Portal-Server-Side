const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Password}@cluster0.fp4hyac.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const serviceCollection = client
      .db("doctors-portal")
      .collection("services");
    const bookingCollection = client
      .db("doctors-portal")
      .collection("bookings");

    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // not proper way to query but better to use aggregate lookup, pipeline, match, group
    app.get("/available", async(req, res) => {
      const date = req.query.date || "Jan 14, 2023";
      // step 1: get all services
      const services = await serviceCollection.find().toArray();
      // step 2: get booking of that day
      const query = {date: date}
      const bookings = await bookingCollection.find(query).toArray();
      // step 3: for each services, find bookings for that service
      services.forEach(service => {
        const serviceBookings = bookings.filter(b => b.treatment === service.name);
        const booked = serviceBookings.map(s => s.slot)
        const available = service.slots.filter(s => !booked.includes(s))
        service.slots = available;
        // service.booked = booked;
        // console.log(service);
      })
      res.send(services);
    })

    app.get("/booking", async(req, res) => {
      const patient = req.query.patient;
      query = {patient: patient}
      const bookings = await bookingCollection.find(query).toArray();
      res.send(bookings);
    })

    app.post('/booking', async (req, res) => {
      const booking = req.body;
      const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists })
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    })
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Doctors listening on port ${port}`);
});

/*
 * Api naming convention
 * app.get("/booking") // get all booking collection. or get more than one or by filter
 * app.get("/booking:id") // get spcific id
 * app.post("/booking") // add a new booking
 * app.patch("/booking:id") // update a booking
 * app.delete("/booking:id") // delete a booking
 */
