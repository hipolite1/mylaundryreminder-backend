// dashboard.js

document.addEventListener("DOMContentLoaded", () => {

  // -----------------
  // Elements
  // -----------------
  const addForm = document.getElementById("addPickupForm");
  const messageEl = document.getElementById("message");
  const pickupTableBody = document.querySelector("#pickupTable tbody");
  const logoutBtn = document.getElementById("logoutBtn");

  // -----------------
  // Get userId from localStorage
  // -----------------
  const userId = localStorage.getItem("userId");
  if (!userId) {
    alert("User not logged in. Redirecting to login page.");
    window.location.href = "login.html";
    return;
  }

  // -----------------
  // Helper function: display message
  // -----------------
  function showMessage(msg, isError = false) {
    messageEl.textContent = msg;
    messageEl.style.color = isError ? "red" : "green";
    setTimeout(() => messageEl.textContent = "", 3000);
  }

  // -----------------
  // Load pickups
  // -----------------
  async function loadPickups() {
    if (!userId) return; // <-- Tweak: ensure userId exists before fetch

    try {
      const res = await fetch(`/api/pickups?userId=${userId}`);
      const pickups = await res.json();

      if (!Array.isArray(pickups)) {
        showMessage("Failed to load pickups: invalid response", true);
        return;
      }

      pickupTableBody.innerHTML = "";

      pickups.forEach(pickup => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${pickup.id}</td>
          <td>${pickup.customerName}</td>
          <td>${pickup.customerPhone}</td>
          <td>${pickup.dueDate}</td>
          <td>${pickup.pickedUp ? "Yes" : "No"}</td>
          <td>
            ${pickup.pickedUp ? "" : `<button class="markBtn" data-id="${pickup.id}">Mark Picked</button>`}
          </td>
        `;
        pickupTableBody.appendChild(row);
      });

      // Attach click events for mark picked buttons
      document.querySelectorAll(".markBtn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const pickupId = btn.dataset.id;
          try {
            const res = await fetch(`/api/pickups/${pickupId}/picked`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId })
            });
            const data = await res.json();
            if (data.success) {
              showMessage("Pickup marked as picked up");
              loadPickups();
            } else {
              showMessage(data.error || "Failed to mark pickup", true);
            }
          } catch (err) {
            showMessage("Error marking pickup: " + err, true);
          }
        });
      });

    } catch (err) {
      showMessage("Failed to load pickups: " + err, true);
    }
  }

  // -----------------
  // Initial load
  // -----------------
  loadPickups();

  // -----------------
  // Handle Add Pickup Form
  // -----------------
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const customerName = document.getElementById("customerName").value;
    const customerPhone = document.getElementById("customerPhone").value;
    const dueDate = document.getElementById("dueDate").value;

    if (!customerName || !customerPhone || !dueDate) {
      showMessage("All fields are required", true);
      return;
    }

    try {
      const res = await fetch("/api/pickups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, customerPhone, dueDate, userId })
      });
      const data = await res.json();
      if (data.success) {
        showMessage("Pickup added successfully");
        addForm.reset();
        loadPickups();
      } else {
        showMessage(data.error || "Failed to add pickup", true);
      }
    } catch (err) {
      showMessage("Error adding pickup: " + err, true);
    }
  });

  // -----------------
  // Logout
  // -----------------
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("userId");
    window.location.href = "login.html";
  });

});