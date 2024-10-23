// Import required modules
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { check, validationResult } = require('express-validator');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/loginpagenewtype', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dob: { type: Date, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

// Create User Model
const User = mongoose.model('User', UserSchema);

// Define Pokémon Schema with user reference
const PokemonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  breed: { type: String, required: true },
  age: { type: Number, required: true },
  healthStatus: { type: Number, default: 100 },
  lastFed: { type: Date, default: Date.now },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Reference to User
});

// Create Pokémon Model
const Pokemon = mongoose.model('Pokemon', PokemonSchema);

// Middleware for verifying JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Improved token extraction
  if (!token) return res.status(403).send('Token is required');

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send('Invalid token');
    req.userId = decoded.userId; // Save user ID for later use
    next();
  });
};

// Registration endpoint with validation
app.post('/api/register', [
  check('name', 'Name is required').notEmpty(),
  check('email', 'Email is invalid').isEmail(),
  check('dob', 'Date of Birth is required').notEmpty(),
  check('password', 'Password must be at least 6 characters long').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, dob, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, dob, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { name, email, dob } });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint with validation
app.post('/api/login', [
  check('email', 'Email is invalid').isEmail(),
  check('password', 'Password is required').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { name: user.name, email: user.email, dob: user.dob } });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get all Pokémon for a user
app.get('/api/user/pokemon', verifyToken, async (req, res) => {
  try {
    const userId = req.userId; // Extracted from JWT token
    const pokemon = await Pokemon.find({ owner: userId });
    res.json(pokemon);
  } catch (error) {
    console.error('Error fetching user Pokémon:', error);
    res.status(500).json({ error: 'Failed to fetch Pokémon' });
  }
});

// Adopt Pokémon (update to associate with user)
app.post('/api/pokemon/adopt', verifyToken, async (req, res) => {
  try {
    const userId = req.userId; // Extracted from JWT token
    const { name, breed, age } = req.body;

    console.log("Adopting Pokémon:", { name, breed, age, owner: userId }); // Debug log

    const pokemon = new Pokemon({ name, breed, age, owner: userId });
    const savedPokemon = await pokemon.save();
    
    console.log("Pokémon adopted successfully:", savedPokemon); // Debug log
    res.json(savedPokemon);
  } catch (error) {
    console.error('Error adopting Pokémon:', error);
    res.status(500).json({ error: 'Failed to adopt Pokémon' });
  }
});

// Feed Pokémon
app.post('/api/pokemon/feed/:id', verifyToken, async (req, res) => {
  try {
    const pokemon = await Pokemon.findById(req.params.id);
    if (!pokemon) {
      return res.status(404).json({ error: 'Pokémon not found' });
    }

    console.log("Feeding Pokémon:", pokemon); // Debug log

    pokemon.healthStatus = Math.min(pokemon.healthStatus + 20, 100); // Health cannot exceed 100
    pokemon.lastFed = Date.now(); // Update the last fed timestamp
    const updatedPokemon = await pokemon.save();
    
    console.log("Pokémon fed successfully:", updatedPokemon); // Debug log
    res.json(updatedPokemon);
  } catch (error) {
    console.error('Error feeding Pokémon:', error);
    res.status(500).json({ error: 'Failed to feed Pokémon' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
