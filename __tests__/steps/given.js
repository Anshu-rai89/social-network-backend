require('dotenv').config();
const chance = require('chance').Chance();
const utilVelocity = require('amplify-appsync-simulator/lib/velocity/util')
const AWS = require('aws-sdk');

const a_random_user =  () => {
  const firstName = chance.first({ nationality: "en" }),
    lastName = chance.last({ nationality: "en" }),
    suffix = chance.string({ length: 4, pool: "abcdefghijklmnopqrstuvwxyz" }),
    name = firstName + lastName + suffix,
    email = firstName + "-" + lastName + "-" + suffix + "@socialnetwork.com",
    password = chance.string({ length: 8 });

  return {
    name,
    email,
    password,
  };
};

const a_appSync_context = (identity, args) => {
  const util = utilVelocity.create([], new Date(), Object());
  const context = {
    identity,
    args,
    arguments: args,
  };

  return {
    context,
    ctx: context,
    util,
    utils: util,
  };
};
 
const a_authenticated_user = async ()=> {
  const {name, email, password} = a_random_user();

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

    console.log(`[${email} has confirmed signup]`);

    const auth = await cognito.initiateAuth({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: userName,
        PASSWORD: password
      }
    }).promise();

    console.log( `[${email} Signed in]`);

    return {
      userName,
      email,
      name,
      idToken:  auth.AuthenticationResult.IdToken,
      accessToken: auth.AuthenticationResult.AccessToken
    }

}
module.exports = {
  a_random_user,
  a_appSync_context,
  a_authenticated_user
};