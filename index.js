const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require('jsonwebtoken');

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Password}@cluster0.fp4hyac.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const varifyJWT = (req, res, next) => {
  // console.log("varify");
  const authHeader = req.headers.authorization;
  if(!authHeader) {
    return res.status(401).send(({messgage: "UnAuthorize access"}));
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
    if(err) {
      return res.status(403).send({messgage: "Forbidden access"})
    }
    // console.log(decoded) 
    req.decoded = decoded
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const serviceCollection = client
      .db("doctors-portal")
      .collection("services");
    const bookingCollection = client
      .db("doctors-portal")
      .collection("bookings");
    const userCollection = client
      .db("doctors-portal")
      .collection("users");

    app.get("/user", varifyJWT, async(req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    })

    app.put("/user/:email", async(req, res) => {
    // app.put("/user", async(req, res) => {
      // const email = req.query.email;
      const email = req.params.email;
      const user = req.body;
      const filter = {email: email};
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options)
      const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "24h" });
      res.send({result, token: token});
    })

    app.put("/user/admin/:email", varifyJWT, async(req, res) => {
      const email = req.params.email;
        const filter = { email: email };
        const requester = req.decoder.email;
        const requesterAcconunt = await userCollection.findOne({email: requester})
        if (requesterAcconunt === "admin") {
          const updateDoc = {
            $set: { role: 'admin' },
          };
          const result = await userCollection.updateOne(filter, updateDoc);
          res.send(result);
        } else {
          res.status(403).send({ message: "forbidden"})
        }
      })

      app.get("admin/:email", async(req, res) => {
        const email = req.params.email;
        const user = await userCollection.findOne({ email: email });
        const isAdmin = user.role === "admin";
        res.send({admin: isAdmin});
      })

    app.get("/service", async (req, res) => {
      const query = {};
      // const cursor = serviceCollection.find(query);
      const cursor = serviceCollection.find(query).project({name: 1});
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

    app.get("/booking", varifyJWT, async(req, res) => {
      const patient = req.query.patient;
      // const authorization = req.headers.authorization;
      // console.log(authorization);
      const decoadedEmail = req.decoded.email;
      if(patient === decoadedEmail) {
        query = {patient: patient}
        const bookings = await bookingCollection.find(query).toArray();
        res.send(bookings);
      } else {
        return res.status(403).send({message: "forbidden access"})
      }
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

// on node write 
// require("crypto").randomBytes(64).toString("hex")
