const { Chance } = require("chance");

const when = require('../../steps/when'),
    given = require('../../steps/given'),
    then = require('../../steps/then'),
    chance = Chance();


describe('Test confirm user signup',()=> {
    it('should create a user and store in db',async ()=> {
        const {name,email} = given.a_random_user(),
            userName = chance.guid();

        console.log("User is", name,email);
        await when.we_invoke_confirmSignUpUser(userName, email, name);
        
        const ddbUser = await then.get_user_from_db(userName);
        
        expect(ddbUser.Item.id).toEqual(userName);
        expect(ddbUser.Item.name).toContain(name)
    })
})