const redis = require("redis");
const subscriber = redis.createClient();

const channel = "actions";

subscriber.subscribe(channel, (error, channel) => {
  if (error) {
    throw new Error(error);
  }
  console.log(
    `Subscribed to ${channel} channel. Listening for updates on the ${channel} channel...`
  );
});

subscriber.on("message", (channel, message) => {
  console.log(`Received message from ${channel} channel: ${message}`);
});
