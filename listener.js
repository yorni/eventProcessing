const redis = require("redis");
require("dotenv").config();

let balanceReal = 0;
let balancePercent = 0;

//param for real
let realOn = process.env["REAL"];
let countDealReal = process.env["AMOUNT"];
let leverage = 0;
let symbolTrade = process.env["SYMBOL"];
let accuracySymbol = process.env["ACCURACY1"];
let accuracySymbol2 = process.env["ACCURACY2"];

let totalReal = {
  timeStart: "",
  symbol: symbolTrade,
  countDeals: 0,
  sumOpenUSDT: 0,
  comissionOpenBNB: 0,
  comissionOpenUSDT: 0,
  sumCloseUSDT: 0,
  comissionCloseBNB: 0,
  comissionCloseUSDT: 0,
  totalRealizedProfit: 0,
};
let recalcStop = false;
let recalcTake = false;
//--------------------------------

let priceOpen = 0;
let dealOpen;
let stopLoss;
let takeProfit;

let dealsClose = [];

let deal;

let paramsTrade = {
  setSignalFromTrade: false,
  setSignalFromDepth: false,
  setSignalFromDepthUpdate: true,
  depthOutDateTime: 100,
  virtualOff: false,
  feeLimit: 0.00018,
  feeMarket: 0.00036,
  roundDepthTo: 0,
  openForLevel: true,
  moveTPSLNotSignal: true,
  moveTPSL: true,
  pointForMoveCurrPrice: true,
  openOnSignalMarket: false,
  openOnSignalLimit: false,
  percentSignal: process.env["PERCENTSIGNAL"],
  stepSignal: 1,
  offsetOpenLong: 0,
  offsetOpenShort: 0,
  stop: 0,
  take: 0,
  stopStep: 1,
  takeStep: 3,
  resetPercentDistFromLevel: process.env["RESETDISTANCE"],
  resetStepDistFromOpen: 5,
  closeLevelDownUp: false,
};

let startScript = false;
let paramDepthTrade;
let arrParamDepthTrade = [];
let tradeDataTrade = [];

let fullDepthTrade = {
  symbol: "",
  eventTime: 0,
  firstId: 0,
  finalId: 0,

  bids: {},
  asks: {},
  lastAsk: {},
  lastBid: {},
};
let aggfullDepthTrade = {};
let executeDepthLevel = { time: 0, asks: {}, bids: {} };

let depthSnapshotTrade;

let depthSnapshotSendedTrade = false;

let updateDepthTrade = [];

let depthUpdatedTrade = false;
let startTime = 0;
let startOpenDealsHistory = false;

let signalLong = false;
let signalShort = false;

let paramDepthModule = require("./param_depth_module");

const fs = require("fs");
const path = require("path");

const Binance = require("node-binance-api");
const { fsyncSync } = require("fs");
const binance = new Binance().options({
  APIKEY: process.env["APIKEY"],
  APISECRET: process.env["APISECRET"],
  reconnect: true,
  verbose: true,
});
console.log(process.env["APIKEY"]);
console.log(process.env["APISECRET"]);

function processLastBidAsk(data) {
  fullDepthTrade.lastAsk = { p: +data.a, q: +data.A, t: data.E };
  fullDepthTrade.lastBid = { p: +data.b, q: +data.B, t: data.E };
  if (arrParamDepthTrade.length != 0) {
    arrParamDepthTrade[0].lastAsk = { p: +data.a, q: +data.A, t: data.E };
    arrParamDepthTrade[0].lastBid = { p: +data.b, q: +data.B, t: data.E };
  }
  moveTPSL("updateDepth");

  setSignalFromDepthUpdate();
}

function processTradeDataTrade(trade) {
  tradeDataTrade.push(trade);

  setSignalFromTrade(trade);

  setOpenVirtual(trade);

  //reset ----------------------------------
  if (!realOn) {
    resetDealAll(trade.m, trade.p);
  }

  //close
  if (!realOn) {
    if (deal.direction == "long" && deal.timeOpen != 0 && !trade.m) {
      if (Number(trade.p) >= deal.take) {
        deal.percentComissionClose = paramsTrade.feeLimit;
        closeDealNew(trade.E, "take");
      } else if (Number(trade.p) <= deal.stop) {
        deal.percentComissionClose = paramsTrade.feeLimit;
        closeDealNew(trade.E, "stop");
      }
    }

    if (deal.direction == "short" && deal.timeOpen != 0 && trade.m) {
      if (Number(trade.p) <= deal.take) {
        deal.percentComissionClose = paramsTrade.feeLimit;
        closeDealNew(trade.E, "take");
      } else if (Number(trade.p) >= deal.stop) {
        deal.percentComissionClose = paramsTrade.feeLimit;
        closeDealNew(trade.E, "stop");
      }
    }
  }
}

async function processDepthDataTrade(depth) {
  if (!depthSnapshotSendedTrade) {
    depthSnapshotSendedTrade = true;
    depthSnapshotTrade = await binance.futuresDepth(symbolTrade, {
      limit: 1000,
    });
    let depthL = {
      lastUpdateId: depthSnapshotTrade.lastUpdateId,
      bids: {},
      asks: {},
      lastAsk: { p: 0 },
      lastBid: { p: 0 },
    };
    depthSnapshotTrade.asks.forEach((el) => {
      depthL.asks[el[0]] = +el[1];
    });
    depthSnapshotTrade.bids.forEach((el) => {
      depthL.bids[el[0]] = +el[1];
    });
    depthSnapshotTrade = depthL;
  }

  if (depthSnapshotTrade == undefined) {
    updateDepthTrade.push(depth);
  } else if (!depthUpdatedTrade) {
    updateDepthTrade.push(depth);
    updateDepthTrade.forEach((element) => {
      if (
        element.U <= depthSnapshotTrade.lastUpdateId + 1 &&
        element.u >= depthSnapshotTrade.lastUpdateId + 1
      ) {
        appyUpdateTrade(element, depthSnapshotTrade);
        depthUpdatedTrade = true;
      }
    });

    if (!depthUpdatedTrade) {
      depthUpdatedTrade = true;
      fullDepthTrade = depthSnapshotTrade;
    }
  } else {
    appyUpdateTrade(depth, fullDepthTrade);
  }

  if (depthUpdatedTrade) {
    generateParamDepthTrade();

    if (paramDepthTrade.time != 0) {
      if (!startOpenDealsHistory) {
        d = new Date(paramDepthTrade.time);
        t = d.toLocaleString().replace(/, /g, ":");
        console.log("start open deals history: " + t);
        startOpenDealsHistory = true;
        totalReal.timeStart = t;
      }

      arrParamDepthTrade.unshift(paramDepthTrade);
      if (arrParamDepthTrade.length > 10) {
        arrParamDepthTrade.length = 10;
      }

      checkOpenDeal();
    }

    tradeDataTrade = [];
  }
}

