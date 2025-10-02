// Connect to the server
const socket = io();

// Grab current logged-in username from a hidden element
const currentUser = document.querySelector("body").dataset.username;

// Register this user with the server (so it can map socket → username)
if (currentUser) {
  socket.emit("registerUser", { username: currentUser });
}

// Listen for new chat messages
socket.on("chatMessage", (msg) => {
  const messagesDiv = document.querySelector(".messages");
  if (!messagesDiv) return;

  const chatWith = document.querySelector("input[name='receiver']")?.value;

  // Only show if this message is between current user and chatWith
  const isForThisChat =
    (msg.sender === currentUser && msg.receiver === chatWith) ||
    (msg.sender === chatWith && msg.receiver === currentUser);

  if (isForThisChat) {
    // Create a message bubble
    const div = document.createElement("div");
    div.classList.add("message");
    div.classList.add(msg.sender === currentUser ? "sent" : "received");
    div.innerHTML = `<strong>${msg.sender}</strong> ${msg.text}`;

    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // ✅ Update sidebar no matter what (so new partners show up)
  const sidebarList = document.querySelector(".chat-list ul");
  if (sidebarList) {
    const partner = msg.sender === currentUser ? msg.receiver : msg.sender;

    if (!sidebarList.querySelector(`a[href="/chat?with=${partner}"]`)) {
      const li = document.createElement("li");
      li.classList.add("chat-item");
      li.innerHTML = `<a href="/chat?with=${partner}">${partner}</a>`;
      sidebarList.appendChild(li);
    }
  }
});

// Intercept message form submit → send over socket
const form = document.querySelector(".message-form");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector("input[name='text']");
    const receiver = form.querySelector("input[name='receiver']").value;

    if (input.value.trim()) {
      const msg = {
        sender: currentUser,
        receiver,
        text: input.value.trim(),
      };

      socket.emit("chatMessage", msg); // send to server
      input.value = "";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.querySelector(".toggle-sidebar");
  const sidebar = document.querySelector(".chat-list");
  const overlay = document.createElement("div");
  overlay.classList.add("overlay");
  document.body.appendChild(overlay);

  toggleBtn.addEventListener("click", () => {
    sidebar.classList.add("active");
    overlay.classList.add("active");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  });
});
