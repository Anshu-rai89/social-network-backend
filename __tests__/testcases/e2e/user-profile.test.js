const when = require('../../steps/when');
const given = require('../../steps/given');
const chance = require('chance').Chance();

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