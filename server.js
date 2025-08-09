const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const serverless = require('serverless-http');
const app = express();

// Parse incoming JSON request bodies
app.use(bodyParser.json());

const port = process.env.PORT || 3000;
const dbUrl = 'mongodb://localhost:27017'; // Update this URL for your MongoDB instance
const dbName = 'whatsapp_reviews'; // Database name
const collectionName = 'reviews'; // Collection name

// Set up your verification token (use an environment variable for security)
const VERIFY_TOKEN = 'your_verification_token';

// MongoDB client setup
let db;
MongoClient.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db(dbName);
    console.log('Connected to database');
  })
  .catch(err => console.error('Failed to connect to MongoDB:', err));

// Verification endpoint for WhatsApp webhook
app.get('/webhooks', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Webhook POST endpoint to handle incoming messages
app.post('/webhooks', (req, res) => {
  const body = req.body;

  // Only process messages webhook
  if (body.field !== 'messages') {
    return res.sendStatus(400);
  }

  // Extract messages
  const reviews = body.value.messages.map(message => {
    const reviewInfo = {
      phonenumber: message.from,
      review: message.text.body,
    };

    // Save the review in MongoDB
    return db.collection(collectionName).insertOne(reviewInfo);
  });

  // Wait for all the insert operations to complete
  Promise.all(reviews)
    .then(() => {
      res.sendStatus(200);
    })
    .catch(err => {
      console.error('Error saving reviews to DB:', err);
      res.sendStatus(500);
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports.handler = serverless(app);