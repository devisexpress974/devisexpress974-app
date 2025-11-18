import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const db = new Database('./devis.db');

db.exec(`
CREATE TABLE IF NOT EXISTS sellers (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  categories TEXT,
  zones TEXT,
  plan TEXT DEFAULT 'BASIC',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  category TEXT,
  budget REAL,
  zone TEXT,
  deadline TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'NEW',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  request_id TEXT,
  seller_id TEXT,
  price REAL,
  delay TEXT,
  status TEXT DEFAULT 'SENT',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  request_id TEXT,
  offer_id TEXT,
  amount REAL,
  status TEXT DEFAULT 'PENDING',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

export function createSeller({ name, email, phone, categories, zones, plan = 'BASIC' }) {
  const id = randomUUID();
  const cats = categories.split(',').map(x => x.trim());
  const zs = zones.split(',').map(x => x.trim());
  db.prepare(
    'INSERT INTO sellers (id,name,email,phone,categories,zones,plan) VALUES (?,?,?,?,?,?,?)'
  ).run(id, name, email, phone, cats.join(','), zs.join(','), plan);
  return id;
}

export function listSellersBy(category, zone) {
  const rows = db.prepare('SELECT * FROM sellers WHERE active=1').all();
  return rows.filter(s =>
    s.categories.split(',').includes(category) &&
    s.zones.split(',').includes(zone)
  );
}

export function createRequest(data) {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO requests (id,category,budget,zone,deadline,name,email,phone)
    VALUES (@id,@category,@budget,@zone,@deadline,@name,@email,@phone)
  `).run({ id, ...data });
  return id;
}

export function getRequest(id) {
  return db.prepare('SELECT * FROM requests WHERE id=?').get(id);
}

export function setRequestStatus(id, status) {
  db.prepare('UPDATE requests SET status=? WHERE id=?').run(status, id);
}

export function createOffer({ request_id, seller_id, price, delay }) {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO offers (id,request_id,seller_id,price,delay) VALUES (?,?,?,?,?)'
  ).run(id, request_id, seller_id, price, delay);
  return id;
}

export function listOffersForRequest(request_id) {
  return db.prepare(`
    SELECT o.*, s.name AS seller_name
    FROM offers o
    JOIN sellers s ON s.id = o.seller_id
    WHERE request_id=?
  `).all(request_id);
}

export function getOffer(id) {
  return db.prepare('SELECT * FROM offers WHERE id=?').get(id);
}

export function createPayment({ request_id, offer_id, amount }) {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO payments (id,request_id,offer_id,amount) VALUES (?,?,?,?)'
  ).run(id, request_id, offer_id, amount);
  return id;
}

export function getSeller(id) {
  return db.prepare('SELECT * FROM sellers WHERE id=?').get(id);
}

export default db;
