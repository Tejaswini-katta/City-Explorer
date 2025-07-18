const express = require('express');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcrypt'); // 🔐 Added for password hashing
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// 🔐 Load service account key
const serviceAccount = require('./key.json');

// Init Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ✅ Secure your API key using variable
const API_KEY = 'mOEvrJdWe1C5Y7rpFzJ3jw==A4pKN1O2ed2O0u27';

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home1.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));
app.get('/explorer.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'explorer.html')));

// ✅ Signup POST handler (with bcrypt hashing)
app.post('/signupsubmit', async (req, res) => {
  const { fullName, email, phone, gender, password } = req.body;

  try {
    const userExists = await db.collection('users').where('email', '==', email).get();

    if (!userExists.empty) {
      return res.send(`<script>alert("Email already registered."); window.location.href='/signup';</script>`);
    }

    const hashedPassword = await bcrypt.hash(password, 10); // 🔐 Hash the password

    await db.collection('users').add({
      name: fullName,
      email,
      phone,
      gender,
      password: hashedPassword // 🔐 Store hashed password
    });

    return res.send(`<script>alert("Registered Successfully!"); window.location.href='/login';</script>`);
  } catch (err) {
    console.error('Signup error:', err);
    return res.send('Error during signup.');
  }
});

// ✅ Login POST handler (with bcrypt comparison)
app.post('/loginsubmit', async (req, res) => {
  const { email, password } = req.body;

  try {
    const snapshot = await db.collection('users').where('email', '==', email).get();

    if (snapshot.empty) {
      return res.send(`<script>alert("Email not found"); window.location.href='/login';</script>`);
    }

    const user = snapshot.docs[0].data();

    const isPasswordValid = await bcrypt.compare(password, user.password); // 🔐 Compare hashed password

    if (!isPasswordValid) {
      return res.send(`<script>alert("Incorrect password"); window.location.href='/login';</script>`);
    }

    res.redirect('/explorer.html');
  } catch (err) {
    console.error('Login error:', err);
    res.send('Error during login.');
  }
});

// ✅ API Proxy for city info (API Ninjas)
app.get('/api/city', async (req, res) => {
  const cityName = req.query.name;
  if (!cityName) return res.status(400).json({ error: 'City name is required' });

  try {
    const response = await axios.get(`https://api.api-ninjas.com/v1/city?name=${encodeURIComponent(cityName)}`, {
      headers: { 'X-Api-Key': API_KEY }
    });

    if (!response.data.length) {
      return res.status(404).json({ error: 'City not found' });
    }

    const data = response.data[0];
    res.json({
      name: data.name,
      country: data.country,
      region: data.region,
      population: data.population,
      timezone: data.timezone
    });
  } catch (err) {
    console.error('API error:', err.message);
    res.status(500).json({ error: 'Failed to fetch city data' });
  }
});

// Start server
app.listen(3000, () => {
  console.log('✅ Server running at http://localhost:3000');
});
