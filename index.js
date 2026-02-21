const express = require('express');
const authRoutes = require('./routes/auth');
const { authenticate } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ღია მარშრუტები
app.get('/', (req, res) => {
  res.json({ message: 'Node Express API. გამოიყენეთ /auth/register ან /auth/login.' });
});

app.use('/auth', authRoutes);

// დაცული მარშრუტი – მხოლოდ ტოკენით
app.get('/api/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/protected', authenticate, (req, res) => {
  res.json({ message: 'ეს მარშრუტი მხოლოდ ავტორიზებულ მომხმარებლებს ხელმისაწვდომია.', user: req.user.username });
});

app.use((req, res) => {
  res.status(404).json({ error: 'მარშრუტი ვერ მოიძებნა.' });
});

app.listen(PORT, () => {
  console.log(`სერვერი მუშაობს http://localhost:${PORT}`);
});
