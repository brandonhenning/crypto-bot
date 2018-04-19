const express = require('express')
const port = process.env.PORT || 3000
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const app = express()
const queries = require('./queries/queries')
const pg = require('./knexfile')
const crypto = require('crypto')
const quoteUrl = 'https://testnet.bitmex.com/api/v1/trade?symbol=XBTUSD&count=1&reverse=true'
const router = express.Router()


function getQuote () {
    fetch(quoteUrl)
    .then(res => res.json())
    .then(quote => {
        let trade = {
            timestamp: quote[0].timestamp,
            price: Math.round(quote[0].price)
        }
        return trade
    })
    .then(trade => {
        standardDeviation(trade)
    })
}


let prices = []
let tradesArr = ['sell']
let lastTradeArray = []
let profitArray = []


function calcAvgPrice (trade) {
    prices.push(trade.price)
    let sum = prices.reduce((accum, number) => {
        return accum + number
    }, 0)
    let avg = sum / prices.length
    return avg
}

function calculatePnL (last, trade) {
    let profit = 0
    if (last.direction === 'short') {
        profit = last.price - trade.price
    }
    if (last.direction === 'long') {
        profit = trade.price - last.price
    }
    return profit
}

function getTotalPnL () {
    let total = 0
    if (profitArray.length > 0) {
        total = profitArray.reduce((accum, pnl) => {
            return accum + pnl
        }, 0)
    }
    return total
}

function storeShort (last, trade) {
    let tradeObject = {
        timestamp: trade.timestamp,
        price: trade.price,
        direction: 'short',
        profit: calculatePnL(last, trade) || 0,
        rollingTotal: getTotalPnL()
    }
    queries.create(tradeObject)
}

function storeLong (last, trade) {
    let tradeObject = {
        timestamp: trade.timestamp,
        price: trade.price,
        direction: 'long',
        profit: calculatePnL(last, trade) || 0,
        rollingTotal: getTotalPnL()
    }
    queries.create(tradeObject)
}

function updateArraysShort (price) {
    tradesArr.push('sell')
    lastTradeArray.push({
        direction: 'short',
        price: price
    })
}

function updateArraysLong (price) {
    tradesArr.push('long')
    lastTradeArray.push({
        direction: 'long',
        price: price
    })
}

function calculateUpper (lastBar, devActual) {
    return lastBar + (devActual * 2.0)
}

function calculateLower (lastBar, devActual) {
    return lastBar - (devActual * 2.0)
}


function tradeDecision (trade, price, upperBand, lowerBand) {
    let lastTrade = tradesArr.slice(-1)[0]
    let last = lastTradeArray.slice(-1)[0]
    if (price > upperBand && lastTrade === 'long' && prices.length > 19) {
        updateArraysShort(price)
        profitArray.push(calculatePnL(last, trade))
        storeShort(last, trade)
    }
    if (price < lowerBand && lastTrade === 'sell' && prices.length > 19) {
        updateArraysLong(price)
        profitArray.push(calculatePnL(last, trade))
        storeLong(last, trade)
    }
}

function standardDeviation (trade) {
    let avg = calcAvgPrice(trade)
    let onlyTwentyArr = prices.slice(-20)
    let devArray = onlyTwentyArr.map((number) => {
        let diff = (number - avg)
        return diff * diff
    })
    let newSum = devArray.reduce((accum, number) => {
        return accum + number
    }, 0)
    let devTotal = newSum / prices.length
    let devActual = Math.sqrt(devTotal)
    let lastBar = prices[prices.length - 2]
    let upperBand = calculateUpper(lastBar, devActual)
    let lowerBand = calculateLower(lastBar, devActual)
    tradeDecision(trade, trade.price, upperBand, lowerBand)
}



const quoteLoop = setInterval (getQuote, 5000)


app.get("/", (request, response, next) => {
    queries.list()
    .then(trades => {
        response.json({trades})
    })
    .catch(next)
})

app.listen(port)