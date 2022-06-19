let paramDepthModule = require("./param_depth_module");
let paramModule = require("./param_module");

let getCurrentDealObj = function getCurrentDealObj() {
  return {
    direction: "",
    real: false,
    timeOpen: 0,
    timeClose: 0,
    timeOpenH: "",
    timeCloseH: "",
    priceOpen: 0,
    priceToCheck: 0,
    priceClose: 0,
    sumOpen: 0,
    countOpen: 0,
    countStock: 0,
    profit: 0,
    percent: 0,
    maxPriceOnDirection: 0,
    minPriceOnDirection: 0,
    percentFromMaxPriceOnDirection: 0,
    percentDynamic: 0,
    paramSet: "",
    paramSets: [],
    paramsOfParamSet: [],
    paramOpen: {},
    countMatch: 0,
    fixTakeProfit: 0,
    stopPrice: 0,
    stopPriceSignalSymbol: 0,
    levelOpen: 0,
    volFromStart_Ask: 0,
    volFromStart_Bid: 0,
    stopAutoClose: false,
  };
};

let openDeal = function openDeal(
  analazeDepth,
  paramDepth,
  direction,
  sumOpen,
  percentDynamic,
  real = false,
  paramSet = "",
  paramSets = [],
  paramsOfParamSet = "",
  countMatch = 0,
  fixTakeProfit = 0,
  stopPrice = 0,
  openPrice = 0
) {
  currDeal = getCurrentDealObj();

  currDeal.direction = direction;
  currDeal.timeOpen = analazeDepth.eventTimeAfter;
  d = new Date(currDeal.timeOpen);
  currDeal.timeOpenH = d.toLocaleString().replace(/, /g, ":");
  currDeal.percentDynamic = percentDynamic;
  currDeal.real = real;
  currDeal.paramSet = paramSet;
  currDeal.paramSets = paramSets;
  currDeal.paramsOfParamSet = paramsOfParamSet;
  currDeal.countMatch = countMatch;
  currDeal.sumOpen = sumOpen;
  currDeal.stopPrice = stopPrice;

  if (fixTakeProfit != 0) {
    currDeal.fixTakeProfit = fixTakeProfit;
  }

  if (direction == "short") {
    currDeal.priceOpen = analazeDepth.closestPriceBids;
    currDeal.maxPriceOnDirection = analazeDepth.closestPriceAsks;
    currDeal.minPriceOnDirection = analazeDepth.closestPriceAsks;
  } else {
    currDeal.priceOpen = analazeDepth.closestPriceAsks;
    currDeal.maxPriceOnDirection = analazeDepth.closestPriceBids;
    currDeal.minPriceOnDirection = analazeDepth.closestPriceBids;
  }
  if (openPrice != 0) {
    currDeal.priceOpen = openPrice;
  }
  currDeal.priceToCheck = currDeal.priceOpen;
  currDeal.countOpen = currDeal.sumOpen / currDeal.priceOpen;
  currDeal.countStock = currDeal.countOpen;
  currDeal.paramOpen = Object.assign({}, paramDepth);
  return currDeal;
};

