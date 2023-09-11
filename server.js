import express from "express";
import { graphqlHTTP } from "express-graphql";
import { execute, subscribe } from "graphql";
import { createServer } from "http";
import { SubscriptionServer } from "subscriptions-transport-ws";
import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLFloat,
  GraphQLList,
  GraphQLInt,
} from "graphql";
import Redis from "ioredis";
import { RedisPubSub } from "graphql-redis-subscriptions";

const app = express();

const redisOptions = {
  host: "127.0.0.1",
  port: 6379,
};

const redisClient = new Redis(redisOptions);
const redisClient1 = new Redis(redisOptions);

const pubsub = new RedisPubSub({
  publisher: redisClient1,
  subscriber: redisClient,
});

const StockType = new GraphQLObjectType({
  name: "Stock",
  fields: {
    symbol: { type: GraphQLString },
    ltp: { type: GraphQLFloat },
  },
});

const StockType1 = new GraphQLObjectType({
  name: "Stock1",
  fields: {
    symbol: { type: GraphQLString },
    ltp: { type: GraphQLFloat },
    qty: { type: GraphQLInt },
    avgbuy: { type: GraphQLFloat },
  },
});

const QueryRoot = new GraphQLObjectType({
  name: "Query",
  fields: {
    portfolio: {
      type: new GraphQLList(StockType1),
      resolve: async (parent, args, context, info) => {
        console.log("Incoming request:", info.fieldName, args);
        return [
          { symbol: "AAPL", ltp: 150, qty: 100, avgbuy: 300 },
          { symbol: "GOOGL", ltp: 2500, qty: 50, avgbuy: 150 },
          { symbol: "rel", ltp: 2500, qty: 200, avgbuy: 300 },
          { symbol: "COINBASE", ltp: 2500, qty: 200, avgbuy: 300 },
        ];
      },
    },
    market: {
      type: new GraphQLList(StockType),
      resolve: async (parent, args, context, info) => {
        console.log("Incoming request:", info.fieldName, args);
        return [
          { symbol: "MS", ltp: 150 },
          { symbol: "COINBASE", ltp: 2500 },
          { symbol: "SMD", ltp: 2500 },
        ];
      },
    },
  },
});

const SubscriptionRoot = new GraphQLObjectType({
  name: "Subscription",
  fields: {
    ltpUpdated: {
      type: StockType,
      args: {
        symbols: { type: new GraphQLList(GraphQLString) },
      },
      subscribe: (parent, { symbols }) => {
        console.log("subscripiton query", symbols);
        return pubsub.asyncIterator(symbols);
      },
    },
  },
});

const schema = new GraphQLSchema({
  query: QueryRoot,
  subscription: SubscriptionRoot,
});
app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    graphiql: true,
  })
);

const server = createServer(app);

server.listen(4000, () => {
  new SubscriptionServer(
    {
      execute,
      subscribe,
      schema,
    },
    {
      server: server,
      path: "/subscriptions",
    }
  );

  const arr = [
    "18883_NSE",
    "7303_NSE",
    "11522_NSE",
    "11165_NSE",
    "13731_NSE",
    "46_NSE",
    "13061_NSE",
    "17164_NSE",
    "13_NSE",
    "15404_NSE",
    "19149_NSE",
    "18279_NSE",
    "-6_BSE",
    "-34_BSE",
    "-1_NSE",
    "-21_NSE",
    "-2_NSE",
    "2885_NSE",
    "3586_NSE",
    "9741_NSE",
    "2124_NSE",
    "24190_NSE",
    "20374_NSE",
  ];

  setInterval(() => {
    arr.forEach((_, index) => {
      const symbol = arr[index];
      var obj = {
        symbol: symbol,
        ltp: (20 + Math.random() * 10).toFixed(2),
        chngPer: (3 * Math.random()).toFixed(2),
        chng: (30 * 2 + Math.random()).toFixed(2),
      };
      const channel = convertToChannelFormat(symbol, "LTP");
      console.log(channel, obj);
      pubsub.publish(channel, obj);
    });
  }, 500);

  console.log("Server running on http://localhost:4000");
});

function convertToChannelFormat(input, prefix) {
  const parts = input.split("_");
  const output = `${prefix}-${parts[0]}-${parts[1]}`;
  return output;
}
