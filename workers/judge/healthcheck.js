#!/usr/bin/env node
const amqplib = require("amqplib");

async function main() {
  const url = process.env.JUDGE_RABBIT_URL;
  if (!url) {
    console.log("JUDGE_RABBIT_URL not set; treating worker as healthy");
    return;
  }
  const connection = await amqplib.connect(url);
  try {
    const channel = await connection.createChannel();
    await channel.close();
  } finally {
    await connection.close();
  }
}

main()
  .then(() => {
    console.log("judge worker healthcheck ok");
    process.exit(0);
  })
  .catch((error) => {
    console.error("judge worker healthcheck failed", error);
    process.exit(1);
  });
