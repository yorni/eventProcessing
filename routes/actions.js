const express = require("express");
const router = express.Router();

const redis = require("redis");
const publisher = redis.createClient();

const channel = "actions";

router.post("/", processAction, (req, res) => {
  res.json(res.result);
});

async function processAction(req, res, next) {
  await publish(req, res, action);
  res.result = {
    code: 200,
  };

  next();
}
async function publish(req, res) {
  console.log(`Started ${channel} channel publisher...`);

  await publisher.connect();
  console.log(channel, req.body);
  await publisher.publish(channel, action);
  await publisher.disconnect();
}

module.exports = router;
