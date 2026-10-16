const http = require("http");
//const express = require("express");
const PORT = process.env.PORT || 3000;
const URL_PREFIX = (process.env.URL_PREFIX || "").replace(/\/$/, "");
const MAX_BODY_BYTES = 10 * 1024;
const VALID_STATUS = ["todo", "in-progress", "done";
const VALID_PRIORITY = ["low", "medium", "high"];

// In-memory store (resets on pod restart)
let tasks = [];
let nextId = 1;

function sendJson(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readJson(req, cb) {
  let raw = "";
  let tooBig = false;
  req.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > MAX_BODY_BYTES) {
      tooBig = true;
      req.destroy();
    }
  });
  req.on("end", () => {
    if (tooBig) return cb(new Error("Payload too large"));
    try {
      cb(null, raw ? JSON.parse(raw) : {});
    } catch (e) {
      cb(new Error("Invalid JSON"));
    }
  });
}

function renderPage() {
  const deployedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DSSP Task Tracker</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #f4f4f4; font-family: Arial, Helvetica, sans-serif; color: #24466b; }
    .header { background: #fff; padding: 24px 20px; text-align: center; border-bottom: 1px solid #eee; }
    .header h1 { margin: 0 0 6px; font-size: 30px; color: #0000ee; }
    .header p { margin: 0; color: #777; font-size: 16px; }
    .wrap { max-width: 760px; margin: 28px auto; padding: 0 16px; }
    .card { background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 3px 12px rgba(0,0,0,.15); margin-bottom: 20px; }
    form { display: flex; gap: 8px; flex-wrap: wrap; }
    input[type=text] { flex: 1 1 260px; padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 15px; }
    select, button { padding: 10px 12px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; background: #fff; cursor: pointer; }
    button.primary { background: #0000ee; color: #fff; border-color: #0000ee; }
    .stats { display: flex; gap: 12px; margin-bottom: 14px; font-size: 14px; color: #555; }
    .filters { display: flex; gap: 6px; margin-bottom: 12px; }
    .filters button.active { background: #24466b; color: #fff; }
    ul { list-style: none; margin: 0; padding: 0; }
    li { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #eee; }
    li:last-child { border-bottom: none; }
    .title { flex: 1; }
    .done .title { text-decoration: line-through; color: #999; }
    .badge { font-size: 12px; padding: 2px 8px; border-radius: 10px; color: #fff; }
    .low { background: #00b050; } .medium { background: #e0a000; } .high { background: #d32f2f; }
    .empty { color: #999; text-align: center; padding: 16px 0; }
    .error { color: #d32f2f; font-size: 14px; margin-top: 8px; min-height: 18px; }
    .deployment { color: #777; font-size: 13px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DSSP Task Tracker</h1>
    <p>NodeJS Pipeline Test Successful</p>
  </div>
  <div class="wrap">
    <div class="card">
      <form id="addForm">
        <input type="text" id="title" placeholder="New task..." maxlength="120" required>
        <select id="priority">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
        </select>
        <button class="primary" type="submit">Add</button>
      </form>
      <div class="error" id="error"></div>
    </div>
    <div class="card">
      <div class="stats" id="stats"></div>
      <div class="filters" id="filters"></div>
      <ul id="list"></ul>
    </div>
    <div class="deployment">Deployed at: ${deployedAt} IST</div>
  </div>
  <script>
    var BASE = ${JSON.stringify(URL_PREFIX)};
    var API = BASE + "/api/tasks";
    var filter = "all";
    var allTasks = [];

    function call(method, url, body) {
      return fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      }).then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) throw new Error(data.error || "Request failed");
          return data;
        });
      });
    }

    function showError(msg) { document.getElementById("error").textContent = msg || ""; }

    function load() {
      call("GET", API).then(function (data) { allTasks = data; render(); })
        .catch(function (e) { showError(e.message); });
    }

    function render() {
      var counts = { todo: 0, "in-progress": 0, done: 0 };
      allTasks.forEach(function (t) { counts[t.status]++; });
      document.getElementById("stats").textContent =
        "Total: " + allTasks.length + " | To do: " + counts.todo +
        " | In progress: " + counts["in-progress"] + " | Done: " + counts.done;

      var filters = document.getElementById("filters");
      filters.innerHTML = "";
      ["all", "todo", "in-progress", "done"].forEach(function (f) {
        var b = document.createElement("button");
        b.textContent = f;
        if (f === filter) b.className = "active";
        b.onclick = function () { filter = f; render(); };
        filters.appendChild(b);
      });

      var list = document.getElementById("list");
      list.innerHTML = "";
      var shown = allTasks.filter(function (t) { return filter === "all" || t.status === filter; });
      if (!shown.length) {
        var empty = document.createElement("li");
        empty.className = "empty";
        empty.textContent = "No tasks";
        list.appendChild(empty);
        return;
      }
      shown.forEach(function (t) {
        var li = document.createElement("li");
        if (t.status === "done") li.className = "done";

        var title = document.createElement("span");
        title.className = "title";
        title.textContent = t.title;

        var badge = document.createElement("span");
        badge.className = "badge " + t.priority;
        badge.textContent = t.priority;

        var sel = document.createElement("select");
        ["todo", "in-progress", "done"].forEach(function (s) {
          var o = document.createElement("option");
          o.value = s; o.textContent = s;
          if (s === t.status) o.selected = true;
          sel.appendChild(o);
        });
        sel.onchange = function () {
          call("PATCH", API + "/" + t.id, { status: sel.value }).then(load)
            .catch(function (e) { showError(e.message); });
        };

        var del = document.createElement("button");
        del.textContent = "Delete";
        del.onclick = function () {
          call("DELETE", API + "/" + t.id).then(load)
            .catch(function (e) { showError(e.message); });
        };

        li.appendChild(title);
        li.appendChild(badge);
        li.appendChild(sel);
        li.appendChild(del);
        list.appendChild(li);
      });
    }

    document.getElementById("addForm").onsubmit = function (e) {
      e.preventDefault();
      showError("");
      var input = document.getElementById("title");
      call("POST", API, {
        title: input.value,
        priority: document.getElementById("priority").value
      }).then(function () { input.value = ""; load(); })
        .catch(function (err) { showError(err.message); });
    };

    load();
  </script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  // Strip the prefix before route matching (query string removed first)
  let path = req.url.split("?")[0];
  if (URL_PREFIX) {
    if (path === URL_PREFIX || path.startsWith(URL_PREFIX + "/")) {
      path = path.slice(URL_PREFIX.length) || "/";
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 - Page Not Found");
      return;
    }
  }

  // Health check endpoint for Docker/Kubernetes
  if (path === "/health") {
    return sendJson(res, 200, { status: "UP", application: "DSSP Portal" });
  }

  // Main application page
  if (path === "/" || path === "") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderPage());
    return;
  }

  // GET /api/tasks, POST /api/tasks
  if (path === "/api/tasks") {
    if (req.method === "GET") return sendJson(res, 200, tasks);

    if (req.method === "POST") {
      return readJson(req, (err, body) => {
        if (err) return sendJson(res, 400, { error: err.message });

        const title = typeof body.title === "string" ? body.title.trim() : "";
        const priority = body.priority || "medium";
        if (!title) return sendJson(res, 400, { error: "title is required" });
        if (title.length > 120) return sendJson(res, 400, { error: "title max 120 chars" });
        if (!VALID_PRIORITY.includes(priority)) {
          return sendJson(res, 400, { error: "priority must be low, medium or high" });
        }

        const task = {
          id: nextId++,
          title,
          priority,
          status: "todo",
          createdAt: new Date().toISOString(),
        };
        tasks.push(task);
        return sendJson(res, 201, task);
      });
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  }

  // PATCH/DELETE /api/tasks/:id
  const match = path.match(/^\/api\/tasks\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    const task = tasks.find((t) => t.id === id);
    if (!task) return sendJson(res, 404, { error: "Task not found" });

    if (req.method === "PATCH") {
      return readJson(req, (err, body) => {
        if (err) return sendJson(res, 400, { error: err.message });

        if (body.status !== undefined) {
          if (!VALID_STATUS.includes(body.status)) {
            return sendJson(res, 400, { error: "status must be todo, in-progress or done" });
          }
          task.status = body.status;
        }
        if (body.priority !== undefined) {
          if (!VALID_PRIORITY.includes(body.priority)) {
            return sendJson(res, 400, { error: "priority must be low, medium or high" });
          }
          task.priority = body.priority;
        }
        if (body.title !== undefined) {
          const title = String(body.title).trim();
          if (!title || title.length > 120) {
            return sendJson(res, 400, { error: "title must be 1-120 chars" });
          }
          task.title = title;
        }
        return sendJson(res, 200, task);
      });
    }

    if (req.method === "DELETE") {
      tasks = tasks.filter((t) => t.id !== id);
      return sendJson(res, 200, { deleted: id });
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  }

  // 404 for unknown routes
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 - Page Not Found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`DSSP application running on port ${PORT}, prefix: ${URL_PREFIX || "(none)"}`);
});
