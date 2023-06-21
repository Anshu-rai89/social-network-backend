const _ = require("lodash");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { initTweetIndex } = require("../lib/algolia");
const {TweetTypes} = require('../lib/constants');
const middy = require('@middy/core');
const ssm = require('@middy/ssm');
const { STAGE } = process.env;

module.exports.handler = middy(async (event, context) => {
  const index = await initTweetIndex(
    context.ALGOLIA_APP_ID,
    context.ALGOLIA_WRITE_KEY,
    STAGE
  );
  for (const record of event.Records) {
    if (record.eventName === "INSERT" || record.eventName === "MODIFY") {
      const tweet = unmarshall(record.dynamodb.NewImage);

      if (tweet.__typeName === TweetTypes.RETWEET) {
        continue;
      }

      tweet.objectID = tweet.id;
      await index.saveObjects([tweet]);
    } else if (record.eventName === "REMOVE") {
      const tweet = unmarshall(record.dynamodb.OldImage);
      if (tweet.__typeName === TweetTypes.RETWEET) {
        continue;
      }
      await index.deleteObjects([tweet.id]);
    }
  }
}).use(
  ssm({
    cache: true,
    cacheExpiryInMillis: 5 * 60 * 1000,
    names: {
      ALGOLIA_APP_ID: `/${STAGE}/aloglia-app-id`,
      ALGOLIA_WRITE_KEY: `/${STAGE}/algolia-admin-key`,
    },
    setToContext: true,
    throwOnFailedCall: true
  })
);