function setOpenVirtual(trade) {
  //open---------------------------
  if (!realOn) {
    if (
      deal.direction == "long" &&
      deal.timeOpen == 0 &&
      trade.m &&
      deal.priceOpen >= Number(trade.p)
      // && fullDepthTrade.lastAsk.p - fullDepthTrade.lastBid.p <=
      //   1 / accuracySymbol &&
      // fullDepthTrade.lastAsk.p - fullDepthTrade.lastBid.p > 0
    ) {
      deal.take = getTPSL("take", deal.direction, fullDepthTrade.lastAsk.p);
      deal.stop = getTPSL("stop", deal.direction, fullDepthTrade.lastBid.p);

      //deal.priceOpen = fullDepthTrade.lastAsk.p;
      deal.percentComissionOpen = paramsTrade.feeLimit;
      deal.timeOpen = trade.E;
      deal.fromSignalToOpen = deal.timeOpen - deal.timeSignal;
      console.log(
        "open " +
          deal.direction +
          ", time:" +
          Date.now() +
          "---------------------"
      );
    }
    if (
      deal.direction == "short" &&
      deal.timeOpen == 0 &&
      !trade.m &&
      deal.priceOpen <= Number(trade.p)
      // && fullDepthTrade.lastAsk.p - fullDepthTrade.lastBid.p <=
      //   1 / accuracySymbol &&
      // fullDepthTrade.lastAsk.p - fullDepthTrade.lastBid.p > 0
    ) {
      deal.take = getTPSL("take", deal.direction, fullDepthTrade.lastBid.p);
      deal.stop = getTPSL("stop", deal.direction, fullDepthTrade.lastAsk.p);
      //deal.priceOpen = fullDepthTrade.lastBid.p;
      deal.percentComissionOpen = paramsTrade.feeLimit;
      deal.timeOpen = trade.E;
      deal.fromSignalToOpen = deal.timeOpen - deal.timeSignal;
      console.log(
        "open " +
          deal.direction +
          ", time:" +
          Date.now() +
          "---------------------"
      );
    }
  }
}

function closeDealNew(time, typeClose, priceClose = 0) {
  deal.timeClose = time;
  deal.fromOpenToClose = deal.timeClose - deal.timeOpen;
  if (priceClose != 0) {
    deal.priceClose = priceClose;
  } else {
    deal.priceClose = deal[typeClose];
  }

  if (deal.direction == "long") {
    deal.profit =
      deal.priceClose -
      deal.priceOpen -
      deal.priceClose * deal.percentComissionClose -
      deal.priceOpen * deal.percentComissionOpen;
    deal.profit = paramDepthModule.roundPlus(deal.profit, 5);
    deal.percent = paramDepthModule.roundPlus(deal.profit / deal.priceOpen, 5);
  } else {
    deal.profit =
      deal.priceOpen -
      deal.priceClose -
      deal.priceClose * deal.percentComissionClose -
      deal.priceOpen * deal.percentComissionOpen;
    deal.profit = paramDepthModule.roundPlus(deal.profit, 5);
    deal.percent = paramDepthModule.roundPlus(deal.profit / deal.priceClose, 5);
  }

  if (dealsClose.length != 0) {
    console.log(
      "from close prev to curr signal: " +
        (deal.timeSignal - dealsClose[0].timeClose)
    );
    console.log(
      "prev deal: " +
        dealsClose[0].direction +
        "/" +
        dealsClose[0].percent +
        ", level: " +
        dealsClose[0].level +
        ", curr deal: " +
        deal.direction +
        "/" +
        deal.percent +
        ", level: " +
        deal.level
    );
  }

  dealsClose.push(deal);

  console.log(
    "close " +
      typeClose +
      ", time: " +
      Date.now() +
      "-----------------------------"
  );

  console.log(deal);
  balanceReal = balanceReal + deal.profit;
  balancePercent = balancePercent + deal.percent;
  console.log("balance: " + balanceReal);
  console.log("balance percent: " + balancePercent);
  resetDeal();
  signalLong = false;
  signalShort = false;
}

async function resetDealAll(m, p) {
  //reset resetPercentDistFromLevel
  if (paramsTrade.resetStepDistFromOpen != -1) {
    if (
      deal.direction == "long" &&
      ((deal.timeOpen == 0 && !realOn) ||
        (realOn &&
          dealOpen != undefined &&
          dealOpen.orderStatus != "FILLED")) &&
      m &&
      paramDepthModule.roundPlus(deal.priceOpen - Number(p), accuracySymbol2) >
        paramsTrade.resetStepDistFromOpen / accuracySymbol
    ) {
      //console.log("reset resetStepDistFromOpen");
      if (realOn && dealOpen != undefined && dealOpen.orderStatus != "FILLED") {
        cancelation = await binance.futuresCancelAll(symbolTrade);
        if (cancelation != undefined) {
          percent = (Number(p) - deal.priceOpen) / deal.priceOpen;
          console.log("reset real deal complite: " + percent);
          resetDeal();
        }
      } else if (!realOn) {
        resetDeal();
      }

      return;
    }
    if (
      deal.direction == "short" &&
      ((deal.timeOpen == 0 && !realOn) ||
        (realOn &&
          dealOpen != undefined &&
          dealOpen.orderStatus != "FILLED")) &&
      !m &&
      paramDepthModule.roundPlus(Number(p) - deal.priceOpen, accuracySymbol2) >
        paramsTrade.resetStepDistFromOpen / accuracySymbol
    ) {
      //console.log("reset resetStepDistFromOpen");
      if (realOn && dealOpen != undefined && dealOpen.orderStatus != "FILLED") {
        cancelation = await binance.futuresCancelAll(symbolTrade);
        if (cancelation != undefined) {
          percent = (deal.priceOpen - Number(p)) / Number(p);
          console.log("reset real deal complite: " + percent);
          resetDeal();
        }
      } else if (!realOn) {
        resetDeal();
      }
      return;
    }
  } else {
    if (
      deal.direction == "long" &&
      ((deal.timeOpen == 0 && !realOn) ||
        (realOn &&
          dealOpen != undefined &&
          dealOpen.orderStatus != "FILLED")) &&
      paramsTrade.resetPercentDistFromLevel != 0 &&
      m &&
      (deal.priceOpen - Number(p)) / Number(p) >
        paramsTrade.resetPercentDistFromLevel
    ) {
      console.log("reset resetPercentDistFromLevel");
      if (realOn && dealOpen != undefined && dealOpen.orderStatus != "FILLED") {
        cancelation = await binance.futuresCancelAll(symbolTrade);
        if (cancelation != undefined) {
          percent = (Number(p) - deal.priceOpen) / deal.priceOpen;
          console.log("reset real deal complite: " + percent);
          resetDeal();
        }
      } else if (!realOn) {
        resetDeal();
      }

      return;
    }
    if (
      deal.direction == "short" &&
      ((deal.timeOpen == 0 && !realOn) ||
        (realOn &&
          dealOpen != undefined &&
          dealOpen.orderStatus != "FILLED")) &&
      paramsTrade.resetPercentDistFromLevel != 0 &&
      !m &&
      (Number(p) - deal.priceOpen) / deal.priceOpen >
        paramsTrade.resetPercentDistFromLevel
    ) {
      console.log("reset resetPercentDistFromLevel");
      if (realOn && dealOpen != undefined && dealOpen.orderStatus != "FILLED") {
        cancelation = await binance.futuresCancelAll(symbolTrade);
        if (cancelation != undefined) {
          percent = (deal.priceOpen - Number(p)) / Number(p);
          console.log("reset real deal complite: " + percent);
          resetDeal();
        }
      } else if (!realOn) {
        resetDeal();
      }
      return;
    }
  }
}

