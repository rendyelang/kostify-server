const ownerModel = require('../models/owners');
const bycrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { passwordPatternValidation } = require('../config/joiValidation');

// Owner Registration (Sign Up Owner)
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

// Sign in Owner
const signInOwner = async (req, res) => {
    const {email, password, confirmPassword} = req.body;

    try {
        if (!email || !password || !confirmPassword) {
            return res.status(400).json({
                message: "All fields are required"
            })
        }

        const existingOwner = await ownerModel.isOwnerExists(email);

        if (!existingOwner) {
            return res.status(404).json({
                message: "Username not found!"
            })
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match"
            });
        }

        const isPasswordValid = await bycrypt.compare(password, existingOwner.password)

        if (!isPasswordValid) {
            return res.status(400).json({
                message: "Invalid password!"
            })
        }

        const accessToken = jwt.sign({email: existingOwner.email, name: existingOwner.name}, process.env.ACCESS_SECRET_KEY, {expiresIn: '3d'})

        res.status(200).json({
            message: 'Login successful', 
            accessToken: accessToken,
            owner: {
                email: existingOwner.email,
                name: existingOwner.name,
            } 
        })
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error })
    }
}

module.exports = {
    addAdmin,
    signInOwner
}