let checkOpenRealDeal = function checkOpenRealDeal(
  percentDynamic,
  dealsHistoryPair,
  paramDepth,
  analazeDepth,
  paramToCheck,
  arrParamDepth,
  sumOpen
) {
  //console.time("finedDealsOnParam");
  paramsArr = paramModule.getParams(arrParamDepth);
  let dealsOnParam = findDealsOnParams(
    paramsArr,
    dealsHistoryPair,
    paramDepth,
    arrParamDepth
  );
  //console.timeEnd("finedDealsOnParam");

  if (dealsOnParam.length == 0) {
    //console.log("Deals on param not exist");
    return getCurrentDealObj();
  }

  //dealsOnParam.sort((a, b) => a.deal.timeOpen - a.deal.timeOpen);
  // fitlerMatch = dealsOnParam.filter((value) => value.matchPrev.length > 0);

  // if (fitlerMatch.length == 0) {
  //   //console.log("deals not exist after filter");
  //   return getCurrentDealObj();
  // }

  console.log(
    "dealsOnParam count--" +
      dealsOnParam.length +
      "-----------------------------------------------------------"
  );
  console.log(dealsOnParam.length);

  //console.time("sortByCountParam");
  sortByCountParam = dealsOnParam.sort((a, b) => {
    b.countMatch - a.countMatch;
  });
  // sortByMatchPrev = fitlerMatch.sort(
  //   (a, b) => b.matchPrev.length - a.matchPrev.length
  // );
  // sortByWeight = dealsOnParam.sort((a, b) => {
  //   b.weight - a.weight;
  // });

  //console.timeEnd("sortByCountParam");
  maxCountParam = sortByCountParam[0].countMatch;
  //maxCountMatchPrev = sortByMatchPrev[0].matchPrev.length;

  // if (maxCountMatchPrev < 10) {
  //   //console.log("deals not exist after filter");
  //   return getCurrentDealObj();
  // }

  // console.log("deals with profit:");
  // paramsDeals = {time: paramDepth.time};
  // dealsOnParam.forEach(el => {
  //   el.param.forEach(e => {
  //     paramsDeals[e.paramName] = paramDepth[e.paramName];
  //   });

  //   if (el.deal.profit > 0) {
  //     logObjectWithObject(el.deal);
  //     unprofit = dealsOnParam.filter((value) => value.deal.direction == el.deal.direction && value.deal.profit < 0);
  //     if (unprofit.length) {
  //       logObjectWithObject(unprofit[0].deal);
  //     }

  //   }
  // });

  // console.log('param current from match deals-------------------------------------');
  // console.log(paramsDeals);
  // filterMaxMatchPrev = sortByMatchPrev.filter(
  //   (value) => value.matchPrev.length == maxCountMatchPrev
  // );
  //--------------------------------------------------------
  // filterMaxMatchPrev = [];
  // for (step = 0; step < 5000; step++) {
  //   if (sortByMatchPrev[step].matchPrev.length == maxCountMatchPrev) {
  //     filterMaxMatchPrev.push(sortByMatchPrev[step]);
  //   } else {
  //     break;
  //   }
  // }

  profitLong = 0;
  profitShort = 0;
  count = 0;

  // filterMaxMatchPrev.forEach((point) => {
  //   point.deals.forEach((dealElement) => {
  //     if (dealElement.direction == "long") {
  //       profitLong = profitLong + dealElement.profit;
  //     } else if (dealElement.direction == "short") {
  //       profitShort = profitShort + dealElement.profit;
  //     }
  //     count = count + 1;
  //   });
  // });
  //------------------------------------------------
  //paramSets = [];
  //prepareLong = [];
  //prepareShort = [];
  //console.time("findMaxOnParamCount");
  for (step = 0; step < sortByCountParam.length; step++) {
    if (sortByCountParam[step].countMatch < maxCountParam) {
      break;
    }

    minPercent = 1;
    sortByCountParam[step].deals.forEach((elDeal) => {
      if (elDeal.profit > 0) {
        if (elDeal.percent < minPercent) {
          minPercent = elDeal.percent;
        }
        console.log(
          "time: " +
            elDeal.timeOpenH +
            ", timeCloseH: " +
            elDeal.timeCloseH +
            ", direction: " +
            elDeal.direction +
            ", percentFromMaxPriceOnDirection: " +
            elDeal.percentFromMaxPriceOnDirection +
            ", profit: " +
            elDeal.profit +
            ", percent: " +
            elDeal.percent
        );
      }

      if (
        elDeal.direction == "long"
        //&& sortByCountParam[step].deal.percent > 0
      ) {
        profitLong = profitLong + elDeal.percent;
        //prepareLong.push(sortByCountParam[step]);
      } else if (
        elDeal.direction == "short"
        //&& sortByCountParam[step].deal.percent > 0
      ) {
        //prepareShort.push(sortByCountParam[step]);
        profitShort = profitShort + elDeal.percent;
      }
      count = count + 1;
    });

    //paramSets.push(sortByCountParam[step].param);
  }
  //console.timeEnd("findMaxOnParamCount");

  //paramUseForLong = paramsArr.filter((value) => value.paramName == sortByCountParam[0].param[0].paramName)[0].useForLong;

  console.log("time: " + paramDepth.time);
  //console.log("maxCountMatchPrev: " + maxCountMatchPrev);
  console.log("profit long: " + profitLong);
  console.log("profit short:" + profitShort);
  console.log("count deals: " + count);
  // if (filterMaxMatchPrev.length) {
  //   console.log("count params: " + filterMaxMatchPrev[0].param.length);
  // }
  console.log("count params: " + maxCountParam);
  console.log("close price sell: " + paramDepth.closePriceBid);
  console.log("close price buy: " + paramDepth.closePriceAsk);

  dealsHistoryProfitLong = 0;
  dealsHistoryProfitShort = 0;
  for (const prop in dealsHistoryPair) {
    dealsHistoryPair[prop].forEach((el) => {
      if (el.direction == "long" && el.profit > 0) {
        dealsHistoryProfitLong = dealsHistoryProfitLong + 1;
      } else if (el.direction == "short" && el.profit > 0) {
        dealsHistoryProfitShort = dealsHistoryProfitShort + 1;
      }
    });
  }

  console.log("count long: " + dealsHistoryProfitLong);
  console.log("count short: " + dealsHistoryProfitShort);

  // console.log("sd10_lastPriceBuy: " + paramDepth.sd10_lastPriceBuy);
  // console.log("sd20_lastPriceBuy: " + paramDepth.sd20_lastPriceBuy);
  // console.log("sd100_lastPriceBuy: " + paramDepth.sd100_lastPriceBuy);
  // console.log("sd200_lastPriceBuy: " + paramDepth.sd200_lastPriceBuy);

  // long = dealsHistoryProfitLong > dealsHistoryProfitShort;

  if (
    //maxOnLong.profitLong > maxOnShort.profitShort &&
    //maxOnLong.profitLong > 0
    // pl > psh &&
    // pl > 0
    profitLong > profitShort &&
    profitLong > 0
    //&&long
    //&& paramUseForLong
  ) {
    return openDeal(
      analazeDepth,
      paramDepth,
      "long",
      //'short',
      sumOpen,
      percentDynamic,
      true,
      //maxOnLong.paramSet
      //filterMaxMatchPrev[0].paramSet,
      sortByCountParam[0].paramSet,
      [],
      //filterMaxMatchPrev[0].param,
      sortByCountParam[0].param,
      count
    );
  } else if (
    //maxOnShort.profitShort > maxOnLong.profitLong &&
    //maxOnShort.profitShort > 0
    // psh > pl &&
    // psh > 0
    profitShort > profitLong &&
    profitShort > 0
    //&& !long
    //&& !paramUseForLong
  ) {
    return openDeal(
      analazeDepth,
      paramDepth,
      "short",
      //'long',
      sumOpen,
      percentDynamic,
      true,
      //maxOnShort.paramSet
      //filterMaxMatchPrev[0].paramSet,
      sortByCountParam[0].paramSet,
      [],
      //filterMaxMatchPrev[0].param,
      sortByCountParam[0].param,
      count
    );
    //return getCurrentDealObj();
  } else {
    return getCurrentDealObj();
  }
  // console.log("groupeByParamSet------------------------------------------------------------------");
  // console.log(groupeByParamSet);
};

