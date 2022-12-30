const chance = require('chance').Chance();

const a_random_user =  () => {
  const firstName = chance.first({ nationality: "en" }),
    lastName = chance.last({ nationality: "en" }),
    suffix = chance.string({ length: 4, pool: "abcdefghijklmnopqrstuvwxyz" }),
    name = firstName + lastName + suffix,
    email = firstName + "-" + lastName + "-" + suffix + "@socialnetwork.com",
    password = chance.string({ length: 8 });

    console.log("User Detaills",name)
  return {
    name,
    email,
    password,
  };
};

module.exports = {
  a_random_user,
};