import "highlight.js/styles/atom-one-light.css";
import "./style.css";
import "./main.css";
import { renderHome } from "./pages/home/home.js";
import { renderReview } from "./pages/review/review.js";
import { renderHistory } from "./pages/history/history.js";
import { renderChat } from "./pages/chat/chat.js";

function getRoute() {
  const path = window.location.pathname;
  if (path.startsWith("/review/")) return { name: "review", id: path.split("/")[2] };
  if (path.startsWith("/chat/"))   return { name: "chat",   id: path.split("/")[2] };
  if (path === "/history")         return { name: "history" };
  return { name: "home" };
}

function navigate(path) {
  window.history.pushState({}, "", path);
  render();
}

function render() {
  const app = document.getElementById("app");
  const route = getRoute();

  app.innerHTML = `
    <header>
      <div class="container">
        <div class="header-brand">
          <h1>Code Review Chatbot</h1>
          <div class="header-divider"></div>
          <p>AI-Powered Analysis</p>
        </div>
        <nav>
          <button class="btn btn-sm ${route.name === 'home' ? 'active' : ''}" id="nav-home">Home</button>
          <button class="btn btn-sm ${route.name === 'history' ? 'active' : ''}" id="nav-history">History</button>
        </nav>
      </div>
    </header>
    <div id="page"></div>
  `;

  document.getElementById("nav-home").addEventListener("click", () => navigate("/"));
  document.getElementById("nav-history").addEventListener("click", () => navigate("/history"));

  const page = document.getElementById("page");
  if      (route.name === "review")  renderReview(page, route.id, navigate);
  else if (route.name === "chat")    renderChat(page, route.id, navigate);
  else if (route.name === "history") renderHistory(page, navigate);
  else                               renderHome(page, navigate);
}

window.addEventListener("popstate", render);
render();