function findDealsOnParams(
  params,
  dealsHistoryPair,
  paramDepth,
  arrParamDepth
) {
  findedDeals = [];

  //keysSorted = Object.keys(dealsHistoryPair).sort((a, b) => b - a);
  for (const prop in dealsHistoryPair) {
    matchObjMain = matchDeal(params, paramDepth, dealsHistoryPair[prop][0]);

    // if (matchObjMain != -1) {
    //   currentIndex = keysSorted.indexOf(prop);

    //   for (step = 1; step < 11; step++) {
    //     prevPointTime = keysSorted[currentIndex + step*10];

    //     if (prevPointTime != undefined) {
    //       matchObjPrev = matchDeal(
    //         params,
    //         arrParamDepth[step*10],
    //         dealsHistoryPair[prevPointTime][0]
    //       );
    //       if (matchObjPrev != -1) {
    //         matchObjPrev.deals = dealsHistoryPair[prevPointTime].slice();
    //         matchObjMain.matchPrev.push(matchObjPrev);
    //       } else {
    //         break;
    //       }
    //     }
    //   }
    // }

    if (matchObjMain != -1) {
      matchObjMain.deals = dealsHistoryPair[prop].slice();
      findedDeals.push(matchObjMain);
    }
  }

  return findedDeals;
}

