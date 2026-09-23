const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());


// =====================================================
// DATABASE CONNECTION
// =====================================================

const pool = new Pool({
    host: process.env.DB_HOST || "postgres",
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "estee_euro",
    user: process.env.DB_USER || "estee_user",
    password: process.env.DB_PASSWORD || "estee_password"
});


// =====================================================
// TEST DATABASE CONNECTION
// =====================================================

pool.query("SELECT NOW()")
    .then(() => {
        console.log("PostgreSQL connected successfully.");
    })
    .catch((error) => {
        console.error(
            "PostgreSQL connection failed:",
            error.message
        );
    });


// =====================================================
// API HOME
// =====================================================

app.get("/api", (req, res) => {
    res.json({
        message: "ESTEE-EURO Hotel API is running"
    });
});


// =====================================================
// ROOM PRICES
// =====================================================

const roomPrices = {
    "Standard Room": 600,

    // These are temporary prices.
    // Change them when you give me the actual hotel prices.
    "Deluxe Room": 800,
    "Executive Room": 1000
};


// =====================================================
// CREATE BOOKING
// =====================================================

app.post("/api/bookings", async (req, res) => {

    try {

        const {
            name,
            phone,
            email,
            guests,
            checkin,
            checkout,
            room,
            message
        } = req.body;


        // =================================================
        // REQUIRED FIELD VALIDATION
        // =================================================

        if (
            !name ||
            !phone ||
            !email ||
            !guests ||
            !checkin ||
            !checkout ||
            !room
        ) {

            return res.status(400).json({
                message: "Please complete all required fields."
            });

        }


        // =================================================
        // GUEST VALIDATION
        // =================================================

        const numberOfGuests = Number(guests);

        if (
            !Number.isInteger(numberOfGuests) ||
            numberOfGuests < 1
        ) {

            return res.status(400).json({
                message: "Number of guests must be at least 1."
            });

        }


        // =================================================
        // DATE VALIDATION
        // =================================================

        const checkinDate = new Date(`${checkin}T00:00:00`);
        const checkoutDate = new Date(`${checkout}T00:00:00`);

        if (
            Number.isNaN(checkinDate.getTime()) ||
            Number.isNaN(checkoutDate.getTime())
        ) {

            return res.status(400).json({
                message: "Please provide valid check-in and check-out dates."
            });

        }


        if (checkoutDate <= checkinDate) {

            return res.status(400).json({
                message: "Check-out must be after check-in."
            });

        }


        // =================================================
        // CALCULATE NUMBER OF NIGHTS
        // =================================================

        const millisecondsPerDay = 1000 * 60 * 60 * 24;

        const nights = Math.round(
            (checkoutDate - checkinDate) / millisecondsPerDay
        );


        // =================================================
        // GET ROOM PRICE
        // =================================================

        const pricePerNight = roomPrices[room];

        if (!pricePerNight) {

            return res.status(400).json({
                message: "Invalid room selected."
            });

        }


        // =================================================
        // CALCULATE TOTAL PRICE
        // =================================================

        const totalPrice = nights * pricePerNight;


        // =================================================
        // SAVE BOOKING TO POSTGRESQL
        // =================================================

        const result = await pool.query(

            `INSERT INTO bookings
            (
                name,
                phone,
                email,
                guests,
                checkin,
                checkout,
                room,
                price_per_night,
                nights,
                total_price,
                message
            )

            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11
            )

            RETURNING *`,

            [
                name,
                phone,
                email,
                numberOfGuests,
                checkin,
                checkout,
                room,
                pricePerNight,
                nights,
                totalPrice,
                message || null
            ]

        );


        // =================================================
        // SEND SUCCESS RESPONSE
        // =================================================

        res.status(201).json({

            message: "Booking request received successfully.",

            booking: result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "Booking error:",
            error
        );

        res.status(500).json({

            message:
                "Server error while creating booking."

        });

    }

});


// =====================================================
// GET ALL BOOKINGS
// =====================================================
// This will later be protected with admin authentication.

app.get("/api/bookings", async (req, res) => {

    try {

        const result = await pool.query(

            `SELECT *
             FROM bookings
             ORDER BY created_at DESC`

        );

        res.json(result.rows);

    }

    catch (error) {

        console.error(
            "Error getting bookings:",
            error
        );

        res.status(500).json({

            message:
                "Unable to retrieve bookings."

        });

    }

});


// =====================================================
// SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `ESTEE-EURO API running on port ${PORT}`
    );

});