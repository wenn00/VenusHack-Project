const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // Expectation for header: Authorization: Bearer <token>
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided.' });

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);  // Attach userId to request
        next();  // Continue to actual route
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
};