function matchDeal(params, paramDepth, elDealHistory) {
  matchObj = {
    deals: [],
    paramSet: "",
    param: [],
    countMatch: 0,
    weight: 0,
    matchPrev: [],
  };

  params.forEach((paramGroupe) => {
    paramGroupe.paramsInclude.forEach((paramObj) => {
      checkDealOnParam(paramObj, elDealHistory, matchObj, paramDepth);
    });
  });

  //related in groupe
  countRequireGroupeMatch = 0;
  countRequireGroupe = 0;
  params.forEach((paramGroupe) => {
    if (paramGroupe.require) {
      countRequireGroupe = countRequireGroupe + 1;

      countMatchInGroupe = 0;
      paramGroupe.paramsInclude.forEach((paramEl) => {
        if (
          matchObj.param.filter((value) => value.paramName == paramEl.paramName)
            .length
        ) {
          if (
            paramEl.ralatedMatch != undefined &&
            paramEl.ralatedMatch.length != 0
          ) {
            countRelatedParamsMatch = 0;
            paramEl.ralatedMatch.forEach((elRelatedMatch) => {
              if (
                matchObj.param.filter(
                  (value) => value.paramName == elRelatedMatch
                ).length
              ) {
                countRelatedParamsMatch = countRelatedParamsMatch + 1;
              }
            });
            if (paramEl.ralatedMatch.length == countRelatedParamsMatch) {
              countMatchInGroupe = countMatchInGroupe + 1;
            }
          } else {
            countMatchInGroupe = countMatchInGroupe + 1;
          }
        }
      });

      if (paramGroupe.minMatch <= countMatchInGroupe) {
        countRequireGroupeMatch = countRequireGroupeMatch + 1;
      }
    }
  });

  if (
    matchObj.countMatch >= 1 &&
    countRequireGroupeMatch >= countRequireGroupe
  ) {
    matchObj.deal = Object.assign({}, elDealHistory);
    return matchObj;
  } else {
    return -1;
  }
}

function checkDealOnParam(paramObj, elDealHistory, matchObj, paramDepth) {
  valueFromDeal = elDealHistory.paramOpen[paramObj.paramName];
  valueFromCurrent = paramDepth[paramObj.paramName];

  if (
    paramDepth[paramObj.filterField] == undefined ||
    paramDepth[paramObj.filterField] != paramObj.filterValue
  ) {
    if (paramObj.state3 && valueFromDeal == valueFromCurrent) {
      matchObj.paramSet = matchObj.paramSet + paramObj.paramName + "_";
      matchObj.countMatch = matchObj.countMatch + 1;
      matchObj.param.push({ paramName: paramObj.paramName, related: [] });
      //matchObj.weight = matchObj.weight + paramObj.weight;
    } else if (
      !paramObj.state3 &&
      paramObj.relatedParams != undefined &&
      paramObj.relatedParams.length != 0 &&
      valueFromCurrent <= paramObj.valueToSwithRelated
    ) {
      processRelatedParam(paramObj, elDealHistory, paramDepth, matchObj);
    } else if (
      !paramObj.state3 &&
      (valueFromDeal == valueFromCurrent ||
        //checkParamOnPercent(valueFromDeal, valueFromCurrent, paramObj) ||
        checkParamOnValue(valueFromDeal, valueFromCurrent, paramObj))
    ) {
      matchObj.paramSet = matchObj.paramSet + paramObj.paramName + "_";
      matchObj.countMatch = matchObj.countMatch + 1;
      matchObj.param.push({ paramName: paramObj.paramName, related: [] });
      //matchObj.weight = matchObj.weight + paramObj.weight;
    }
  }
}

