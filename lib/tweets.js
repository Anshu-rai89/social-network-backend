
const DynamoDB = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDB.DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const { TWEETS_TABLE } = process.env;

const getTweetById = async (tweetId) => {
    const command = new GetCommand({
    TableName: TWEETS_TABLE,
    Key: {
      id: tweetId,
    },
    });

    const getTweetResp = await docClient.send(command);

    return getTweetResp.Item;
}

module.exports = {
    getTweetById
}