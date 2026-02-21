const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware: ამოწმებს Authorization header-ში JWT ტოკენს და ამატებს req.user-ში.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'ავტორიზაცია საჭიროა. გამოიყენეთ Bearer ტოკენი.' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'არასწორი ან ვადაგასული ტოკენი.' });
  }
}

module.exports = { authenticate, JWT_SECRET };