let getPairedDeals = function getPairedDeals(dealsHistory, onlyProfit) {
  dealFilter = {};
  for (const prop in dealsHistory) {
    if (dealsHistory[prop].length == 2) {
      if (
        (onlyProfit &&
          dealsHistory[prop].filter((value) => value.profit > 0).length) ||
        !onlyProfit
      ) {
        dealFilter[prop] = dealsHistory[prop].slice();
      }
    }
  }
  return dealFilter;
};

function checkParamOnPercent(valueFromDeal, valueFromCurrent, paramObj) {
  if (paramObj.percentChange == undefined || paramObj.percentChange == -1) {
    return false;
  }
  if (
    (valueFromDeal > valueFromCurrent &&
      valueFromCurrent != 0 &&
      (valueFromDeal - valueFromCurrent) / valueFromCurrent <
        paramObj.percentChange) ||
    (valueFromDeal < valueFromCurrent &&
      valueFromDeal != 0 &&
      (valueFromCurrent - valueFromDeal) / valueFromDeal <
        paramObj.percentChange)
  ) {
    return true;
  } else {
    return false;
  }
}

function checkParamOnValue(valueFromDeal, valueFromCurrent, paramObj) {
  if (
    paramObj.valueChange != undefined &&
    paramObj.valueChange != -1 &&
    Math.abs(valueFromDeal - valueFromCurrent) < paramObj.valueChange
  ) {
    return true;
  } else {
    return false;
  }
}

function processRelatedParam(paramObj, elDealHistory, paramDepth, matchObj) {
  arrRelatedMatch = [];
  paramObj.relatedParams.forEach((relatedParam) => {
    valueFromDealR = elDealHistory.paramOpen[relatedParam.paramName];
    valueFromCurrentR = paramDepth[relatedParam.paramName];
    if (
      valueFromDealR == valueFromCurrentR ||
      checkParamOnPercent(valueFromDealR, valueFromCurrentR, paramObj) ||
      checkParamOnValue(valueFromDealR, valueFromCurrentR, paramObj)
    ) {
      arrRelatedMatch.push(relatedParam);
    }
  });

  if (arrRelatedMatch.length >= paramObj.minRelatedMatch) {
    arrRelatedMatch.forEach((rp) => {
      matchObj.paramSet = matchObj.paramSet + rp.paramName + "_";
      matchObj.countMatch = matchObj.countMatch + 1;
      matchObj.weight = matchObj.weight + rp.weight;
    });
    matchObj.param.push({
      paramName: paramObj.paramName,
      related: arrRelatedMatch,
    });
  }
}

