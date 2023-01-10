const when = require('../../steps/when');
const given = require('../../steps/given');
const then = require('../../steps/then');
const chance = require('chance').Chance();
const path = require('path');

describe('Given a authenticated user', ()=> {
    let user = null;
    let profile = null;

    beforeAll(async ()=> {
        user = await given.a_authenticated_user();
    })

    it('Should be able to fetch profile by getMyProfile', async ()=> {
        profile = await when.a_user_calls_getMyProfile(user);

        expect(profile.name).toEqual(user.name);
        expect(profile.screenName).toContain(user.name);
        expect(profile.followersCount).toEqual(0);
        expect(profile.tweetsCount).toEqual(0);
        expect(profile.followingCount).toEqual(0);
    })

    it("Should be able to get image upload url using getImageUpload", async () => {
      const url = await when.a_user_calls_getImageUpload(
        user,
        ".png",
        "image/png"
      );
      const bucketName = process.env.BUCKET_NAME,
        regex = new RegExp(
          `https://${bucketName}.s3.accelerate.amazonaws.com/${user.userName}/.*.png\?.*Content-Type=image%2Fpng*`
        );
      expect(url).toMatch(regex);

      const filePath = path.join(__dirname, "../../data/img.png");
      await then.a_user_can_upload_image_to_url(
        user.userName,
        url,
        filePath,
        "image/png"
      );

      const downloadUrl = url.split("?")[0];
      await then.a_user_can_download_image_from_url(user.userName, downloadUrl);
    });

    it("Should be able to edit profile by editMyProfile", async () => {
        const newName = chance.first();
        const input = {
            name: newName
        }
        profile = await when.a_user_calls_editMyProfile(user,input);

        expect(profile.name).toEqual(input.name);
        expect(profile.screenName).toContain(user.name);
        expect(profile.followersCount).toEqual(0);
        expect(profile.tweetsCount).toEqual(0);
        expect(profile.followingCount).toEqual(0);
    });
})