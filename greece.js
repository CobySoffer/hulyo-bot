const fetch = require("node-fetch");
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
// replace the value below with the Telegram token you receive from @BotFather
const token = "671765458:AAF4r8TTOtoVSeJ9j9bVKWh2mHrXEjvXENg";
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

const Datastore = require("nedb"),
  db = new Datastore({ filename: "./datafile" });
db.loadDatabase();

const desiredResults = {
  flightPrice: 310,
  availableSeats: 3,
  destinations: ["קוס", "רודוס", "כרתים"]
};

function parseToInt(numberWithCurrency) {
  return parseInt(numberWithCurrency.replace(/[$,]+/g, ""));
}

const intervalFunc = () => {
  console.log("Fetching Data!");
  fetch(
    "https://s3.eu-central-1.amazonaws.com/catalogs.hulyo.co.il/catalogs/Production/Flights/v1.4/above199FlightsWebOnly.js"
  )
    .then(res => res.json())
    .then(result => {
      const flights = result.Flights;
      const flightsToGreece = flights.filter(singleFlight => {
        const flightPrice = parseToInt(singleFlight.PriceTitle);
        const availableSeats = singleFlight.AvailableSeats;
        const destination = singleFlight.DealDestinationName;
        return (
          desiredResults.destinations.includes(destination) &&
          availableSeats >= desiredResults.availableSeats &&
          flightPrice < desiredResults.flightPrice
        );
      });

      db.find({}, function(err, dbFlights) {
        //Find Ids that are in flightsToGreece but not in dbFlights
        const result = flightsToGreece.filter(function(obj) {
          return !dbFlights.some(function(obj2) {
            return obj.Id == obj2.Id;
          });
        });

        result.forEach(flight => {
          console.log("Found A new flight!");
          db.insert(flight, (err, newDoc) => {
            bot.sendMessage(
              -275438364,
              `New flght has been added to Hulyo, \nDestination: ${
                flight.DealDestinationName
              }, \nAvailable seats: ${flight.AvailableSeats}, \nPrice: ${
                flight.PriceTitle
              }, \nOut bound Fligh: ${
                flight.OutboundFlights[0].DepartureATATitle
              }, \nIn bound Fligh: ${
                flight.InboundFlights[0].DepartureATATitle
              }`
            );
          });
        });
      });
    });
};

setInterval(intervalFunc, 15000);
