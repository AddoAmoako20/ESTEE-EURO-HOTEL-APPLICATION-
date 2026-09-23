CREATE TABLE IF NOT EXISTS bookings (

    id SERIAL PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    phone VARCHAR(50) NOT NULL,

    email VARCHAR(150) NOT NULL,

    guests INTEGER NOT NULL,

    checkin DATE NOT NULL,

    checkout DATE NOT NULL,

    room VARCHAR(100) NOT NULL,

    message TEXT,

    status VARCHAR(30) DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);