function resetDeal() {
  deal = {
    direction: "",
    level: 0,
    volLevel: 0,
    timeSignal: 0,
    timeOpen: 0,
    fromSignalToOpen: 0,
    timeClose: 0,
    fromOpenToClose: 0,
    priceOpen: 0,
    priceClose: 0,
    countMoveTPSL: 0,
    stop: 0,
    take: 0,
    lastBid: 0,
    lastAsk: 0,
    percentComissionOpen: 0,
    percentComissionClose: 0,
    profit: 0,
    percent: 0,
  };
  //console.log("reset deal----------------------");
}

function logInfo() {
  if (fullDepthTrade.lastAsk.p - fullDepthTrade.lastBid.p < 0) {
    console.log(
      "spred < 0: " + (fullDepthTrade.lastAsk.p - fullDepthTrade.lastBid.p)
    );
  }

  if (
    fullDepthTrade.lastAsk.p - fullDepthTrade.lastBid.p >
    2 / accuracySymbol
  ) {
    stepToMaxAsk = paramDepthModule.roundPlus(
      (paramDepthTrade.maxVolPriceAsk005 - fullDepthTrade.lastAsk.p) *
        accuracySymbol,
      accuracySymbol2
    );
    stepToMaxBid = paramDepthModule.roundPlus(
      (fullDepthTrade.lastBid.p - paramDepthTrade.maxVolPriceBid005) *
        accuracySymbol,
      accuracySymbol2
    );
    console.log(
      "spred > 2, " +
        "stepToMaxAsk: " +
        stepToMaxAsk +
        ", vol: " +
        paramDepthTrade.maxVolAsk005 +
        ", stepToMaxBid: " +
        stepToMaxBid +
        ", vol: " +
        paramDepthTrade.maxVolBid005
    );
  }
}

function checkOpenDeal() {
  d = new Date(paramDepthTrade.time);
  t = d.toLocaleString().replace(/, /g, ":");

  if (fullDepthTrade.lastAsk.p - fullDepthTrade.lastBid.p < 0) {
    return;
  }
  //logInfo();

  for (const prop in executeDepthLevel.asks) {
    if (executeDepthLevel.asks.execVol > executeDepthLevel.asks.volLevel) {
      console.log(
        "time: " +
          executeDepthLevel.time +
          ", ask" +
          ", volLevel: " +
          executeDepthLevel.asks.volLevel +
          ", execVol: " +
          executeDepthLevel.asks.execVol
      );
    }
  }

  for (const prop in executeDepthLevel.bids) {
    if (executeDepthLevel.bids.execVol > executeDepthLevel.bids.volLevel) {
      console.log(
        "time: " +
          executeDepthLevel.time +
          ", bid" +
          ", volLevel: " +
          executeDepthLevel.bids.volLevel +
          ", execVol: " +
          executeDepthLevel.bids.execVol
      );
    }
  }

  moveTPSL("depth");

  if (realOn && dealOpen != undefined && dealOpen.orderStatus != "FILLED") {
    if (
      (deal.direction == "long" && deal.stop > fullDepthTrade.lastBid.p) ||
      (deal.direction == "short" && deal.stop < fullDepthTrade.lastAsk.p)
    ) {
      console.log("set correct stop " + Date.now());
      changeStop(countDealReal, true);
    }
  }

  if (recalcStop && realOn) {
    setStop();
  }
  if (recalcTake && realOn) {
    setTake();
  }

  if (deal.direction == "long") {
    resetDealAll(true, fullDepthTrade.lastBid.p);
  } else {
    resetDealAll(false, fullDepthTrade.lastAsk.p);
  }

  //generate signal #1
  setSignalFromDepth();
}

function setSignalFromTrade(trade) {
  return;
  if (
    deal.direction != "" ||
    paramDepthTrade == undefined ||
    !paramsTrade.setSignalFromTrade
  ) {
    return;
  }

  if (
    trade.m &&
    paramDepthTrade.maxVolPriceBid005 == +trade.p &&
    Number(trade.E) - paramDepthTrade.time < paramsTrade.depthOutDateTime
  ) {
    signalShort = true;
    // deal.stop = getTPSL("stop", deal.direction, +trade.p);
    // deal.take = getTPSL("take", deal.direction, +trade.p);
    // deal.priceOpen = +trade.p;
    // deal.percentComissionOpen = paramsTrade.feeMarket;
    // deal.timeOpen = trade.E;
    // deal.fromSignalToOpen = deal.timeOpen - deal.timeSignal;
    // console.log("open " + deal.direction + "----------------------");
  }
  if (
    !trade.m &&
    paramDepthTrade.maxVolPriceAsk005 == +trade.p &&
    Number(trade.E) - paramDepthTrade.time < paramsTrade.depthOutDateTime
  ) {
    signalLong = true;

    // deal.stop = getTPSL("stop", deal.direction, +trade.p);
    // deal.take = getTPSL("take", deal.direction, +trade.p);
    // deal.priceOpen = +trade.p;
    // deal.percentComissionOpen = paramsTrade.feeMarket;
    // deal.timeOpen = trade.E;
    // deal.fromSignalToOpen = deal.timeOpen - deal.timeSignal;
    // console.log("open " + deal.direction + "----------------------");
  }
  openDealNew("trade");
}

function setSignalFromDepthUpdate() {
  return;
  if (
    deal.direction != "" ||
    arrParamDepthTrade.length < 3 ||
    !paramsTrade.setSignalFromDepthUpdate
  ) {
    return;
  }

  if (
    arrParamDepthTrade[1].lastAsk.q / arrParamDepthTrade[1].maxVolAsk005 >
      0.8 &&
    arrParamDepthTrade[0].lastAsk.p < arrParamDepthTrade[1].lastAsk.p &&
    arrParamDepthTrade[0].lastAsk.q > 1000
  ) {
    signalShort = true;
  }
  if (
    arrParamDepthTrade[1].lastBid.q / arrParamDepthTrade[1].maxVolBid005 >
      0.8 &&
    arrParamDepthTrade[0].lastBid.p > arrParamDepthTrade[1].lastBid.p &&
    arrParamDepthTrade[0].lastBid.q > 1000
  ) {
    signalLong = true;
  }

  openDealNew("updateDepth");
}

