const AWS = require('aws-sdk');
const axios = require('axios');
const fs = require('fs');

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

const a_user_can_upload_image_to_url = async (
  username,
  uploadUrl,
  filePath,
  contentType
) => {
  const data = fs.readFileSync(filePath);
  const res = await axios({
    method: "put",
    url: uploadUrl,
    headers: {
      "Content-Type": contentType,
    },
    data,
  });

  console.log(`[${username} uploaded ${filePath} successfully]`);
};

const a_user_can_download_image_from_url = async (userName, url) => {
  await axios(url);
  console.log(`[${userName} downloaded file from ${url} successfully]`)
  
}
module.exports = {
  get_user_from_db,
  a_user_can_upload_image_to_url,
  a_user_can_download_image_from_url,
};