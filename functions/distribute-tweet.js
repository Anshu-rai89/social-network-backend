const _ = require("lodash");
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
  convertEmptyValues: true, // false, by default.
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


const { RELATIONSHIPS_TABLE, TIMELINES_TABLE } = process.env;

module.exports.handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName === "INSERT") {
      const tweet = unmarshall(record.dynamodb.NewImage);
      const followers = await getFollowers(tweet.creator);
      await distribute(tweet, followers);
    } else if (record.eventName === "REMOVE") {
      const tweet = unmarshall(record.dynamodb.OldImage);
      const followers = await getFollowers(tweet.creator);
      await undistribute(tweet, followers);
    }
  }
};

async function getFollowers(userId) {
  try{
  const loop = async (acc, exclusiveStartKey) => {
    const query = new QueryCommand({
      TableName: RELATIONSHIPS_TABLE,
      KeyConditionExpression:
        "otherUserId = :otherUserId and begins_with(sk, :follows)",
      ExpressionAttributeValues: {
        ":otherUserId": userId,
        ":follows": "FOLLOWS_",
      },
      IndexName: "byOtherUser",
      ExclusiveStartKey: exclusiveStartKey,
    });

    const resp = await docClient.send(query);
    const userIds = (resp.Items || []).map((x) => x.userId);

    if (resp.LastEvaluatedKey) {
      return await loop(acc.concat(userIds), resp.LastEvaluatedKey);
    } else {
      return acc.concat(userIds);
    }
  }

  return await loop([]);

}catch(error) {
    console.log("Error in Query tweet", error);
    return [];
  };
}

async function distribute(tweet, followers) {
  try{
  const timelineEntries = followers.map((userId) => ({
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

  console.log(`Timeline Entries [${JSON.stringify(timelineEntries)}]`);

  const chunks = _.chunk(timelineEntries, Constants.dynamodb.MAX_BATCH_SIZE);

  const promises = chunks.map(async (chunk) => {
    const query = new BatchWriteCommand({
      RequestItems: {
        [TIMELINES_TABLE]: chunk
      },
    });

    await docClient.send(query);
  });

  await Promise.all(promises);
}catch(error) {
  console.log("Error in Batch write", error);
  return;
}
}

async function undistribute(tweet, followers) {
  try{
  const timelineEntries = followers.map((userId) => ({
    DeleteRequest: {
      Key: {
        userId,
        tweetId: tweet.id,
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
  console.log("Error in Batch write undistribute tweet", error);
  return;
}
}
