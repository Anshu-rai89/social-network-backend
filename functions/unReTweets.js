const DynamoDB = require("@aws-sdk/client-dynamodb");
const  _ = require("lodash");

const {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDB.DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const { USERS_TABLE, TIMELINES_TABLE, TWEETS_TABLE, RETWEETS_TABLE } =
  process.env;

module.exports.handler = async (event) => {
  const { tweetId } = event.arguments;
  const { username } = event.identity;

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

  const queryCommand = new QueryCommand({
    TableName: TWEETS_TABLE,
    IndexName: 'retweetsByCreator',
    KeyConditionExpression: 'creator = :creator AND retweetOf = :tweetId',
    ExpressionAttributeValues: {
        ':creator' : userId,
        ':tweetId': tweetId
    },
    Limit: 1
  });

  const queryResp = await docClient.send(queryCommand);
  const reTweet = _.get(queryResp, 'Items.0');

  if(!reTweet) {
    throw new Error('Retweet not found');
  }

  const transactItems = [
    {
      Delete: {
        TableName: TWEETS_TABLE,
        Key: {
          id: reTweet.id,
        },
        ConditionExpression: "attribute_exists(id)",
      },
    },
    {
      Delete: {
        TableName: RETWEETS_TABLE,
        Key: {
          userId: username,
          tweetId,
        },
        ConditionExpression: "attribute_exists(tweetId)",
      },
    },
    {
      Update: {
        TableName: TWEETS_TABLE,
        Key: {
          id: tweetId,
        },
        UpdateExpression: "ADD retweets :minusOne",
        ExpressionAttributeValues: {
          ":minusOne": -1,
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
        UpdateExpression: "ADD tweetsCount :minusOne",
        ExpressionAttributeValues: {
          ":minusOne": -1,
        },
        ConditionExpression: "attribute_exists(id)",
      },
    },
  ];

  if (tweet.creator != username) {
    transactItems.push({
      Delete: {
        TableName: TIMELINES_TABLE,
        Key: {
          userId: username,
          tweetId: id
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
