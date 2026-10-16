const http = require("http");

const PORT = process.env.PORT || 3000;
const URL_PREFIX = process.env.URL_PREFIX || "";

const server = http.createServer((req, res) => {

  // Strip the prefix before route matching
  let path = req.url;
  if (URL_PREFIX && path.startsWith(URL_PREFIX)) {
    path = path.slice(URL_PREFIX.length) || "/";
  } else if (URL_PREFIX) {
    // Request doesn't match expected prefix
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 - Page Not Found");
    return;
  }

  // Health check endpoint for Docker/Kubernetes
  if (path === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "UP",
        application: "DSSP Portal",
      })
    );
    return;
  }

  // Main application page
  if (path === "/" || path === "") {
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

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
    });

    res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">

        <title>DSSP Portal</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            min-height: 100vh;
            background: #f4f4f4;
            font-family: Arial, Helvetica, sans-serif;
            display: flex;
            flex-direction: column;
          }

          .header {
            background: #ffffff;
            width: 100%;
            padding: 30px 20px 25px;
            text-align: center;
            border-bottom: 1px solid #eeeeee;
          }

          .header h1 {
            margin: 0 0 22px;
            font-size: 34px;
            color: #0000ee;
            font-weight: 700;
          }

          .header p {
            margin: 0;
            color: #777777;
            font-size: 21px;
            line-height: 1.5;
          }

          .content {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding-top: 48px;
          }

          .card {
            width: 580px;
            max-width: calc(100% - 40px);
            background: #ffffff;
            border-radius: 10px;
            padding: 58px 35px 45px;
            text-align: center;
            box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
          }

          .card h2 {
            margin: 0 0 25px;
            color: #24466b;
            font-size: 32px;
            line-height: 1.15;
            font-weight: 700;
          }

          .success {
            color: #00b050;
            font-size: 21px;
            margin-bottom: 26px;
          }

          .deployment {
            color: #777777;
            font-size: 14px;
          }

          @media (max-width: 768px) {
            .header h1 {
              font-size: 28px;
            }

            .header p {
              font-size: 17px;
            }

            .card h2 {
              font-size: 27px;
            }
          }
        </style>
      </head>

      <body>

        <main class="content">
          <div class="card">

            <h2>
              Hello GSPANN From DSSP<br>
              Portal
            </h2>

            <div class="success">
              NodeJS Pipeline Test Successful
            </div>

            <div class="deployment">
              Deployed at: ${deployedAt} IST
            </div>

          </div>
        </main>

      </body>
      </html>
    `);

    return;
  }

  // 404 for unknown routes
  res.writeHead(404, {
    "Content-Type": "text/plain",
  });

  res.end("404 - Page Not Found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`DSSP application running on port ${PORT}, prefix: ${URL_PREFIX || "(none)"}`);
});
