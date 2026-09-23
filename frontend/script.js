const API_URL = "/api";

// ===============================
// MOBILE MENU
// ===============================

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
        navMenu.classList.toggle("active");
    });
}

document.querySelectorAll("nav a").forEach((link) => {
    link.addEventListener("click", () => {
        navMenu.classList.remove("active");
    });
});


// ===============================
// ROOM BUTTONS
// ===============================

const roomButtons = document.querySelectorAll(".room-btn");
const roomSelect = document.getElementById("room");

roomButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const room = button.dataset.room;

        if (roomSelect) {
            roomSelect.value = room;
        }
    });
});


// ===============================
// DATE VALIDATION
// ===============================

const checkin = document.getElementById("checkin");
const checkout = document.getElementById("checkout");

const today = new Date().toISOString().split("T")[0];

if (checkin && checkout) {

    checkin.min = today;
    checkout.min = today;

    checkin.addEventListener("change", () => {

        checkout.min = checkin.value;

        if (
            checkout.value &&
            checkout.value <= checkin.value
        ) {
            checkout.value = "";
        }
    });
}


// ===============================
// BOOKING FORM
// ===============================

const bookingForm = document.getElementById("bookingForm");
const bookingMessage = document.getElementById("bookingMessage");

if (bookingForm) {

    bookingForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        bookingMessage.textContent =
            "Submitting your booking...";

        bookingMessage.className = "booking-loading";


        // GET FORM DATA
        const formData = {

            name: document
                .getElementById("name")
                .value
                .trim(),

            phone: document
                .getElementById("phone")
                .value
                .trim(),

            email: document
                .getElementById("email")
                .value
                .trim(),

            guests: Number(
                document
                    .getElementById("guests")
                    .value
            ),

            checkin: document
                .getElementById("checkin")
                .value,

            checkout: document
                .getElementById("checkout")
                .value,

            room: document
                .getElementById("room")
                .value,

            message: document
                .getElementById("message")
                .value
                .trim()
        };


        // ===============================
        // VALIDATE DATES
        // ===============================

        if (
            !formData.checkin ||
            !formData.checkout
        ) {

            bookingMessage.textContent =
                "Please select your check-in and check-out dates.";

            return;
        }


        if (
            formData.checkout <=
            formData.checkin
        ) {

            bookingMessage.textContent =
                "Check-out must be after check-in.";

            return;
        }


        // ===============================
        // SEND TO BACKEND
        // ===============================

        try {

            console.log(
                "Sending booking:",
                formData
            );

            const response = await fetch(
                `${API_URL}/bookings`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(formData)
                }
            );


            const result = await response.json();


            console.log(
                "Server response:",
                result
            );


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Booking failed."
                );
            }


            // ===============================
            // SUCCESS
            // ===============================

            bookingMessage.textContent =
                "✅ Booking request submitted successfully! ESTEE-EURO will contact you shortly.";

            bookingMessage.className =
                "booking-success";


            bookingForm.reset();


            checkin.min = today;
            checkout.min = today;


        } catch (error) {

            console.error(
                "Booking error:",
                error
            );


            bookingMessage.textContent =
                "❌ Booking could not be submitted. Please try again or contact us through WhatsApp or email.";

            bookingMessage.className =
                "booking-error";
        }

    });
}


// ===============================
// DARK / LIGHT MODE
// ===============================

const themeToggle =
    document.getElementById("themeToggle");

if (themeToggle) {

    const savedTheme =
        localStorage.getItem("estee-theme");


    if (savedTheme === "light") {

        document.body.classList.add(
            "light-mode"
        );

        themeToggle.textContent =
            "🌙 Dark";
    }


    themeToggle.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "light-mode"
            );


            if (
                document.body.classList.contains(
                    "light-mode"
                )
            ) {

                localStorage.setItem(
                    "estee-theme",
                    "light"
                );

                themeToggle.textContent =
                    "🌙 Dark";

            } else {

                localStorage.setItem(
                    "estee-theme",
                    "dark"
                );

                themeToggle.textContent =
                    "☀️ Light";
            }

        }
    );
}