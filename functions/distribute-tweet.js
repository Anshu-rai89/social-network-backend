const DynamoDB = require("@aws-sdk/client-dynamodb");
const { unmarshall, marshall } = require("@aws-sdk/util-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  BatchWriteCommand
} = require("@aws-sdk/lib-dynamodb");
const client = new DynamoDB.DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const { RELATIONSHIP_TABLE, TIMELINES_TABLE } = process.env;
const Constants = require('../lib/constants');
const _ = require('lodash');

module.exports.handler = async (event) => {
    for (const record of event.Records) {
      if (record.eventName === "INSERT") {
        const tweet = unmarshall(record.dynamodb.NewImage);
        const followers = await getFollowers(tweet.creator);
        await distributeTweet(tweet, followers);
      } else if (record.eventName === "REMOVE") {
        const tweet = unmarshall(record.dynamodb.OldImage);
        const followers = await getFollowers(tweet.creator);
        await unDistributeTweet(tweet, followers);
      }
    }
};

async function getFollowers(userId) {
    const loop = async(acc, exclusiveStartKey)=> {
        const query = new QueryCommand({
          TableName: RELATIONSHIP_TABLE,
          KeyConditions:
            "otherUserId = :otherUserId and begins_with(sk, :follow)",
          ExpressionAttributeValues: {
            otherUserId: userId,
            ":follow": "FOLLOWS_",
          },
          IndexName: "byOtherUser",
          ExclusiveStartKey: exclusiveStartKey,
        });

        const resp = await docClient.send(query);
        const userIds = (resp.Items || []).map(user=> user.id);

        if(resp.LastEvaluatedKey) {
            return await loop(acc.concat(userIds), resp.LastEvaluatedKey);
        }
        else {
            return acc.concat(userIds);
        }
    }

    return await loop([]);
}

async function distributeTweet(tweet, followers) {
    const timelineEntries = followers.map((userId)=> {
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
    const promises = chunks.map(async (chunk)=> {
        const query = new BatchWriteCommand({
          RequestItems: {
            [TIMELINES_TABLE]: chunk
          }
        });
        await docClient.send(query);
    });

    await Promise.all(promises)
}

async function unDistributeTweet(tweet, followers) {
  const timelineEntries = followers.map((userId) => {
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