function setSignalFromDepth() {
  return;
  if (
    deal.direction != "" ||
    arrParamDepthTrade.length < 3 ||
    !paramsTrade.setSignalFromDepth
  ) {
    return;
  }

  if (paramsTrade.openForLevel) {
    if (paramsTrade.stepSignal == -1) {
      signalLong =
        paramDepthTrade.percenttoBigAsk005 < paramsTrade.percentSignal;
      if (paramsTrade.roundDepthTo != 0) {
        startLevelMaxBid005 =
          paramDepthTrade.maxVolPriceBid005 + 1 / paramsTrade.roundDepthTo;
        signalShort =
          (fullDepthTrade.lastBid.p - startLevelMaxBid005) /
            startLevelMaxBid005 <
          paramsTrade.percentSignal;
      } else {
        signalShort =
          paramDepthTrade.percenttoBigBid005 < paramsTrade.percentSignal;
      }
    } else {
      signalLong =
        paramDepthModule.roundPlus(
          paramDepthTrade.maxVolPriceAsk005 - fullDepthTrade.lastAsk.p,
          accuracySymbol2
        ) <=
        paramsTrade.stepSignal / accuracySymbol;
      if (paramsTrade.roundDepthTo != 0) {
        //switch off!!!
        signalShort = false;
      }
      signalShort =
        paramDepthModule.roundPlus(
          fullDepthTrade.lastBid.p - paramDepthTrade.maxVolPriceBid005,
          accuracySymbol2
        ) <=
        paramsTrade.stepSignal / accuracySymbol;
    }
  } else {
    if (paramsTrade.stepSignal == -1) {
      if (paramsTrade.roundDepthTo != 0) {
        startLevelMaxBid005 =
          paramDepthTrade.maxVolPriceBid005 + 1 / paramsTrade.roundDepthTo;
        signalLong =
          (fullDepthTrade.lastBid.p - startLevelMaxBid005) /
            startLevelMaxBid005 <
          paramsTrade.percentSignal;
      } else {
        signalLong =
          paramDepthTrade.percenttoBigBid005 < paramsTrade.percentSignal;
      }
      signalShort =
        paramDepthTrade.percenttoBigAsk005 < paramsTrade.percentSignal;
    } else {
      if (paramsTrade.roundDepthTo != 0) {
        //switch off!!!
        signalLong = false;
      }
      signalLong =
        paramDepthModule.roundPlus(
          fullDepthTrade.lastBid.p - paramDepthTrade.maxVolPriceBid005,
          accuracySymbol2
        ) <=
        paramsTrade.stepSignal / accuracySymbol;
      signalShort =
        paramDepthModule.roundPlus(
          paramDepthTrade.maxVolPriceAsk005 - fullDepthTrade.lastAsk.p,
          accuracySymbol2
        ) <=
        paramsTrade.stepSignal / accuracySymbol;
    }
  }
  openDealNew("depth");
}

function moveTPSL(source = "", onlyStop = false) {
  if (deal.direction == "") {
    return;
  }

  if (
    (signalLong || paramsTrade.moveTPSLNotSignal) &&
    deal.direction == "long" &&
    ((deal.timeOpen != 0 && !realOn) ||
      (realOn && dealOpen != undefined && dealOpen.orderStatus == "FILLED")) &&
    paramsTrade.moveTPSL
  ) {
    if (!onlyStop) {
      takel = getTPSL("take", deal.direction, fullDepthTrade.lastAsk.p);
      if (takel - deal.take >= 1 / accuracySymbol) {
        if (!realOn) {
          tb = deal.take;
          deal.take = takel;
          deal.countMoveTPSL = deal.countMoveTPSL + 1;
          console.log(
            "set new take virtual: " +
              tb +
              " > " +
              deal.take +
              ", source: " +
              source
          );
        } else if (
          realOn &&
          dealOpen != undefined &&
          dealOpen.orderStatus == "FILLED" &&
          takeProfit != undefined &&
          takeProfit.code == undefined
        ) {
          deal.take = takel;
          deal.countMoveTPSL = deal.countMoveTPSL + 1;
          changeTake(countDealReal);
        }
      } else if (takel < deal.take && paramsTrade.closeLevelDownUp) {
        closeDealNew(
          paramDepthTrade.time,
          "closeChangeLevel",
          fullDepthTrade.lastBid.p,
          paramsTrade.feeLimit,
          paramsTrade.feeMarket
        );
      }
    }
    stopl = getTPSL("stop", deal.direction, fullDepthTrade.lastBid.p);
    if (stopl - deal.stop >= 1 / accuracySymbol) {
      if (!realOn) {
        tb = deal.stop;
        deal.stop = stopl;
        console.log(
          "set new stop virtual: " +
            tb +
            " > " +
            deal.stop +
            ", source: " +
            source
        );
      } else if (
        realOn &&
        dealOpen != undefined &&
        dealOpen.orderStatus == "FILLED" &&
        stopLoss != undefined &&
        stopLoss.code == undefined
      ) {
        deal.stop = stopl;
        changeStop(countDealReal);
      }
    }
  }

  if (
    (signalShort || paramsTrade.moveTPSLNotSignal) &&
    deal.direction == "short" &&
    ((deal.timeOpen != 0 && !realOn) ||
      (realOn && dealOpen != undefined && dealOpen.orderStatus == "FILLED")) &&
    paramsTrade.moveTPSL
  ) {
    if (paramsTrade.pointForMoveCurrPrice) {
      if (paramsTrade.openOnSignalLimit) {
        pol = fullDepthTrade.lastBid.p;
      } else if (paramsTrade.openOnSignalMarket) {
        pol = fullDepthTrade.lastAsk.p;
      } else {
        pol = fullDepthTrade.lastBid.p;
      }
    }
    if (!onlyStop) {
      takel = getTPSL("take", deal.direction, fullDepthTrade.lastBid.p);
      if (deal.take - takel >= 1 / accuracySymbol) {
        if (!realOn) {
          deal.take = takel;
          deal.countMoveTPSL = deal.countMoveTPSL + 1;
          console.log(
            "set new take virtual: " + deal.take + ", source: " + source
          );
        } else if (
          realOn &&
          dealOpen != undefined &&
          dealOpen.orderStatus == "FILLED" &&
          takeProfit != undefined &&
          takeProfit.code == undefined
        ) {
          deal.take = takel;
          deal.countMoveTPSL = deal.countMoveTPSL + 1;
          changeTake(countDealReal);
        }
      } else if (takel > deal.take && paramsTrade.closeLevelDownUp) {
        closeDealNew(
          paramDepthTrade.time,
          "closeChangeLevel",
          fullDepthTrade.lastAsk.p,
          paramsTrade.feeLimit,
          paramsTrade.feeMarket
        );
      }
    }
    stopl = getTPSL("stop", deal.direction, fullDepthTrade.lastAsk.p);
    if (deal.stop - stopl >= 1 / accuracySymbol) {
      if (!realOn) {
        deal.stop = stopl;
        console.log(
          "set new stop virtual: " + deal.stop + ", source: " + source
        );
      } else if (
        realOn &&
        dealOpen != undefined &&
        dealOpen.orderStatus == "FILLED" &&
        stopLoss != undefined &&
        stopLoss.code == undefined
      ) {
        deal.stop = stopl;
        changeStop(countDealReal);
      }
    }
  }
}

