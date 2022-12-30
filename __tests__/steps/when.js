require('dotenv').config();
const AWS = require('aws-sdk')
const we_invoke_confirmSignUpUser = async (userName, email, name) => {
  const signUpHandler = require("../../functions/confirm-users-signup").handler,
    event = {
      version: "1",
      region: process.env.AWS_REGION,
      userPoolId: process.env.COGNITO_USERS_POOL_ID,
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
    const userPoolId = process.env.COGNITO_USERS_POOL_ID;
    const clientId = process.env.WEB_CLIENT_ID;

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


module.exports = {
  we_invoke_confirmSignUpUser,
  a_user_signup,
};