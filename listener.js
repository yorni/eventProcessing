const redis = require("redis");

(async () => {
  const client = redis.createClient();

  const subscriber = client.duplicate();

  await subscriber.connect();

  await subscriber.subscribe("actions", (message) => {
    console.time("publishReceive");
    console.log(message); // 'message'
    console.timeEnd("publishReceive");
  });
})();
