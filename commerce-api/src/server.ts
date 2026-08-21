import { createApp } from "./app.js";

const { app, config, persistence } = await createApp();
const server = app.listen(config.PORT, () =>
  console.log(`Commerce API listening on http://localhost:${config.PORT}`),
);

let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  server.close(async () => {
    await persistence?.disconnect();
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