function openDealNew(sourceSignal = "") {
  if (
    deal.direction != "" ||
    paramsTrade.virtualOff ||
    paramDepthTrade == undefined ||
    (!signalLong && !signalShort)
  ) {
    return;
  }

  console.log(
    "signal from " +
      sourceSignal +
      ", " +
      Date.now() +
      ", closeAsk: " +
      fullDepthTrade.lastAsk.p +
      ", closeBid: " +
      fullDepthTrade.lastBid.p +
      ", spred: " +
      paramDepthModule.roundPlus(
        fullDepthTrade.lastAsk.p - fullDepthTrade.lastBid.p,
        accuracySymbol2
      )
  );

  stepToMaxAsk = paramDepthModule.roundPlus(
    paramDepthTrade.maxVolPriceAsk005 - fullDepthTrade.lastAsk.p,
    accuracySymbol2
  );
  stepToMaxBid = paramDepthModule.roundPlus(
    fullDepthTrade.lastBid.p - paramDepthTrade.maxVolPriceBid005,
    accuracySymbol2
  );

  if (signalLong) {
    console.log(
      "stepToMaxAsk: " +
        stepToMaxAsk +
        ", vol: " +
        paramDepthTrade.maxVolAsk005 +
        ", stepToMaxBid: " +
        stepToMaxBid +
        ", vol: " +
        paramDepthTrade.maxVolBid005
    );
    deal.direction = "long";
    deal.timeSignal = paramDepthTrade.time;
    if (paramsTrade.openForLevel) {
      deal.level = paramDepthTrade.maxVolPriceAsk005;
      deal.volLevel = paramDepthTrade.maxVolAsk005;
    } else {
      deal.level = paramDepthTrade.maxVolPriceBid005;
      deal.volLevel = paramDepthTrade.maxVolBid005;
    }

    if (paramsTrade.openOnSignalMarket) {
      deal.percentComissionOpen = paramsTrade.feeMarket;
      deal.priceOpen = fullDepthTrade.lastAsk.p;
      deal.timeOpen = paramDepthTrade.time;
      deal.fromSignalToOpen = deal.timeOpen - deal.timeSignal;
    } else if (deal.openOnSignalLimit) {
      deal.priceOpen = fullDepthTrade.lastBid.p;
    } else {
      offsetOpen = paramsTrade.offsetOpenLong / accuracySymbol;
      deal.priceOpen = paramDepthModule.roundPlus(
        fullDepthTrade.lastBid.p + offsetOpen,
        accuracySymbol2
      );
    }

    deal.stop = getTPSL("stop", deal.direction, deal.priceOpen);
    deal.take = getTPSL("take", deal.direction, fullDepthTrade.lastAsk.p);
    // console.log(
    //   "direction: " +
    //     deal.direction +
    //     ", calc stop: " +
    //     deal.stop +
    //     ", currPAsk: " +
    //     fullDepthTrade.lastAsk.p +
    //     ", currPBid: " +
    //     fullDepthTrade.lastBid.p
    // );
    // console.log(
    //   "direction: " +
    //     deal.direction +
    //     ", calc take: " +
    //     deal.take +
    //     ", currPAsk: " +
    //     fullDepthTrade.lastAsk.p +
    //     ", currPBid: " +
    //     fullDepthTrade.lastBid.p
    // );
  } else if (signalShort) {
    console.log(
      "stepToMaxAsk: " +
        stepToMaxAsk +
        ", vol: " +
        paramDepthTrade.maxVolAsk005 +
        ", stepToMaxBid: " +
        stepToMaxBid +
        ", vol: " +
        paramDepthTrade.maxVolBid005
    );
    deal.direction = "short";
    deal.timeSignal = paramDepthTrade.time;
    if (paramsTrade.openForLevel) {
      deal.level = paramDepthTrade.maxVolPriceBid005;
      deal.volLevel = paramDepthTrade.maxVolBid005;
    } else {
      deal.level = paramDepthTrade.maxVolPriceAsk005;
      deal.volLevel = paramDepthTrade.maxVolAsk005;
    }

    if (paramsTrade.openOnSignalMarket) {
      deal.percentComissionOpen = paramsTrade.feeMarket;
      deal.priceOpen = fullDepthTrade.lastBid.p;
      deal.timeOpen = paramDepthTrade.time;
      deal.fromSignalToOpen = deal.timeOpen - deal.timeSignal;
    } else if (paramsTrade.openOnSignalLimit) {
      deal.priceOpen = fullDepthTrade.lastAsk.p;
    } else {
      offsetOpen = paramsTrade.offsetOpenShort / accuracySymbol;

      deal.priceOpen = paramDepthModule.roundPlus(
        fullDepthTrade.lastAsk.p + offsetOpen,
        accuracySymbol2
      );
    }

    deal.stop = getTPSL("stop", deal.direction, deal.priceOpen);
    deal.take = getTPSL("take", deal.direction, fullDepthTrade.lastBid.p);
    // console.log(
    //   "direction: " +
    //     deal.direction +
    //     ", calc stop: " +
    //     deal.stop +
    //     ", currPAsk: " +
    //     fullDepthTrade.lastAsk.p +
    //     ", currPBid: " +
    //     fullDepthTrade.lastBid.p
    // );
    // console.log(
    //   "direction: " +
    //     deal.direction +
    //     ", calc take: " +
    //     deal.take +
    //     ", currPAsk: " +
    //     fullDepthTrade.lastAsk.p +
    //     ", currPBid: " +
    //     fullDepthTrade.lastBid.p
    // );
  }

  if (paramsTrade.openOnSignalMarket) {
    console.log("open openOnSignalMarket---------------");
    console.log(deal);
  }

  openDealReal();

  //console.log("signal -----------------------------------");
}

function getTPSL(type, direction, price) {
  if (direction == "long") {
    if (type == "take") {
      if (paramsTrade.takeStep != 0) {
        return paramDepthModule.roundPlus(
          price + paramsTrade.takeStep / accuracySymbol,
          accuracySymbol2
        );
      } else {
        return paramDepthModule.roundPlus(
          price + price * paramsTrade.take,
          accuracySymbol2
        );
      }
    } else {
      if (paramsTrade.stopStep != 0) {
        return paramDepthModule.roundPlus(
          price - paramsTrade.stopStep / accuracySymbol,
          accuracySymbol2
        );
      } else {
        return paramDepthModule.roundPlus(
          price - price * paramsTrade.stop,
          accuracySymbol2
        );
      }
    }
  } else {
    if (type == "take") {
      if (paramsTrade.takeStep != 0) {
        return paramDepthModule.roundPlus(
          price - paramsTrade.takeStep / accuracySymbol,
          accuracySymbol2
        );
      } else {
        return paramDepthModule.roundPlus(
          price - price * paramsTrade.take,
          accuracySymbol2
        );
      }
    } else {
      if (paramsTrade.stopStep != 0) {
        return paramDepthModule.roundPlus(
          price + paramsTrade.stopStep / accuracySymbol,
          accuracySymbol2
        );
      } else {
        return paramDepthModule.roundPlus(
          price + price * paramsTrade.stop,
          accuracySymbol2
        );
      }
    }
  }
}

