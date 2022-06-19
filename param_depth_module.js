let getParamDepthObj = function getParamDepthObj() {
  return {
    time: 0,
    timeH: "",

    maxVolPriceBid005: 0,
    maxVolBid005: 0,
    percenttoBigBid005: 0,
    maxVolPriceAsk005: 0,
    maxVolAsk005: 0,
    percenttoBigAsk005: 0,
    lastAsk: {},
    lastBid: {},
  };
};

let generateParamDepth = function generateParamDepth(fullDepth) {
  let paramVol = getParamDepthObj();

  if (fullDepth.eventTime == undefined) {
    return paramVol;
  }

  paramVol.time = fullDepth.eventTime;

  paramVol.lastAsk = fullDepth.lastAsk;
  paramVol.lastBid = fullDepth.lastBid;

  d = new Date(fullDepth.eventTime);
  paramVol.timeH = d.toLocaleString().replace(/, /g, ":");

  //shrinkDepth(fullDepth, 0.006);

  percent = 0.005;

  processBidVolBid(paramVol, fullDepth, percent);
  processBidVolAsk(paramVol, fullDepth, percent);

  processPercentToBigVol(paramVol, fullDepth);

  return paramVol;
};

let getClosestPrice = function getClosestPrice(deals, fullDepth) {
  if (deals == "asks") {
    return Object.keys(fullDepth[deals]).sort((a, b) => a - b)[0];
  } else {
    return Object.keys(fullDepth[deals]).sort((a, b) => b - a)[0];
  }

  // for (const prop in fullDepth[deals]) {
  //   if (fullDepth[deals][prop] != 0) {
  //     return prop;
  //   }
  // }
};

let roundPlus = function roundPlus(x, n) {
  if (isNaN(x) || isNaN(n)) return x;
  var m = Math.pow(10, n);
  return Math.round(x * m) / m;
};

let getVolFromDepth = function getVolFromDepth(start, end, bidAsk, fullDepth) {
  let vol = 0;
  for (const prop in fullDepth[bidAsk]) {
    if (start >= Number(prop) && Number(prop) >= end) {
      vol = vol + Number(fullDepth[bidAsk][prop]);
    }
  }
  return vol;
};

function processBidVolBid(paramVol, fullDepth, percent) {
  for (const prop in fullDepth.bids) {
    currPrice = Number(prop);
    //005
    if ((fullDepth.lastBid.p - currPrice) / currPrice <= percent) {
      if (fullDepth.bids[prop] > paramVol.maxVolBid005) {
        paramVol.maxVolBid005 = fullDepth.bids[prop];
        paramVol.maxVolPriceBid005 = +prop;
      }
    }
  }
}

function processBidVolAsk(paramVol, fullDepth, percent) {
  for (const prop in fullDepth.asks) {
    currPrice = Number(prop);
    //005
    if ((currPrice - fullDepth.lastAsk.p) / fullDepth.lastAsk.p <= percent) {
      if (fullDepth.asks[prop] > paramVol.maxVolAsk005) {
        paramVol.maxVolAsk005 = fullDepth.asks[prop];
        paramVol.maxVolPriceAsk005 = +prop;
      }
    }
  }
}

function processPercentToBigVol(paramVol, fullDepth) {
  paramVol.percenttoBigBid005 = roundPlus(
    (fullDepth.lastBid.p - paramVol.maxVolPriceBid005) /
      paramVol.maxVolPriceBid005,
    5
  );

  paramVol.percenttoBigAsk005 = roundPlus(
    (paramVol.maxVolPriceAsk005 - fullDepth.lastAsk.p) / fullDepth.lastAsk.p,
    5
  );
}

function shrinkDepth(fullDepth, percent) {
  for (prop in fullDepth.asks) {
    if ((Number(prop) - fullDepth.lastAsk.p) / fullDepth.lastAsk.p > percent) {
      delete fullDepth.asks[prop];
    }
  }
  for (prop in fullDepth.bids) {
    if ((fullDepth.lastBid.p - Number(prop)) / Number(prop) > percent) {
      delete fullDepth.bids[prop];
    }
  }
}

module.exports.generateParamDepth = generateParamDepth;
module.exports.getParamDepthObj = getParamDepthObj;
module.exports.roundPlus = roundPlus;
module.exports.getVolFromDepth = getVolFromDepth;
module.exports.getClosestPrice = getClosestPrice;
