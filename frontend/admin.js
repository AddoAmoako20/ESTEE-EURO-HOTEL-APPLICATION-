const TOKEN_KEY = "estee-admin-token";
const API_URL = "/api";

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const adminName = document.getElementById("adminName");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const refreshBtn = document.getElementById("refreshBtn");
const bookingsList = document.getElementById("bookingsList");
const bookingsEmpty = document.getElementById("bookingsEmpty");
const dashboardMessage = document.getElementById("dashboardMessage");

let searchTimer = null;


// =====================================================
// AUTH HELPERS
// =====================================================

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response;

    try {
        response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers,
            cache: "no-store"
        });
    } catch (error) {
        throw new Error(
            "Cannot reach the API. Keep Docker running and open http://localhost:8080/admin"
        );
    }

    let data = null;

    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }

    if (response.status === 401 && !path.startsWith("/admin/login")) {
        clearToken();
        showLogin();
        throw new Error(data?.message || "Session expired. Please log in again.");
    }

    if (!response.ok) {
        throw new Error(
            data?.message ||
            `Request failed (${response.status}). Use http://localhost:8080/admin`
        );
    }

    return data;
}


// =====================================================
// VIEW SWITCHING
// =====================================================

function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
}

function showDashboard(username) {
    loginView.hidden = true;
    dashboardView.hidden = false;
    adminName.textContent = username ? `Signed in as ${username}` : "";
}


// =====================================================
// FORMATTING
// =====================================================

function formatMoney(value) {
    const amount = Number(value) || 0;
    return `GH₵${amount.toLocaleString("en-GH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}`;
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return String(value).slice(0, 10);
    }

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


// =====================================================
// MESSAGES
// =====================================================

function showLoginError(message) {
    loginError.hidden = false;
    loginError.textContent = message;
}

function clearLoginError() {
    loginError.hidden = true;
    loginError.textContent = "";
}

function showDashboardMsg(message, type = "success") {
    dashboardMessage.hidden = false;
    dashboardMessage.className = `form-message ${type}`;
    dashboardMessage.textContent = message;

    window.clearTimeout(showDashboardMsg._timer);
    showDashboardMsg._timer = window.setTimeout(() => {
        dashboardMessage.hidden = true;
    }, 3500);
}


// =====================================================
// STATS
// =====================================================

async function loadStats() {
    const stats = await apiFetch("/bookings/stats");

    document.getElementById("statTotal").textContent = stats.total ?? 0;
    document.getElementById("statPending").textContent = stats.pending ?? 0;
    document.getElementById("statConfirmed").textContent = stats.confirmed ?? 0;
    document.getElementById("statCancelled").textContent = stats.cancelled ?? 0;
    document.getElementById("statRevenue").textContent = formatMoney(
        stats.confirmed_revenue
    );
}


// =====================================================
// BOOKINGS
// =====================================================

function buildQuery() {
    const params = new URLSearchParams();
    const q = searchInput.value.trim();
    const status = statusFilter.value;

    if (q) params.set("q", q);
    if (status) params.set("status", status);

    const query = params.toString();
    return query ? `?${query}` : "";
}