async function openDealReal() {
  if (!realOn) {
    return false;
  }

  let leverageRes;
  if (leverage != 0) {
    leverageRes = await binance.futuresLeverage(symbol, leverage);
  }

  if (leverageRes != undefined || leverage == 0) {
    if (leverageRes != undefined) {
      console.log("leverage seted");
      console.log(leverageRes);
    }
    if (deal.direction == "long") {
      console.log("request open long, time: " + Date.now());
      //OPEN---------------------------------------
      //dealOpen = await binance.futuresMarketBuy(symbolTrade, countDealReal);
      dealOpen = await binance.futuresBuy(
        symbolTrade,
        countDealReal,
        deal.priceOpen,
        {
          timeInForce: "GTC",
        }
      );
      if (dealOpen != undefined) {
        console.log(
          "responce open long, time:  " +
            Date.now() +
            "------------------------------"
        );
        console.log(dealOpen);
      }
      //OPEN---------------------------------------
    } else {
      //OPEN---------------------------------------
      console.log("request open short, time: " + Date.now());
      //dealOpen = await binance.futuresMarketSell(symbolTrade, countDealReal);
      dealOpen = await binance.futuresSell(
        symbolTrade,
        countDealReal,
        deal.priceOpen,
        {
          timeInForce: "GTC",
        }
      );
      if (dealOpen != undefined) {
        console.log(
          "responce open short, time:  " +
            Date.now() +
            "------------------------------"
        );
        console.log(dealOpen);
      }
      //OPEN---------------------------------------
    }
  }
}

function generateParamDepthTrade() {
  paramDepthTrade = paramDepthModule.generateParamDepth(aggfullDepthTrade);
}

function appyUpdateTrade(updateDepthL, depthToUpdate) {
  // if (fullDepthTrade != undefined) {
  //   executeDepthLevel = { time: updateDepthL.E, asks: {}, bids: {} };
  //   tradeDataTrade.forEach((el) => {
  //     priceTrade = +el.p;
  //     if (el.m) {
  //       if (executeDepthLevel.bids[priceTrade] == undefined) {
  //         executeDepthLevel.bids[priceTrade] = {
  //           volLevel: fullDepthTrade[priceTrade],
  //           execVol: 0,
  //         };
  //       }
  //       executeDepthLevel.bids[priceTrade].execVol =
  //         executeDepthLevel.bids[priceTrade].execVol + Number(el.q);
  //     } else {
  //       if (executeDepthLevel.asks[priceTrade] == undefined) {
  //         executeDepthLevel.asks[priceTrade] = {
  //           volLevel: fullDepthTrade[priceTrade],
  //           execVol: 0,
  //         };
  //       }
  //       executeDepthLevel.asks[priceTrade].execVol =
  //         executeDepthLevel.asks[priceTrade].execVol + Number(el.q);
  //     }
  //   });
  // }

  fullDepthTrade.symbol = updateDepthL.s;
  fullDepthTrade.eventTime = updateDepthL.E;
  fullDepthTrade.firstId = updateDepthL.U;
  fullDepthTrade.finalId = updateDepthL.u;

  fullDepthTrade.bids = Object.assign({}, depthToUpdate.bids);
  fullDepthTrade.asks = Object.assign({}, depthToUpdate.asks);

  updateDepthL.b.forEach((el) => {
    p = el[0];
    q = Number(el[1]);
    if (q != 0) {
      fullDepthTrade.bids[p] = q;
    } else {
      delete fullDepthTrade.bids[p];
    }
  });

  updateDepthL.a.forEach((el) => {
    p = el[0];
    q = Number(el[1]);
    if (q != 0) {
      fullDepthTrade.asks[p] = q;
    } else {
      delete fullDepthTrade.asks[p];
    }
  });

  //groupe
  if (fullDepthTrade.lastAsk.p == 0) {
    levAsk = paramDepthModule.getClosestPrice("asks", fullDepthTrade);
    levBid = paramDepthModule.getClosestPrice("bids", fullDepthTrade);
    fullDepthTrade.lastAsk = {
      p: levAsk,
      q: fullDepthTrade.asks[levAsk],
    };
    fullDepthTrade.lastBid = {
      p: levBid,
      q: fullDepthTrade.bids[levBid],
    };
  }

  if (paramsTrade.roundDepthTo != 0) {
    aggfullDepthTrade = {
      symbol: updateDepthL.s,
      eventTime: updateDepthL.E,
      firstId: updateDepthL.U,
      finalId: updateDepthL.u,

      bids: {},
      asks: {},
      lastAsk: fullDepthTrade.lastAsk,
      lastBid: fullDepthTrade.lastBid,
    };
    groupeDepth();
  } else {
    aggfullDepthTrade = Object.assign({}, fullDepthTrade);
  }
}

function groupeDepth() {
  for (const prop in fullDepthTrade.asks) {
    groupeP =
      parseInt(prop * paramsTrade.roundDepthTo) / paramsTrade.roundDepthTo;
    if (aggfullDepthTrade.asks[groupeP] == undefined) {
      aggfullDepthTrade.asks[groupeP] = 0;
    }
    aggfullDepthTrade.asks[groupeP] =
      aggfullDepthTrade.asks[groupeP] + fullDepthTrade.asks[prop];
  }

  for (const prop in fullDepthTrade.bids) {
    groupeP =
      parseInt(prop * paramsTrade.roundDepthTo) / paramsTrade.roundDepthTo;
    if (aggfullDepthTrade.bids[groupeP] == undefined) {
      aggfullDepthTrade.bids[groupeP] = 0;
    }
    aggfullDepthTrade.bids[groupeP] =
      aggfullDepthTrade.bids[groupeP] + fullDepthTrade.bids[prop];
  }
}