let checkCloseDeal = function checkCloseDeal(
  analazeDepth,
  deal,
  //volToDownPercent,
  //limitPercentDown,
  stopPercent,
  fixTakeProfit,
  closeNow,
  show,
  countPercentToClose,
  updatePriceToCheck,
  priceClose = 0
) {
  if (deal.fixTakeProfit != 0) {
    locFixTakeProfit = deal.fixTakeProfit;
  } else {
    locFixTakeProfit = fixTakeProfit;
  }

  if (deal.direction == "short") {
    percentUp =
      (analazeDepth.closestPriceAsks - deal.maxPriceOnDirection) /
      deal.maxPriceOnDirection;
    percentUpFromOpen =
      (analazeDepth.closestPriceAsks - deal.priceToCheck) / deal.priceToCheck;
    percentDown =
      (deal.priceToCheck - analazeDepth.closestPriceAsks) /
      analazeDepth.closestPriceAsks;

    if (
      percentUp > deal.percentDynamic ||
      percentUpFromOpen > stopPercent ||
      percentDown > locFixTakeProfit ||
      (analazeDepth.closestPriceAsks >= deal.stopPrice &&
        deal.stopPrice != 0) ||
      closeNow
    ) {
      closeAll = false;
      if (percentUpFromOpen > stopPercent) {
        closeAll = true;
      }
      if (updatePriceToCheck && percentDown > locFixTakeProfit) {
        deal.priceToCheck = analazeDepth.closestPriceBids;
      }
      deal = closeDeal(
        deal,
        analazeDepth,
        false,
        countPercentToClose,
        closeAll,
        priceClose
      );
    }
  } else {
    percentDown =
      (deal.maxPriceOnDirection - analazeDepth.closestPriceBids) /
      analazeDepth.closestPriceBids;
    percentDownFromOpen =
      (deal.priceToCheck - analazeDepth.closestPriceBids) /
      analazeDepth.closestPriceBids;
    percentUpFromOpen =
      (analazeDepth.closestPriceBids - deal.priceToCheck) / deal.priceToCheck;

    if (
      percentDown > deal.percentDynamic ||
      percentDownFromOpen > stopPercent ||
      percentUpFromOpen > locFixTakeProfit ||
      (analazeDepth.closestPriceBids <= deal.stopPrice &&
        deal.stopPrice != 0) ||
      closeNow
    ) {
      closeAll = false;
      if (percentDownFromOpen > stopPercent) {
        closeAll = true;
      }
      if (updatePriceToCheck && percentUpFromOpen > locFixTakeProfit) {
        deal.priceToCheck = analazeDepth.closestPriceAsks;
      }
      deal = closeDeal(
        deal,
        analazeDepth,
        false,
        countPercentToClose,
        closeAll,
        priceClose
      );
    }
  }

  updateMaxPrice(deal, analazeDepth);

  if (deal.timeClose != 0 && show) {
    logObjectWithObject(deal);
    logDealInfo(deal);
  }

  return deal;

  //downPercent(volToDownPercent, limitPercentDown);
};

function logDealInfo(deal) {
  if (deal.direction == "long") {
    console.log(
      "undirection move percent:" +
        (deal.priceOpen - deal.minPriceOnDirection) / deal.minPriceOnDirection
    );
    console.log(
      "direction move percent:" +
        (deal.maxPriceOnDirection - deal.priceOpen) / deal.maxPriceOnDirection
    );
  } else {
    console.log(
      "undirection move percent:" +
        (deal.minPriceOnDirection - deal.priceOpen) / deal.priceOpen
    );
    console.log(
      "direction move percent:" +
        (deal.priceOpen - deal.maxPriceOnDirection) / deal.maxPriceOnDirection
    );
  }
  console.log("profit: " + deal.profit + ", percent: " + deal.percent);
}

