const ownerModel = require('../models/owners');
const bycrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { passwordPatternValidation } = require('../config/joiValidation');

// Owner Registration
const addAdmin = async (req, res) => {
    const { name, email, password, phone } = req.body;

    // check for missing fields
    if (!name || !email || !password || !phone) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate strong password pattern using joi
    const { error } = passwordPatternValidation(password);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    // Check if owner already exists
    const existingOwner = await ownerModel.isOwnerExists(email);
    if (existingOwner) {
        return res.status(409).json({ message: 'Owner already exists' });
    }

    // Hash the password
    const hashedPassword = await bycrypt.hash(password, 10);

    try {
        const newOwner = await ownerModel.createOwner(name, email, hashedPassword, phone)
        const ownerPayload = {
            name: newOwner.name,
            email: newOwner.email,
            phone: newOwner.phone
        }
        res.status(201).json({ message: 'Owner registered successfully', owner: ownerPayload });
    } catch (error) {
        res.status(500).json({ message: 'Error registering owner', error: error.message });
    }
}

module.exports = {
    addAdmin
}