async function setTake() {
  let leverageRes;
  recalcTake = false;

  if (leverage != 0) {
    leverageRes = await binance.futuresLeverage(symbolTrade, leverage);
  }

  if (leverageRes != undefined || leverage == 0) {
    if (deal.direction == "long") {
      deal.take = getTPSL("take", deal.direction, fullDepthTrade.lastAsk.p);
      console.log(
        "request set take: " +
          deal.take +
          ", currPAsk: " +
          fullDepthTrade.lastAsk.p +
          ", currPBid: " +
          fullDepthTrade.lastBid.p +
          ", time: " +
          Date.now()
      );
      //TAKE_PROFIT---------------------
      takeProfit = await binance.futuresSell(
        symbolTrade,
        countDealReal,
        deal.take,
        {
          timeInForce: "GTC",
          type: "TAKE_PROFIT",
          stopPrice: paramDepthModule.roundPlus(
            deal.take - 2 / accuracySymbol,
            accuracySymbol2
          ),
          priceProtect: true,
          reduceOnly: true,
        }
      );
      //TAKE_PROFIT---------------------
    } else if (deal.direction == "short") {
      deal.take = getTPSL("take", deal.direction, fullDepthTrade.lastBid.p);
      console.log(
        "request set take: " +
          deal.take +
          ", currPAsk: " +
          fullDepthTrade.lastAsk.p +
          ", currPBid: " +
          fullDepthTrade.lastBid.p +
          ", time: " +
          Date.now()
      );
      //TAKE_PROFIT---------------------
      takeProfit = await binance.futuresBuy(
        symbolTrade,
        countDealReal,
        deal.take,
        {
          timeInForce: "GTC",
          type: "TAKE_PROFIT",
          stopPrice: paramDepthModule.roundPlus(
            deal.take + 2 / accuracySymbol,
            accuracySymbol2
          ),
          priceProtect: true,
          reduceOnly: true,
        }
      );
      //TAKE_PROFIT---------------------
    }

    if (takeProfit != undefined) {
      console.log(
        "responce set take, time: " +
          Date.now() +
          "----------------------------"
      );
      console.log(takeProfit);
      if (takeProfit.code) {
        recalcTake = true;
        takeProfit = undefined;
      }
    }

    leverageRes = undefined;
  }
}

async function setStop() {
  let leverageRes;
  recalcStop = false;

  if (leverage != 0) {
    leverageRes = await binance.futuresLeverage(symbolTrade, leverage);
  }

  if (leverageRes != undefined || leverage == 0) {
    if (deal.direction == "long") {
      deal.stop = getTPSL("stop", deal.direction, fullDepthTrade.lastBid.p);
      console.log(
        "request set stop: " +
          deal.stop +
          ", currPAsk: " +
          fullDepthTrade.lastAsk.p +
          ", currPBid: " +
          fullDepthTrade.lastBid.p +
          ", time: " +
          Date.now()
      );
      //STOP LOSS--------------------------
      stopLoss = await binance.futuresSell(
        symbolTrade,
        countDealReal,
        deal.stop,
        {
          timeInForce: "GTC",
          type: "STOP",
          stopPrice: paramDepthModule.roundPlus(
            deal.stop + 2 / accuracySymbol,
            accuracySymbol2
          ),
          priceProtect: true,
          reduceOnly: true,
        }
      );
      //STOP LOSS--------------------------
    } else if (deal.direction == "short") {
      deal.stop = getTPSL("stop", deal.direction, fullDepthTrade.lastAsk.p);
      console.log(
        "request set stop: " +
          deal.stop +
          ", currPAsk: " +
          fullDepthTrade.lastAsk.p +
          ", currPBid: " +
          fullDepthTrade.lastBid.p +
          ", time: " +
          Date.now()
      );
      //STOP LOSS--------------------------
      stopLoss = await binance.futuresBuy(
        symbolTrade,
        countDealReal,
        deal.stop,
        {
          timeInForce: "GTC",
          type: "STOP",
          stopPrice: paramDepthModule.roundPlus(
            deal.stop - 2 / accuracySymbol,
            accuracySymbol2
          ),
          priceProtect: true,
          reduceOnly: true,
        }
      );
      //STOP LOSS--------------------------
    }

    if (stopLoss != undefined) {
      console.log(
        "responce set stop, time: " +
          Date.now() +
          "----------------------------"
      );
      console.log(stopLoss);
      if (stopLoss.code) {
        stopLoss = undefined;
        recalcStop = true;
      }
    }

    leverageRes = undefined;
  }
}

function execution_update(data) {
  if (
    dealOpen != undefined &&
    data.order != undefined &&
    dealOpen.orderId == data.order.orderId &&
    data.order.orderStatus == "FILLED"
  ) {
    dealOpen = data.order;
    priceOpen = Number(data.order.averagePrice);

    console.log(
      "executed main order, direction: " +
        deal.direction +
        ", priceOpen real: " +
        priceOpen +
        ", price open culc: " +
        deal.priceOpen +
        ", diff%: " +
        ((priceOpen - deal.priceOpen) / deal.priceOpen) * 100 +
        ", time: " +
        Date.now()
    );
    setStop();
    setTake();

    updateTotalInfoOpen(data.order);
  }

  if (
    takeProfit != undefined &&
    data.order != undefined &&
    takeProfit.orderId == data.order.orderId &&
    data.order.orderStatus == "FILLED"
  ) {
    console.log("execute take, time: " + Date.now());
    console.log(data.order);

    binance.futuresCancelAll(symbolTrade).then(() => {
      dealOpen = undefined;
      stopLoss = undefined;
      takeProfit = undefined;
      resetDeal();
      updateTotalInfoClose(data.order);
      console.log(totalReal);
      console.log("reset virtual deal, start to find new point");
    });
  }

  if (
    stopLoss != undefined &&
    data.order != undefined &&
    stopLoss.orderId == data.order.orderId &&
    data.order.orderStatus == "FILLED"
  ) {
    console.log("execute stop, delete all, time: " + Date.now());
    console.log(data.order);

    binance.futuresCancelAll(symbolTrade).then(() => {
      dealOpen = undefined;
      stopLoss = undefined;
      takeProfit = undefined;
      resetDeal();
      updateTotalInfoClose(data.order);
      console.log(totalReal);
      console.log("reset virtual deal, start to find new point");
    });
  }
}

async function changeStop(count, changeAny = false) {
  let leverageRes;
  if (leverage != 0) {
    leverageRes = await binance.futuresLeverage(symbolTrade, leverage);
  }

  if (leverageRes != undefined || leverage == 0) {
    console.log("request cansel stop, time: " + Date.now());
    console.log(
      "currPAsk: " +
        fullDepthTrade.lastAsk.p +
        ", currPBid: " +
        fullDepthTrade.lastBid.p +
        ", time: " +
        Date.now()
    );
    stopOrderId = stopLoss.orderId;
    stopLoss = undefined;
    stopCancel = await binance.futuresCancel(symbolTrade, {
      orderId: stopOrderId,
    });
    if (stopCancel != undefined) {
      console.log("responce cansel stop, time: " + Date.now());
      if (deal.direction == "long") {
        stopl = getTPSL("stop", deal.direction, fullDepthTrade.lastBid.p);
        if (stopl > deal.stop || changeAny) {
          deal.stop = stopl;
        }

        console.log(
          "request set new stop: " +
            deal.stop +
            ", currPAsk: " +
            fullDepthTrade.lastAsk.p +
            ", currPBid: " +
            fullDepthTrade.lastBid.p +
            ", time: " +
            Date.now()
        );
        stopLoss = await binance.futuresSell(symbolTrade, count, deal.stop, {
          timeInForce: "GTC",
          type: "STOP",
          stopPrice: paramDepthModule.roundPlus(
            deal.stop + 2 / accuracySymbol,
            accuracySymbol2
          ),
          priceProtect: true,
          reduceOnly: true,
        });
      } else if (deal.direction == "short") {
        stopl = getTPSL("stop", deal.direction, fullDepthTrade.lastAsk.p);
        if (stopl < deal.stop || changeAny) {
          deal.stop = stopl;
        }

        console.log(
          "request set new stop: " +
            deal.stop +
            ", currPAsk: " +
            fullDepthTrade.lastAsk.p +
            ", currPBid: " +
            fullDepthTrade.lastBid.p +
            ", time: " +
            Date.now()
        );
        stopLoss = await binance.futuresBuy(symbolTrade, count, deal.stop, {
          timeInForce: "GTC",
          type: "STOP",
          stopPrice: paramDepthModule.roundPlus(
            deal.stop - 2 / accuracySymbol,
            accuracySymbol2
          ),
          priceProtect: true,
          reduceOnly: true,
        });
      }

      if (stopLoss != undefined) {
        console.log("responce set new stop, time: " + Date.now());
        console.log(stopLoss);
        if (stopLoss.code) {
          stopLoss = undefined;
          recalcStop = true;
        }
      }
    }
  }
}

