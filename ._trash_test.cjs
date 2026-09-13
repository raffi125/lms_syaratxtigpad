const fs = require("fs");
const { spawn } = require("child_process");
const server = spawn("npx", ["next", "dev", "-p", "3114"], { cwd: process.cwd(), shell: true });
let logs = "";
server.stdout.on("data", (d) => { logs += d; });
server.stderr.on("data", (d) => { logs += d; });
setTimeout(async () => {
  async function call(payload) {
    const res = await fetch("http://localhost:3114/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return `[${res.status}] ${await res.text()}`;
  }
  console.log("mentor raffi:", await call({ query: "raffi@tigpad.com", password: "mentor" }));
  console.log("mentor fathiya:", await call({ query: "fathiya03", password: "mentor" }));
  console.log("admin asli:", await call({ query: "admin@tigpad.com", password: "admin" }));
  console.log("peserta:", await call({ query: "sindi24002@mail.unpad.ac.id", password: "" }));
  server.kill();
}, 26000);
