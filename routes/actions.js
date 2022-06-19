const express = require("express");
const router = express.Router();

const redis = require("redis");
const publisher = redis.createClient();

const channel = "actions";

router.get("/:action/", processAction, (req, res) => {
  res.json(res.result);
});

async function processAction(req, res, next) {
  let action = req.action;
  publish(action);
  res.result = {
    code: 200,
  };

  next();
}
async function publish(action) {
  console.log(`Started ${channel} channel publisher...`);
  publisher.publish(channel, action);
}

module.exports = router;
