const serverless = require('serverless-http');
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

const app = express();
app.use(bodyParser.json());

const dbUrl = 'mongodb://localhost:27017'; // Update this URL for your MongoDB instance
const dbName = 'whatsapp_reviews'; // Database name
const collectionName = 'reviews'; // Collection name

let db;
MongoClient.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db(dbName);
    console.log('Connected to MongoDB');
  })
  .catch(err => console.error('Failed to connect to MongoDB:', err));

const VERIFY_TOKEN = 'your_verification_token';

// Verification endpoint for WhatsApp webhook
app.get('/.netlify/functions/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Webhook POST endpoint to handle incoming messages
app.post('/.netlify/functions/webhook', (req, res) => {
  const body = req.body;

  if (body.field !== 'messages') {
    return res.sendStatus(400);
  }

  const reviews = body.value.messages.map(message => {
    const reviewInfo = {
      phonenumber: message.from,
      review: message.text.body,
    };

    return db.collection(collectionName).insertOne(reviewInfo);
  });

  Promise.all(reviews)
    .then(() => res.sendStatus(200))
    .catch(err => {
      console.error('Error saving reviews to DB:', err);
      res.sendStatus(500);
    });
});

// Export for Netlify function
module.exports.handler = serverless(app);