function renderBooking(booking) {
    const status = (booking.status || "pending").toLowerCase();
    const messageHtml = booking.message
        ? `<div class="message-block">
                <strong>Special request</strong>
                <p>${escapeHtml(booking.message)}</p>
           </div>`
        : "";

    return `
        <article class="booking-card" data-id="${booking.id}">
            <div class="booking-top">
                <div class="booking-title">
                    <h3>${escapeHtml(booking.name)}</h3>
                    <p class="booking-meta">
                        Booking #${booking.id} · Received ${formatDateTime(booking.created_at)}
                    </p>
                </div>
                <span class="status-pill ${escapeHtml(status)}">${escapeHtml(status)}</span>
            </div>

            <dl class="booking-grid">
                <div class="detail-block">
                    <dt>Room type</dt>
                    <dd>${escapeHtml(booking.room)}</dd>
                </div>
                <div class="detail-block">
                    <dt>Check-in</dt>
                    <dd>${formatDate(booking.checkin)}</dd>
                </div>
                <div class="detail-block">
                    <dt>Check-out</dt>
                    <dd>${formatDate(booking.checkout)}</dd>
                </div>
                <div class="detail-block">
                    <dt>Guests</dt>
                    <dd>${escapeHtml(booking.guests)}</dd>
                </div>
                <div class="detail-block">
                    <dt>Phone</dt>
                    <dd>${escapeHtml(booking.phone)}</dd>
                </div>
                <div class="detail-block">
                    <dt>Email</dt>
                    <dd>${escapeHtml(booking.email)}</dd>
                </div>
                <div class="detail-block">
                    <dt>Nights</dt>
                    <dd>${escapeHtml(booking.nights)}</dd>
                </div>
                <div class="detail-block">
                    <dt>Price / night</dt>
                    <dd>${formatMoney(booking.price_per_night)}</dd>
                </div>
                <div class="detail-block price">
                    <dt>Total</dt>
                    <dd>${formatMoney(booking.total_price)}</dd>
                </div>
            </dl>

            ${messageHtml}

            <div class="booking-actions">
                <button
                    type="button"
                    class="action-btn pending-btn"
                    data-action="status"
                    data-status="pending"
                    ${status === "pending" ? "disabled" : ""}
                >
                    Mark Pending
                </button>
                <button
                    type="button"
                    class="action-btn confirm-btn"
                    data-action="status"
                    data-status="confirmed"
                    ${status === "confirmed" ? "disabled" : ""}
                >
                    Mark Confirmed
                </button>
                <button
                    type="button"
                    class="action-btn cancel-btn"
                    data-action="status"
                    data-status="cancelled"
                    ${status === "cancelled" ? "disabled" : ""}
                >
                    Mark Cancelled
                </button>
                <button
                    type="button"
                    class="action-btn delete-btn"
                    data-action="delete"
                >
                    Delete
                </button>
            </div>
        </article>
    `;
}

async function loadBookings() {
    const bookings = await apiFetch(`/bookings${buildQuery()}`);

    if (!bookings.length) {
        bookingsList.innerHTML = "";
        bookingsEmpty.hidden = false;
        return;
    }

    bookingsEmpty.hidden = true;
    bookingsList.innerHTML = bookings.map(renderBooking).join("");
}

async function refreshDashboard() {
    await Promise.all([loadStats(), loadBookings()]);
}


// =====================================================
// ACTIONS
// =====================================================

async function updateStatus(id, status) {
    await apiFetch(`/bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
    });

    showDashboardMsg(`Booking #${id} marked as ${status}.`);
    await refreshDashboard();
}

async function deleteBooking(id) {
    const confirmed = window.confirm(
        `Delete booking #${id}? This cannot be undone.`
    );

    if (!confirmed) return;

    await apiFetch(`/bookings/${id}`, {
        method: "DELETE"
    });

    showDashboardMsg(`Booking #${id} deleted.`, "success");
    await refreshDashboard();
}


// =====================================================
// EVENT LISTENERS
// =====================================================

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearLoginError();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in…";

    try {
        const data = await apiFetch("/admin/login", {
            method: "POST",
            body: JSON.stringify({ username, password })
        });

        setToken(data.token);
        showDashboard(data.admin?.username || username);
        loginForm.reset();
        await refreshDashboard();
    } catch (error) {
        showLoginError(error.message);
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Log in";
    }
});

logoutBtn.addEventListener("click", () => {
    clearToken();
    showLogin();
});

refreshBtn.addEventListener("click", async () => {
    try {
        await refreshDashboard();
        showDashboardMsg("Bookings refreshed.");
    } catch (error) {
        showDashboardMsg(error.message, "error");
    }
});

searchInput.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(async () => {
        try {
            await loadBookings();
        } catch (error) {
            showDashboardMsg(error.message, "error");
        }
    }, 300);
});

statusFilter.addEventListener("change", async () => {
    try {
        await loadBookings();
    } catch (error) {
        showDashboardMsg(error.message, "error");
    }
});

bookingsList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const card = button.closest(".booking-card");
    const id = Number(card?.dataset.id);

    if (!id) return;

    button.disabled = true;

    try {
        if (button.dataset.action === "status") {
            await updateStatus(id, button.dataset.status);
        }

        if (button.dataset.action === "delete") {
            await deleteBooking(id);
        }
    } catch (error) {
        showDashboardMsg(error.message, "error");
        button.disabled = false;
    }
});


// =====================================================
// BOOT
// =====================================================

async function boot() {
    const token = getToken();

    if (!token) {
        showLogin();
        return;
    }

    try {
        const data = await apiFetch("/admin/me");
        showDashboard(data.admin?.username);
        await refreshDashboard();
    } catch (error) {
        clearToken();
        showLogin();
    }
}

boot();
