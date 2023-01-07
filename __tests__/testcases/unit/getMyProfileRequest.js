const given = require('../../steps/given');
const when = require('../../steps/when');
const then = require('../../steps/then');
const chance = require('chance').Chance();
const path = require('path');

describe('Query.getMyProfile request template',()=> {
    it('Should use username as ID',async ()=> {
        const templatePath = path.resolve(__dirname,'../../../mapping-templates/Query.getMyProfile.request.vtl')
        const userName = chance.guid();
        const context = given.a_appSync_context({ userName }, {});
        const result = await when.we_invoke_appSync_template(templatePath, context)

        expect(result).toBe({
                "version":"2018-05-29",
                "operation":"GetItem",
                "key":{
                    "id": {
                        "S": userName
                    }
                }
        });
    })
})