async function changeTake(count) {
  let leverageRes;

  if (leverage != 0) {
    leverageRes = await binance.futuresLeverage(symbolTrade, leverage);
  }

  if (leverageRes != undefined || leverage == 0) {
    console.log("request cansel take, time: " + Date.now());
    console.log(
      "currPAsk: " +
        fullDepthTrade.lastAsk.p +
        ", currPBid: " +
        fullDepthTrade.lastBid.p +
        ", time: " +
        Date.now()
    );
    takeOrderId = takeProfit.orderId;
    takeProfit = undefined;
    takeCancel = await binance.futuresCancel(symbolTrade, {
      orderId: takeOrderId,
    });
    if (takeCancel != undefined) {
      console.log("responce cansel take, time: " + Date.now());

      if (deal.direction == "long") {
        talel = getTPSL("take", deal.direction, fullDepthTrade.lastAsk.p);
        if (takel > deal.take) {
          deal.take = takel;
        }

        console.log(
          "request set new take: " +
            deal.take +
            ", currPAsk: " +
            fullDepthTrade.lastAsk.p +
            ", currPBid: " +
            fullDepthTrade.lastBid.p +
            ", time: " +
            Date.now()
        );
        takeProfit = await binance.futuresSell(symbolTrade, count, deal.take, {
          timeInForce: "GTC",
          type: "TAKE_PROFIT",
          stopPrice: paramDepthModule.roundPlus(
            deal.take - 2 / accuracySymbol,
            accuracySymbol2
          ),
          priceProtect: true,
          reduceOnly: true,
        });
      } else if (deal.direction == "short") {
        takel = getTPSL("take", deal.direction, fullDepthTrade.lastBid.p);
        if (takel < deal.take) {
          deal.take = takel;
        }

        console.log(
          "request set new take: " +
            deal.take +
            ", currPAsk: " +
            fullDepthTrade.lastAsk.p +
            ", currPBid: " +
            fullDepthTrade.lastBid.p +
            ", time: " +
            Date.now()
        );
        takeProfit = await binance.futuresBuy(symbolTrade, count, deal.take, {
          timeInForce: "GTC",
          type: "TAKE_PROFIT",
          stopPrice: paramDepthModule.roundPlus(
            deal.take + 2 / accuracySymbol,
            accuracySymbol2
          ),
          priceProtect: true,
          reduceOnly: true,
        });
      }

      if (takeProfit != undefined) {
        console.log("responce set new take, time: " + Date.now());
        console.log(takeProfit);
        if (takeProfit.code) {
          takeProfit = undefined;
          recalcTake = true;
        }
      }
    }
  }
}

function updateTotalInfoClose(order) {
  //TOTAL---------------------
  totalReal.countDeals++;
  totalReal.sumCloseUSDT += paramDepthModule.roundPlus(
    Number(order.originalQuantity) * Number(order.originalPrice)
  );
  if (order.commissionAsset == "BNB") {
    totalReal.comissionCloseBNB += Number(order.commission);
  } else {
    totalReal.comissionCloseUSDT += Number(order.commission);
  }
  totalReal.totalRealizedProfit += Number(order.realizedProfit);
  //TOTAL----------------------
}

function updateTotalInfoOpen(order) {
  //TOTAL---------------------
  totalReal.sumOpenUSDT += paramDepthModule.roundPlus(
    Number(order.originalQuantity) * Number(order.originalPrice)
  );
  if (order.commissionAsset == "BNB") {
    totalReal.comissionOpenBNB += Number(order.commission);
  } else {
    totalReal.comissionOpenUSDT += Number(order.commission);
  }
  //TOTAL----------------------
}

function balance_update(data) {}

function margin_call_callback(data) {}

async function binanceInfo() {
  info = { minBuySell: 0, minNotional: 0 };

  res = await binance.futuresExchangeInfo();
  if (res != undefined) {
    res.symbols.forEach((symb) => {
      if (symb.symbol == symbolTrade) {
        symb.filters.forEach((filter) => {
          if (filter.filterType == "PRICE_FILTER") {
            info.minBuySell = filter.tickSize;
          }
          if (filter.filterType == "MIN_NOTIONAL") {
            info.minNotional = filter.notional;
          }
        });
      }
    });
  }
  //console.log(info);
}

function start() {
  startRedis();
  binanceInfo();

  resetDeal();
  startTime = Date.now();
  d = new Date(startTime);
  t = d.toLocaleString().replace(/, /g, ":");
  if (!startScript) {
    console.log("start script: " + t);
    startScript = true;
  }

  binance.futuresSubscribe(
    [
      symbolTrade.toLowerCase() + "@depth@100ms",
      symbolTrade.toLowerCase() + "@trade",
      symbolTrade.toLowerCase() + "@bookTicker",
    ],
    (data) => {
      if (data.e == "depthUpdate") {
        processDepthDataTrade(data);
      }
      if (data.e == "trade") {
        processTradeDataTrade(data);
      }
      if (data.e == "bookTicker") {
        processLastBidAsk(data);
      }
    }
  );

  if (realOn) {
    binance.websockets.userFutureData(
      margin_call_callback,
      balance_update,
      execution_update
    );
  }
}
async function startRedis() {
  const client = redis.createClient();

  const subscriber = client.duplicate();

  await subscriber.connect();

  await subscriber.subscribe("actions", (message) => {
    console.log(new Date().getTime());
    console.log(message); // 'message'
    console.log(
      deal.direction,
      paramDepthTrade,
      paramsTrade.setSignalFromTrade
    ); // 'message'

    if (deal.direction != "" || paramDepthTrade == undefined) {
      return;
    }
    if (message == "long") {
      signalLong = true;
    }
    if (message == "short") {
      signalShort = true;
    }
    if (signalLong || signalShort) {
      openDealNew("redis");
    }
    console.log(signalLong, signalShort);
  });
}

const noop = () => {};
start();
