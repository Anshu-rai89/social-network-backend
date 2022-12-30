const { Chance } = require("chance");

const when = require("../../steps/when"),
  given = require("../../steps/given"),
  then = require("../../steps/then"),
  chance = Chance();

describe("Test confirm user signup", () => {
  it("should create a user and store in db", async () => {
    const { name, email,password } = given.a_random_user()
    const user = await when.a_user_signup( email, name,password);
    const ddbUser = await then.get_user_from_db(user.userName);

    expect(ddbUser.Item.id).toEqual(user.userName);
    expect(ddbUser.Item.name).toContain(name);
  });
});
