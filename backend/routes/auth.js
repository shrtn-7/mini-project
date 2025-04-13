const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role)
        return res.status(400).json({ error: "All fields are required!" });

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length > 0) return res.status(400).json({ error: "Email already exists!" });

        const hashedPassword = await bcrypt.hash(password, 10);
        db.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            [name, email, hashedPassword, role],
            (err, result) => {
                if (err) return res.status(500).json({ error: err.message });

                const token = jwt.sign(
                    { id: result.insertId, email, role },
                    process.env.JWT_SECRET,
                    { expiresIn: "1h" }
                );

                res.status(201).json({
                    message: "User registered successfully!",
                    token,
                    user: { id: result.insertId, name, email, role }
                });
            }
        );
    });
});

// LOGIN
router.post("/login", (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required!" });
  
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
      if (err) return res.status(500).json({ error: "Database error!" });
      if (result.length === 0) return res.status(401).json({ error: "Invalid email or password!" });
  
      const user = result[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: "Invalid email or password!" });
  
      const token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
  
      res.json({
        message: "Login successful!",
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    });
  });
  module.exports = router;
