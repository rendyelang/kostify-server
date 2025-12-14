const jwt = require('jsonwebtoken');
const ownerModel = require('../models/owners');

const verifyAccessToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    try {
        const verified = jwt.verify(token, process.env.ACCESS_SECRET_KEY);
        req.user = verified;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Access token expired' })
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ message: 'Invalid access token' })
        }
    }
}

module.exports = verifyAccessToken;