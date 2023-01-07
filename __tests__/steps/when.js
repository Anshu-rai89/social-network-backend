require('dotenv').config();
const AWS = require('aws-sdk');
const fs = require('fs');
const velocityMapper  = require('amplify-appsync-simulator/lib/velocity/value-mapper/mapper');
const velocityTemplate = require('amplify-velocity-template');
const GraphQL = require('../lib/graphql')
const we_invoke_confirmSignUpUser = async (userName, email, name) => {
  const signUpHandler = require("../../functions/confirm-users-signup").handler,
    event = {
      version: "1",
      region: process.env.AWS_REGION,
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      userName: userName,
      triggerSource: "PostConfirmation_ConfirmSignUp",
      request: {
        userAttributes: {
          sub: userName,
          "cognito:email_alias": email,
          "cognito:user_status": "CONFIRMED",
          "email-verified": "false",
          name: name,
          email: email,
        },
      },
      response: {},
    },
    context = {};

  await signUpHandler(event, context);
};

const a_user_signup = async (email,name,password) => {
    const cognito = new AWS.CognitoIdentityServiceProvider();
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.WEB_COGNITO_USER_POOL_CLIENT_ID;

    const signUpRes = await cognito.signUp({
      ClientId:clientId,
      Username: email,
      Password:password,
      UserAttributes:[{
        Name:'name',
        Value:name
      }]
    }).promise();

    const userName = signUpRes.UserSub;

    console.log( `[${email}] has signed up [${userName}]`);

    await cognito.adminConfirmSignUp({
      UserPoolId: userPoolId,
      Username: userName
    }).promise();

    return {
      userName,
      name,
      email
    }
}

const we_invoke_appSync_template = (templatePath, context) => {
  const template = fs.readFileSync(templatePath, { encoding: "utf-8" });
  const ast = velocityTemplate.parse(template);
  const compiler = new velocityTemplate.Compile(ast, {
    valueMapper: velocityMapper.map,
    escape: false,
  });
  const res = compiler.render(context);
  return JSON.parse(res);
};

const a_user_calls_getMyProfile = async (user)=> {
  const getProfileQuery = `
    query MyQuery {
    getMyProfile {
      name
      screenName
      createdAt
      id
      tweetsCount
      followingCount
      followersCount
    }
  }
  `;
 const data = await GraphQL(
   process.env.API_URL,
   getProfileQuery,
   {},
   user.accessToken
 );
 const profile = data.getMyProfile;
 console.log(`[${user.userName} profile fetched]`);

 return profile;

}

const a_user_calls_editMyProfile = async (user, input) => {
  const editProfileQuery = `
    mutation MyMutation($input: ProfileInput!) {
    editMyProfile(newProfile: $input){
      name
      screenName
      createdAt
      id
      tweetsCount
      followingCount
      followersCount
    }
  }
  `;

  const variables = {
    input
  }

  const data = await GraphQL(
    process.env.API_URL,
    editProfileQuery,
    variables,
    user.accessToken
  );
  const profile = data.editMyProfile;
  console.log(`[${user.userName} profile edited]`);

  return profile;
};

module.exports = {
  we_invoke_confirmSignUpUser,
  a_user_signup,
  we_invoke_appSync_template,
  a_user_calls_getMyProfile,
  a_user_calls_editMyProfile,
};