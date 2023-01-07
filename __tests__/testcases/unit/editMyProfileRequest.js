const given = require("../../steps/given");
const when = require("../../steps/when");
const then = require("../../steps/then");
const chance = require("chance").Chance();
const path = require("path");

describe("Mutation edit my profile request template", () => {
  it("Should use newProfile as expression value", async () => {
    const templatePath = path.resolve(
      __dirname,
      "../../../mapping-templates/Mutation.editMyProfile.request.vtl"
    );
    const newProfile = {
        name: 'Anshu Rai',
        imageUrl: null,
        backgroundImageUrl: null,
        bio: "Test",
        location: "Delhi",
        website: null,
        birthdate: null
    }

    const userName = chance.guid();
    const context = given.a_appSync_context({ userName }, {newProfile});
    const result = await when.we_invoke_appSync_template(templatePath, context);

    expect(result).toBe({
      version: "2018-05-29",
      operation: "UpdateItem",
      key: {
        id: {
          S: userName,
        },
      },
      update: {
        expression:
          "set #name = :name, imageUrl = :imageUrl, backgroundImageUrl = :backgroundImageUrl, bio = :bio, #location = :location, website = :website, birthdate = :birthdate",
        expressionNames: {
          "#name": "name",
          "#location": "location",
        },
        expressionValues: {
          ":name": {
            S: "'Anshu Rai",
          },
          ":imageUrl": {
            NULL: true,
          },
          ":backgroundImageUrl": {
            NULL: true,
          },
          ":bio": {
            S: "Test"
          },
          ":location":{
            S: "Delhi"
          },
          ":website": {
            NULL: true
          },
          ":birthdate": {
            NULL: true
          }
        },
      },
      condition: {
        expression: "attribute_exists(id)",
      },
    });
  });
});
