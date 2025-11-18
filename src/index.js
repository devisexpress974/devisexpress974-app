import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';

import {
  createSeller,
  listSellersBy,
  createRequest,
  getRequest,
  setRequestStatus,
  createOffer,
  listOffersForRequest,
  getOffer,
  createPayment,
  getSeller
} from './db.js';

import { sendMail } from './mailer.js';

dotenv.config();

// Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

// Path config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App
const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Rate-limit
const limiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
app.use(limiter);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/* HOME */
app.get('/', (req, res) => {
  res.render('home', { baseUrl: BASE_URL });
});

/* CREATE SELLER */
app.get('/seller', (req, res) => {
  res.render('seller');
});

app.post('/seller', (req, res) => {
  const { name, email, phone, categories, zones } = req.body;

  createSeller({
    name,
    email,
    phone,
    categories,
    zones
  });

  res.render('success', {
    message: 'Votre compte vendeur est créé. Vous recevrez les demandes clients par email.'
  });
});

/* CREATE BUYER REQUEST */
app.get('/buyer', (req, res) => {
  res.render('buyer');
});

app.post('/buyer', async (req, res) => {
  const { category, budget, zone, deadline, name, email, phone } = req.body;

  const requestId = createRequest({
    category,
    budget: Number(budget || 0),
    zone,
    deadline,
    name,
    email,
    phone
  });

  const sellers = listSellersBy(category, zone).slice(0, 20);

  for (const s of sellers) {
    const link = `${BASE_URL}/offer/${requestId}?seller=${s.id}`;

    try {
      await sendMail(
        s.email,
        `💼 Nouvelle demande client : ${category}`,
        `
        <p>Client : ${name}</p>
        <p>Budget : ${budget} €</p>
        <p>Zone : ${zone}</p>
        <p>Délai : ${deadline}</p>
        <p>Répondez en 30 secondes : <a href="${link}">${link}</a></p>
        `
      );
    } catch (e) {
      console.log('Erreur email vendeur : ', e);
    }
  }

  setRequestStatus(requestId, 'SENT');

  res.redirect(`/r/${requestId}`);
});

/* SELLER OFFER FORM */
app.get('/offer/:requestId', (req, res) => {
  const { requestId } = req.params;
  const { seller } = req.query;

  const request = getRequest(requestId);
  const sellerObj = getSeller(seller);

  if (!request || !sellerObj) {
    return res.status(404).send('Demande ou vendeur introuvable.');
  }

  res.render('offer_form', {
    request,
    seller: sellerObj
  });
});

app.post('/offer', (req, res) => {
  const { request_id, seller_id, price, delay } = req.body;

  createOffer({
    request_id,
    seller_id,
    price: Number(price),
    delay
  });

  res.render('success', {
    message: 'Votre offre a été envoyée au client.'
  });
});

/* OFFERS LIST FOR CLIENT */
app.get('/r/:requestId', (req, res) => {
  const { requestId } = req.params;
  const request = getRequest(requestId);

  if (!request) {
    return res.status(404).send('Demande introuvable.');
  }

  const offers = listOffersForRequest(requestId).slice(0, 3);

  res.render('request_offers', {
    request,
    offers,
    baseUrl: BASE_URL
  });
});

/* ACCEPT OFFER + STRIPE PAYMENT */
app.post('/accept/:offerId', async (req, res) => {
  if (!stripe) {
    return res.status(500).send('Stripe non configuré.');
  }

  const { offerId } = req.params;
  const offer = getOffer(offerId);

  if (!offer) {
    return res.status(404).send('Offre introuvable.');
  }

  const commission = Math.round(offer.price * 0.10 * 100);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${BASE_URL}/thankyou`,
    cancel_url: `${BASE_URL}/r/${offer.request_id}`,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Commission 10% — demande ${offer.request_id.slice(0, 8)}`
          },
          unit_amount: commission
        },
        quantity: 1
      }
    ]
  });

  createPayment({
    request_id: offer.request_id,
    offer_id: offer.id,
    amount: commission / 100
  });

  res.redirect(session.url);
});

/* SUCCESS PAGE */
app.get('/thankyou', (req, res) => {
  res.render('success', {
    message: 'Paiement effectué. Le vendeur vous contactera très vite.'
  });
});

// START SERVER
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`DevisExpress974 en ligne sur ${BASE_URL}`);
});
