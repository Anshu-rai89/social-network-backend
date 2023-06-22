const _ = require("lodash");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const {initUserIndex} = require('../lib/algolia');
const middy = require("@middy/core");
const ssm = require("@middy/ssm");
const { STAGE } = process.env;
console.log("STage", STAGE);

module.exports.handler = middy(async (event, context) => {
  console.log("Context", context);
  const index = await initUserIndex(
    context.ALGOLIA_APP_ID,
    context.ALGOLIA_WRITE_KEY,
    STAGE
  );

  for (const record of event.Records) {
    if (record.eventName === "INSERT" || record.eventName === "MODIFY") {
      const profile = unmarshall(record.dynamodb.NewImage);

      profile.objectID = profile.id;

      await index.saveObjects([profile]);
    } else if (record.eventName === "REMOVE") {
      const profile = unmarshall(record.dynamodb.OldImage);

      await index.deleteObjects([profile.id]);
    }
  }
}).use(
  ssm({
    cache: true,
    cacheExpiryInMillis: 5 * 60 * 1000, // 5 mins
    fetchData: {
      ALGOLIA_APP_ID: `/${STAGE}/aloglia-app-id`,
      ALGOLIA_WRITE_KEY: `/${STAGE}/algolia-admin-key`,
    },
    setToContext: true,
    throwOnFailedCall: true,
  })).before((request) => {
    globalDefaults = request.context?.defaults?.global;
  });