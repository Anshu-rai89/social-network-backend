const AWS = require('aws-sdk')
require('dotenv').config()
const get_user_from_db = async (id) => {
  const ddBClient = new AWS.DynamoDB.DocumentClient();

  console.log(`Looking for user ${id} in table ${process.env.USERS_TABLE}`);
  const res = await ddBClient
    .get({
      TableName: process.env.USERS_TABLE,
      Key: {
        id,
      },
    })
    .promise();

  expect(res.Item).toBeTruthy();
  return res;
};

module.exports = {
  get_user_from_db,
};