let updateMaxPrice = function updateMaxPrice(deal, analazeDepth) {
  if (deal.direction == "short") {
    if (analazeDepth.closestPriceAsks < deal.maxPriceOnDirection) {
      deal.maxPriceOnDirection = analazeDepth.closestPriceAsks;
    }
    if (analazeDepth.closestPriceAsks > deal.minPriceOnDirection) {
      deal.minPriceOnDirection = analazeDepth.closestPriceAsks;
    }
    percentFrom =
      (analazeDepth.closestPriceAsks - deal.maxPriceOnDirection) /
      deal.maxPriceOnDirection;
    if (deal.percentFromMaxPriceOnDirection < percentFrom) {
      deal.percentFromMaxPriceOnDirection = paramDepthModule.roundPlus(
        percentFrom,
        6
      );
    }
  } else {
    if (analazeDepth.closestPriceBids > deal.maxPriceOnDirection) {
      deal.maxPriceOnDirection = analazeDepth.closestPriceBids;
    }
    if (analazeDepth.closestPriceBids < deal.minPriceOnDirection) {
      deal.minPriceOnDirection = analazeDepth.closestPriceBids;
    }
    percentFrom =
      (deal.maxPriceOnDirection - analazeDepth.closestPriceBids) /
      analazeDepth.closestPriceBids;
    if (deal.percentFromMaxPriceOnDirection < percentFrom) {
      deal.percentFromMaxPriceOnDirection = paramDepthModule.roundPlus(
        percentFrom,
        6
      );
    }
  }
};

let closeDeal = function closeDeal(
  deal,
  analazeDepth,
  checkProfit = false,
  countPercentToClose = 1,
  closeAll = false,
  priceClose
) {
  if (!checkProfit) {
    deal.timeClose = analazeDepth.eventTimeAfter;
    d = new Date(deal.timeClose);
    deal.timeCloseH = d.toLocaleString().replace(/, /g, ":");
  }

  if (deal.direction == "short") {
    deal.priceClose = analazeDepth.closestPriceAsks;

    if (priceClose != 0) {
      deal.priceClose = priceClose;
    }
    // if (deal.stopPrice != 0) {
    //   deal.priceClose = deal.stopPrice;
    // }
    if (deal.priceClose >= deal.stopPrice && deal.stopPrice != 0) {
      closeAll = true;
    }
  } else {
    deal.priceClose = analazeDepth.closestPriceBids;
    if (priceClose != 0) {
      deal.priceClose = priceClose;
    }
    // if (deal.stopPrice != 0) {
    //   deal.priceClose = deal.stopPrice;
    // }
    if (deal.priceClose <= deal.stopPrice && deal.stopPrice != 0) {
      closeAll = true;
    }
  }

  let countDeal = deal.countOpen * countPercentToClose;
  if (countDeal > deal.countStock || closeAll) {
    countDeal = deal.countStock;
  }
  deal.countStock = paramDepthModule.roundPlus(deal.countStock - countDeal, 5);
  let sumClose = countDeal * deal.priceClose;
  let sumOpen = countDeal * deal.priceOpen;
  let comission = sumOpen * 0.00018 + sumClose * 0.00018;

  if (deal.direction == "short") {
    deal.profit = paramDepthModule.roundPlus(sumOpen - sumClose - comission, 5);
    deal.percent = paramDepthModule.roundPlus(deal.profit / sumClose, 5);
  } else {
    deal.profit = paramDepthModule.roundPlus(sumClose - sumOpen - comission, 5);
    deal.percent = paramDepthModule.roundPlus(deal.profit / sumOpen, 5);
  }

  return deal;

  //balance = balance + currentDeal.profit;
};

let logObjectWithObject = function logObjectWithObject(deal) {
  stringToLog = "";
  for (const prop in deal) {
    if (typeof deal[prop] == "object") {
      stringToLog = stringToLog + ",";
      for (const prop2 in deal[prop]) {
        stringToLog = stringToLog + deal[prop][prop2] + ",";
      }
    } else {
      stringToLog = stringToLog + deal[prop] + ",";
    }
  }
  console.log(stringToLog);
};

module.exports.openDeal = openDeal;
module.exports.getCurrentDealObj = getCurrentDealObj;
module.exports.checkOpenRealDeal = checkOpenRealDeal;
module.exports.checkCloseDeal = checkCloseDeal;
module.exports.getPairedDeals = getPairedDeals;
module.exports.closeDeal = closeDeal;
module.exports.logObjectWithObject = logObjectWithObject;
module.exports.updateMaxPrice = updateMaxPrice;
