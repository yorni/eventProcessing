const express = require("express");
const router = express.Router();

const redis = require("redis");
const publisher = redis.createClient();

const channel = "actions";

router.get("/:action/", processAction, (req, res) => {
  res.json(res.result);
});

router.post("/:action/", processAction, (req, res) => {
  res.json(res.result);
});

async function processAction(req, res, next) {
  let action = req.params.action;
  console.log(new Date().getTime());
  await publish(req, res, action);
  res.result = {
    code: 200,
  };

  next();
}
async function publish(req, res, action) {
  message = {
    action: action,
  };
  if (action == "settings") {
    console.log(req.body);
  }
  console.log(`Started ${channel} channel publisher...`);

  await publisher.connect();
  console.log(channel, action);
  await publisher.publish(channel, action);
  await publisher.disconnect();
}

module.exports = router;
