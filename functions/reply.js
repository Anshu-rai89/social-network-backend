const DynamoDB = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const ulid = require("ulid");
const { TweetTypes } = require("../lib/constants");
const { getTweetById } = require("../lib/tweets");

const client = new DynamoDB.DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const { USERS_TABLE, TIMELINES_TABLE, TWEETS_TABLE } = process.env;

module.exports.handler = async (event) => {
  const { tweetId, text } = event.arguments;
  const { username } = event.identity;
  const id = ulid.ulid();
  const timestamp = new Date().toJSON();

  const tweet = await getTweetById(tweetId);
  if (!tweet) {
    throw new Error("Tweet is not found");
  }

  const inReplyToUserIds = await getUserIdsToReplyTo(tweet);

  const newTweet = {
    __typename: TweetTypes.REPLY,
    id,
    creator: username,
    createdAt: timestamp,
    inReplyToTweetId: tweetId,
    inReplyToUserIds,
    text,
    replies: 0,
    likes: 0,
    retweets: 0
  };

  const transactItems = [
    {
      Put: {
        TableName: TWEETS_TABLE,
        Item: newTweet,
      },
    },
    {
      Update: {
        TableName: TWEETS_TABLE,
        Key: {
          id: tweetId,
        },
        UpdateExpression: "ADD replies :one",
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
    {
      Put: {
        TableName: TIMELINES_TABLE,
        Item: {
          userId: username,
          tweetId: id,
          timestamp,
          inReplyToTweetId: tweetId,
          inReplyToUserIds,
        },
      },
    },
  ];

   const transactCommand = new TransactWriteCommand({
     TransactItems: transactItems,
   }); 

    await docClient.send(transactCommand);

  return newTweet;
};

async function getUserIdsToReplyTo(tweet) {
  let userIds = [tweet.creator];
  if (tweet.__typename === TweetTypes.REPLY) {
    userIds = userIds.concat(tweet.inReplyToUserIds);
  } else if (tweet.__typename === TweetTypes.RETWEET) {
    const retweetOf = await getTweetById(tweet.retweetOf);
    userIds = userIds.concat(await getUserIdsToReplyTo(retweetOf));
  }

  return (userIds);
}
