const DynamoDB = require("@aws-sdk/client-dynamodb");
const { unmarshall, marshall } = require("@aws-sdk/util-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  BatchWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const client = new DynamoDB.DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const { TWEETS_TABLE, TIMELINES_TABLE ,MAX_TWEETS_SIZE} = process.env;
const Constants = require("../lib/constants");
const _ = require("lodash");
const MaxTweetsSize = parseInt(MAX_TWEETS_SIZE);

module.exports.handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName === "INSERT") {
      const relationship = unmarshall(record.dynamodb.NewImage);
      const [relType] = relationship.sk.split("_");
      if (relType === "FOLLOW") {
        const tweets = await getTweets(relationship.otherUserId);
        await distributeTweet(tweets, relationship.otherUserId);
      }
    } else if (record.eventName === "REMOVE") {
      const relationship = unmarshall(record.dynamodb.OldImage);
      const [relType] = relationship.sk.split("_");
      if (relType === "FOLLOW") {
        const tweets = await getTimelineEntries(
          relationship.otherUserId,
          relationship.userId
        );
        await unDistributeTweet(tweets, relationship.otherUserId);
      }
    }
  }
};

async function getTweets(userId) {
  const loop = async (acc, exclusiveStartKey) => {
    const query = new QueryCommand({
      TableName: TWEETS_TABLE,
      KeyConditions: "creator = :userId",
      ExpressionAttributeValues: {
        "userId": userId
      },
      IndexName: "byCreator",
      ExclusiveStartKey: exclusiveStartKey,
    });

    const resp = await docClient.send(query);
    const tweets = resp.Items;
    const newAcc = acc.concat(tweets);

    if (resp.LastEvaluatedKey && newAcc.length < MaxTweetsSize) {
      return await loop(newAcc, resp.LastEvaluatedKey);
    } else {
      return newAcc;
    }
  };

  return await loop([]);
}

async function getTimelineEntries(distributedFrom, userId) {
  const loop = async (acc, exclusiveStartKey) => {
    const query = new QueryCommand({
      TableName: TIMELINES_TABLE,
      KeyConditions: "distributedFrom = :distributedFrom and userId = :userId",
      ExpressionAttributeValues: {
        userId: userId,
        distributedFrom: distributedFrom,
      },
      IndexName: "byDistributedFrom",
      ExclusiveStartKey: exclusiveStartKey,
    });

    const resp = await docClient.send(query);
    const tweets = resp.Items;
    const newAcc = acc.concat(tweets);

    if (resp.LastEvaluatedKey) {
      return await loop(newAcc, resp.LastEvaluatedKey);
    } else {
      return newAcc;
    }
  };

  return await loop([]);
}
async function distributeTweet(tweets, userId) {
  const timelineEntries = tweets.map((tweet) => {
    PutRequest: {
      Item: marshall({
        userId,
        tweetId: tweet.id,
        timestamp: tweet.createdAt,
        retweetOf: tweet.retweetOf,
        distributedFrom: tweet.creator,
        inReplyToTweetId: tweet.inReplyToTweetId,
        inReplyToUserIds: tweet.inReplyToUserIds,
      });
    }
  });

  const chunks = _.chunk(timelineEntries, Constants.dynamodb.MAX_BATCH_SIZE);
  const promises = chunks.map(async (chunk) => {
    const query = new BatchWriteCommand({
      RequestItems: {
        [TIMELINES_TABLE]: chunk,
      },
    });
    await docClient.send(query);
  });

  await Promise.all(promises);
}

async function unDistributeTweet(tweets, userId) {
  const timelineEntries = tweets.map((tweet) => {
    DeleteRequest: {
      Item: marshall({
        userId,
        tweetId: tweet.id,
        timestamp: tweet.createdAt,
        retweetOf: tweet.retweetOf,
        inReplyToTweetId: tweet.inReplyToTweetId,
        inReplyToUserIds: tweet.inReplyToUserIds,
      });
    }
  });

  const chunks = _.chunk(timelineEntries, Constants.dynamodb.MAX_BATCH_SIZE);
  const promises = chunks.map(async (chunk) => {
    const query = new BatchWriteCommand({
      RequestItems: {
        [TIMELINES_TABLE]: chunk,
      },
    });
    await docClient.send(query);
  });

  await Promise.all(promises);
}
