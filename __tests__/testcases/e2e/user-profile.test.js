const when = require('../../steps/when');
const given = require('../../steps/given');

describe('Given a authenticated user', ()=> {
    let user = null;

    beforeAll(async ()=> {
        user = await given.a_authenticated_user();
    })

    it('Should be able to fetch profile by getMyProfile', async ()=> {
        const profile = await when.a_user_calls_getMyProfile(user);

        expect(profile.name).toEqual(user.name);
        expect(profile.screenName).toContain(user.name);
        expect(profile.followersCount).toEqual(0);
        expect(profile.tweetsCount).toEqual(0);
         expect(profile.followingCount).toEqual(0);
    })
})