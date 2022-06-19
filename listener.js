const redis = require("redis");

(async () => {
  const client = redis.createClient();

  const subscriber = client.duplicate();

  await subscriber.connect();

  await subscriber.subscribe("actions", (message) => {
    console.log(message); // 'message'
  });
})();
