require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '1.1.1.1']);
const Event = require('./models/Event');
const Seat = require('./models/Seat');

const ROWS = 'ABCDEFGHIJ'.split('');
const COLS = Array.from({ length: 10 }, (_, i) => i + 1);

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(19, 30, 0, 0);
  return date;
}

const EVENTS = [
  {
    name: 'The Grand Premiere',
    category: 'Movie',
    venue: 'PVR IMAX, Downtown',
    description: 'The most anticipated film of the year, on the big screen first.',
    dateTime: daysFromNow(7),
    theme: 'violet',
    tiers: [
      { name: 'VIP', rows: ['A', 'B', 'C'], price: 999 },
      { name: 'Premium', rows: ['D', 'E', 'F', 'G'], price: 599 },
      { name: 'Standard', rows: ['H', 'I', 'J'], price: 349 },
    ],
  },
  {
    name: 'Edge of Tomorrow: Reloaded',
    category: 'Movie',
    venue: 'Cineplex Grand',
    description: 'A time-bending sci-fi action sequel, first-week exclusive.',
    dateTime: daysFromNow(5),
    theme: 'cyan',
    tiers: [
      { name: 'VIP', rows: ['A', 'B', 'C'], price: 899 },
      { name: 'Premium', rows: ['D', 'E', 'F', 'G'], price: 549 },
      { name: 'Standard', rows: ['H', 'I', 'J'], price: 299 },
    ],
  },
  {
    name: 'Midnight in Neo Tokyo',
    category: 'Movie',
    venue: 'The Art House Cinema',
    description: 'A neon-drenched animated thriller, midnight screening only.',
    dateTime: daysFromNow(12),
    theme: 'rose',
    tiers: [
      { name: 'VIP', rows: ['A', 'B', 'C'], price: 799 },
      { name: 'Premium', rows: ['D', 'E', 'F', 'G'], price: 499 },
      { name: 'Standard', rows: ['H', 'I', 'J'], price: 249 },
    ],
  },
  {
    name: 'Neon Nights Live',
    category: 'Concert',
    venue: 'Arena 21',
    description: 'An electrifying night of music under the neon lights.',
    dateTime: daysFromNow(14),
    theme: 'amber',
    tiers: [
      { name: 'VIP', rows: ['A', 'B', 'C'], price: 1499 },
      { name: 'Premium', rows: ['D', 'E', 'F', 'G'], price: 899 },
      { name: 'Standard', rows: ['H', 'I', 'J'], price: 499 },
    ],
  },
  {
    name: 'Stand-Up Special: Live & Unfiltered',
    category: 'Comedy',
    venue: 'The Laugh Factory',
    description: 'An hour of unfiltered comedy from the circuit’s sharpest voice.',
    dateTime: daysFromNow(3),
    theme: 'emerald',
    tiers: [
      { name: 'VIP', rows: ['A', 'B', 'C'], price: 799 },
      { name: 'Premium', rows: ['D', 'E', 'F', 'G'], price: 499 },
      { name: 'Standard', rows: ['H', 'I', 'J'], price: 299 },
    ],
  },
  {
    name: 'Championship Finals',
    category: 'Sports',
    venue: 'City Sports Complex',
    description: 'The season comes down to this: winner takes the trophy.',
    dateTime: daysFromNow(10),
    theme: 'violet',
    tiers: [
      { name: 'VIP', rows: ['A', 'B', 'C'], price: 1999 },
      { name: 'Premium', rows: ['D', 'E', 'F', 'G'], price: 1199 },
      { name: 'Standard', rows: ['H', 'I', 'J'], price: 699 },
    ],
  },
];

function tierForRow(tiers, row) {
  return tiers.find((tier) => tier.rows.includes(row));
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB connected');

    await Seat.deleteMany({});
    await Event.deleteMany({});

    for (const eventData of EVENTS) {
      const event = await Event.create({
        ...eventData,
        rows: ROWS,
        cols: COLS.length,
      });

      const seats = [];
      for (const row of ROWS) {
        const tier = tierForRow(event.tiers, row);
        for (const col of COLS) {
          seats.push({
            eventId: event._id,
            seatNumber: `${row}${col}`,
            tier: tier.name,
            price: tier.price,
            status: 'available',
            lockedBy: null,
            bookedBy: null,
          });
        }
      }

      await Seat.insertMany(seats);
      console.log(`Seeded "${event.name}" with ${seats.length} seats`);
    }

    console.log(`Done — ${EVENTS.length} events seeded (A1 - J10 each)`);
    await mongoose.disconnect();
    console.log('Done');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
