const _ = require("lodash");
const DynamoDB = require("aws-sdk/clients/dynamodb");
const DynamoDB = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  BatchWriteCommand,
} = require("@aws-sdk/lib-dynamodb");

const { unmarshall } = require("@aws-sdk/util-dynamodb");
const Constants = require("../lib/constants");
const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: true, // false, by default.
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: true, // false, by default.
};

const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // false, by default.
};

const translateConfig = { marshallOptions, unmarshallOptions };
const client = new DynamoDB.DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, translateConfig);

const { TWEETS_TABLE, TIMELINES_TABLE, MAX_TWEETS_SIZE } = process.env;
const MaxTweets = parseInt(MAX_TWEETS_SIZE);

module.exports.handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName === "INSERT") {
      const relationship = unmarshall(
        record.dynamodb.NewImage
      );

      const [relType] = relationship.sk.split("_");
      if (relType === "FOLLOWS") {
        const tweets = await getTweets(relationship.otherUserId);
        await distribute(tweets, relationship.userId);
      }
    } else if (record.eventName === "REMOVE") {
      const relationship = unmarshall(
        record.dynamodb.OldImage
      );

      const [relType] = relationship.sk.split("_");
      if (relType === "FOLLOWS") {
        const tweets = await getTimelineEntriesBy(
          relationship.otherUserId,
          relationship.userId
        );
        await undistribute(tweets, relationship.userId);
      }
    }
  }
};

async function getTweets(userId) {
  try{
  const loop = async (acc, exclusiveStartKey) => {
    const query = new QueryCommand({
      TableName: TWEETS_TABLE,
      KeyConditionExpression: "creator = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      IndexName: "byCreator",
      ExclusiveStartKey: exclusiveStartKey,
    })

    const resp = await docClient.send(query);
    const tweets = resp.Items || [];
    const newAcc = acc.concat(tweets);

    if (resp.LastEvaluatedKey && newAcc.length < MaxTweets) {
      return await loop(newAcc, resp.LastEvaluatedKey);
    } else {
      return newAcc;
    }
  };

  return await loop([]);
}catch(error) {
  console.log('Error in Querying Tweets', error);
}
}

async function getTimelineEntriesBy(distributedFrom, userId) {
  try{
  const loop = async (acc, exclusiveStartKey) => {
    const query = new QueryCommand({
      TableName: TIMELINES_TABLE,
      KeyConditionExpression:
        "userId = :userId AND distributedFrom = :distributedFrom",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":distributedFrom": distributedFrom,
      },
      IndexName: "byDistributedFrom",
      ExclusiveStartKey: exclusiveStartKey,
    })

    const resp = await docClient.send(query);
    const tweets = resp.Items || [];
    const newAcc = acc.concat(tweets);

    if (resp.LastEvaluatedKey) {
      return await loop(newAcc, resp.LastEvaluatedKey);
    } else {
      return newAcc;
    }
  };

  return await loop([]);
}catch(error) {
  console.log("Error getting timeline entries", error);
  return;
}
}

async function distribute(tweets, userId) {
  try{
  const timelineEntries = tweets.map((tweet) => ({
    PutRequest: {
      Item: {
        userId,
        tweetId: tweet.id,
        timestamp: tweet.createdAt,
        distributedFrom: tweet.creator,
        retweetOf: tweet.retweetOf,
        inReplyToTweetId: tweet.inReplyToTweetId,
        inReplyToUserIds: tweet.inReplyToUserIds,
      },
    },
  }));

  const chunks = _.chunk(timelineEntries, Constants.DynamoDB.MAX_BATCH_SIZE);

  const promises = chunks.map(async (chunk) => {
    const query = new BatchWriteCommand({
      RequestItems: {
        [TIMELINES_TABLE]: chunk,
      },
    });

    await docClient.send(query);
  });

  await Promise.all(promises);
}catch(error) {
  console.log("Error distributing follower tweet", error);
  return;
}
}

async function undistribute(tweets, userId) {
  try{
  const timelineEntries = tweets.map((tweet) => ({
    DeleteRequest: {
      Key: {
        userId,
        tweetId: tweet.tweetId,
      },
    },
  }));

  const chunks = _.chunk(timelineEntries, Constants.DynamoDB.MAX_BATCH_SIZE);

  const promises = chunks.map(async (chunk) => {
    const query = new BatchWriteCommand({
      RequestItems: {
        [TIMELINES_TABLE]: chunk,
      },
    });

    await docClient.send(query);
  });

  await Promise.all(promises);
}catch(error) {
  console.log("Error distributing follower tweet", error);
  return;
}
}
