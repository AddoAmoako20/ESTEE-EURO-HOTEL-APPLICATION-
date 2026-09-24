# ESTEE-EURO Hotel Website

ESTEE-EURO is a hotel website built as a beginner DevOps project.

The project combines a frontend, Node.js/Express backend, PostgreSQL database, Docker containers, and Nginx.

## Features

### Guest Website

* Hotel information and rooms
* Hotel images and video
* Booking form
* Automatic booking price calculation
* WhatsApp and email contact
* Hotel location and map
* Dark/light mode

### Administrator Dashboard

The administrator can:

* Log in
* View, search, and delete bookings
* View guest, room, date, and price details
* Mark bookings as Pending, Confirmed, or Cancelled
* View booking statistics

## Technology Stack

* **Frontend:** HTML, CSS, JavaScript, Nginx
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL
* **DevOps:** Docker, Docker Compose, Git/GitHub

## Project Architecture

```text
Guest / Admin Browser
          |
          v
        Nginx (frontend)
          |
          v
   Node.js / Express (backend)
          |
          v
      PostgreSQL
```

## Running the Project

Requirements: Docker and Docker Compose.

```bash
git clone https://github.com/AddoAmoako20/ESTEE-EURO-HOTEL-APPLICATION-.git
cd ESTEE-EURO-HOTEL-APPLICATION-
```

Create your local environment file from the example:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your own secrets before running in anything beyond local learning use.

Build and start the containers:

```bash
docker compose up --build
```

Then open:

| Page | URL |
|------|-----|
| Guest website | http://localhost:8080 |
| Admin dashboard | http://localhost:8080/admin.html |
| Backend API | http://localhost:5000/api |

## Useful Docker Commands

```bash
docker compose up -d          # start in background
docker compose up --build     # rebuild and start
docker compose down           # stop
docker ps                     # list running containers
docker compose logs           # all logs
docker compose logs backend   # backend logs only
```

## Database

PostgreSQL stores booking data including guest details, room type, dates, guests, price, and status:

```text
Pending | Confirmed | Cancelled
```

## Environment Variables

Sensitive values (database password, JWT secret, admin credentials) belong in `backend/.env`.

That file is gitignored. Use `backend/.env.example` as a template. Do not commit real secrets to GitHub.

## DevOps Concepts Practiced

* Git and GitHub
* Docker / Dockerfiles / Docker Compose
* Container networking
* PostgreSQL and environment variables
* Nginx reverse proxy
* Frontend/backend APIs

## Future Improvements

* Cloud deployment and HTTPS/SSL
* Cloudflare
* CI/CD with GitHub Actions
* Database backups, monitoring, and stronger admin auth

## Project Status

The core hotel website and local Docker setup are working. This repo is used as a practical DevOps learning project.
