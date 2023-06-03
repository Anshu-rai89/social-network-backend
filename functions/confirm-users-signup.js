const DynamoDB = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand
} = require("@aws-sdk/lib-dynamodb");
const { USERS_TABLE } = process.env;
const Chance = require("chance");
const { dynamodb } = require("../lib/constants");
const chance = new Chance();

const client = new DynamoDB.DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  if (event.triggerSource === "PostConfirmation_ConfirmSignUp") {
    const name = event.request.userAttributes["name"];
    const suffix = chance.string({
      length: 8,
      casing: "upper",
      numeric: true,
      alpha: true,
    });
    const screenName = `${name.replace(/[^a-zA-Z0-9]/g)}${suffix}`;
    const user = {
      id: event.userName,
      name: name,
      screenName,
      createdAt: new Date().toJSON(),
      followersCount: 0,
      followingCount: 0,
      tweetsCount: 0,
    };
   const query = new PutCommand({
      TableName: USERS_TABLE,
      Item: user,
      ConditionExpression: "attribute_not_exists(id)",
    });

    await docClient.send(query);
    return event;
  } else {
    return event;
  }
};
