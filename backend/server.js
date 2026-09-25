const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || "estee-euro-dev-secret";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ALLOWED_STATUSES = ["pending", "confirmed", "cancelled"];


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
// ENSURE SCHEMA + DEFAULT ADMIN
// =====================================================

async function ensureSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            phone VARCHAR(50) NOT NULL,
            email VARCHAR(150) NOT NULL,
            guests INTEGER NOT NULL,
            checkin DATE NOT NULL,
            checkout DATE NOT NULL,
            room VARCHAR(100) NOT NULL,
            price_per_night NUMERIC(10,2) NOT NULL,
            nights INTEGER NOT NULL,
            total_price NUMERIC(10,2) NOT NULL,
            message TEXT,
            status VARCHAR(30) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS admins (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const existing = await pool.query(
        "SELECT id FROM admins WHERE username = $1",
        [ADMIN_USERNAME]
    );

    if (existing.rows.length === 0) {
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

        await pool.query(
            `INSERT INTO admins (username, password_hash)
             VALUES ($1, $2)`,
            [ADMIN_USERNAME, passwordHash]
        );

        console.log(`Default admin created: ${ADMIN_USERNAME}`);
    }
}


// =====================================================
// AUTH HELPERS
// =====================================================

function createToken(admin) {
    return jwt.sign(
        {
            id: admin.id,
            username: admin.username
        },
        JWT_SECRET,
        { expiresIn: "12h" }
    );
}

function requireAdmin(req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            message: "Authentication required."
        });
    }

    try {
        req.admin = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired session. Please log in again."
        });
    }
}


// =====================================================
// TEST DATABASE CONNECTION + BOOTSTRAP
// =====================================================

pool.query("SELECT NOW()")
    .then(async () => {
        console.log("PostgreSQL connected successfully.");
        await ensureSchema();
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
// ADMIN LOGIN
// =====================================================

app.post("/api/admin/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required."
            });
        }

        const result = await pool.query(
            "SELECT * FROM admins WHERE username = $1",
            [username]
        );

        const admin = result.rows[0];

        if (!admin) {
            return res.status(401).json({
                message: "Invalid username or password."
            });
        }

        const valid = await bcrypt.compare(password, admin.password_hash);

        if (!valid) {
            return res.status(401).json({
                message: "Invalid username or password."
            });
        }

        const token = createToken(admin);

        res.json({
            message: "Login successful.",
            token,
            admin: {
                id: admin.id,
                username: admin.username
            }
        });
    } catch (error) {
        console.error("Admin login error:", error);

        res.status(500).json({
            message: "Server error during login."
        });
    }
});


// =====================================================
// ADMIN SESSION CHECK
// =====================================================

app.get("/api/admin/me", requireAdmin, (req, res) => {
    res.json({
        admin: {
            id: req.admin.id,
            username: req.admin.username
        }
    });
});


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
// BOOKING STATISTICS (admin only)
// =====================================================

app.get("/api/bookings/stats", requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
                COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
                COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
                COALESCE(
                    SUM(total_price) FILTER (WHERE status = 'confirmed'),
                    0
                )::float AS confirmed_revenue,
                COALESCE(SUM(total_price), 0)::float AS total_revenue
            FROM bookings
        `);

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error getting booking stats:", error);

        res.status(500).json({
            message: "Unable to retrieve booking statistics."
        });
    }
});


// =====================================================
// GET ALL BOOKINGS (admin only, searchable)
// =====================================================

app.get("/api/bookings", requireAdmin, async (req, res) => {
    try {
        const { q, status } = req.query;
        const values = [];
        const conditions = [];

        if (status && ALLOWED_STATUSES.includes(String(status).toLowerCase())) {
            values.push(String(status).toLowerCase());
            conditions.push(`status = $${values.length}`);
        }

        if (q && String(q).trim()) {
            const term = `%${String(q).trim().toLowerCase()}%`;
            values.push(term);
            const i = values.length;
            conditions.push(`(
                LOWER(name) LIKE $${i}
                OR LOWER(email) LIKE $${i}
                OR LOWER(phone) LIKE $${i}
                OR LOWER(room) LIKE $${i}
                OR CAST(id AS TEXT) LIKE $${i}
            )`);
        }

        const where = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        const result = await pool.query(
            `SELECT *
             FROM bookings
             ${where}
             ORDER BY created_at DESC`,
            values
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error getting bookings:", error);

        res.status(500).json({
            message: "Unable to retrieve bookings."
        });
    }
});


// =====================================================
// UPDATE BOOKING STATUS (admin only)
// =====================================================

app.patch("/api/bookings/:id/status", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                message: "Invalid booking id."
            });
        }

        if (!status || !ALLOWED_STATUSES.includes(String(status).toLowerCase())) {
            return res.status(400).json({
                message: "Status must be pending, confirmed, or cancelled."
            });
        }

        const nextStatus = String(status).toLowerCase();

        const result = await pool.query(
            `UPDATE bookings
             SET status = $1
             WHERE id = $2
             RETURNING *`,
            [nextStatus, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Booking not found."
            });
        }

        res.json({
            message: `Booking marked as ${nextStatus}.`,
            booking: result.rows[0]
        });
    } catch (error) {
        console.error("Error updating booking status:", error);

        res.status(500).json({
            message: "Unable to update booking status."
        });
    }
});


// =====================================================
// DELETE BOOKING (admin only)
// =====================================================

app.delete("/api/bookings/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                message: "Invalid booking id."
            });
        }

        const result = await pool.query(
            `DELETE FROM bookings
             WHERE id = $1
             RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Booking not found."
            });
        }

        res.json({
            message: "Booking deleted successfully.",
            id: result.rows[0].id
        });
    } catch (error) {
        console.error("Error deleting booking:", error);

        res.status(500).json({
            message: "Unable to delete booking."
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
