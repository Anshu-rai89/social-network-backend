const DynamoDB = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  TransactWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const ulid = require("ulid");
const { TweetTypes } = require("../lib/constants");

const client = new DynamoDB.DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const { USERS_TABLE, TIMELINES_TABLE, TWEETS_TABLE, RETWEETS_TABLE } =
  process.env;

module.exports.handler = async (event) => {
  const { tweetId } = event.arguments;
  const { username } = event.identity;
  const id = ulid.ulid();
  const timestamp = new Date().toJSON();

  const command = new GetCommand({
    TableName: TWEETS_TABLE,
    Key: {
      id: tweetId,
    },
  });

  const getTweetResp = await docClient.send(command);

  const tweet = getTweetResp.Item;

  if (!tweet) {
    throw new Error("Tweet not found");
  }

  const newTweet = {
    __typename: TweetTypes.RETWEET,
    id,
    creator: username,
    createdAt: timestamp,
    retweetOf: tweetId,
  };

  const transactItems = [
    {
      Put: {
        TableName: TWEETS_TABLE,
        Item: newTweet,
      }
    },
    {
      Put: {
        TableName: RETWEETS_TABLE,
        Item: {
          userId: username,
          tweetId,
          createdAt: timestamp,
        },
        ConditionExpression: "attribute_not_exists(tweetId)",
      },
    },
    {
      Update: {
        TableName: TWEETS_TABLE,
        Key: {
          id: tweetId,
        },
        UpdateExpression: "ADD retweets :one",
        ExpressionAttributeValues: {
          ":one": 1,
        },
        ConditionExpression: "attribute_exists(id)",
      },
    },
    {
      Update: {
        TableName: USERS_TABLE,
        Key: {
          id: username,
        },
        UpdateExpression: "ADD tweetsCount :one",
        ExpressionAttributeValues: {
          ":one": 1,
        },
        ConditionExpression: "attribute_exists(id)",
      },
    },
  ];

  if (tweet.creator != username) {
    transactItems.push({
      Put: {
        TableName: TIMELINES_TABLE,
        Item: {
          userId: username,
          tweetId: id,
          timestamp,
          retweetOf: tweetId,
        },
      },
    });
  }

  console.log(`creator: [${tweet.creator}]; username: [${username}]`);
  const transactCommand = new TransactWriteCommand({
    TransactItems: transactItems,
  });

  await docClient.send(transactCommand);

  return true;
};
