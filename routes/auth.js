const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// მარტივი in-memory მომხმარებლების სტორი (პროდაქშენში გამოიყენეთ DB)
const users = new Map();

/**
 * POST /auth/register
 * Body: { username, password }
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'სახელი და პაროლი საჭიროა.' });
    }
    if (users.has(username)) {
      return res.status(409).json({ error: 'ასეთი მომხმარებელი უკვე არსებობს.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    users.set(username, { username, password: hashedPassword });
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'რეგისტრაცია წარმატებულია.', token, username });
  } catch (err) {
    res.status(500).json({ error: 'შეცდომა რეგისტრაციისას.' });
  }
});

/**
 * POST /auth/login
 * Body: { username, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'სახელი და პაროლი საჭიროა.' });
    }
    const user = users.get(username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'არასწორი სახელი ან პაროლი.' });
    }
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'შესვლა წარმატებულია.', token, username });
  } catch (err) {
    res.status(500).json({ error: 'შეცდომა შესვლისას.' });
  }
});

module.exports = router;
