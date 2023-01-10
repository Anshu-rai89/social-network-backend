const when = require('../../steps/when'),
    chance = require('chance').Chance();

    require('dotenv').config();

    describe('When user makes call to getImageUploadUrl', ()=> {
        it.each([['.png','image/png'],
            ['.jpeg','image/jpeg'],
            ['png','/image/png'],
            [null,'image/png'],
            ['.png',null],
            [null,null]]
        )
            ('Should return  pre signed s3 url for extension %s and content type %s', 
                async (extension, contentType)=> {
                    const userName = chance.guid(),
                        { BUCKET_NAME } = process.env;

                    const url = await when.we_invoke_getImageUploadUrl(userName, extension, contentType);
                    const regex = new RegExp(`https://${BUCKET_NAME}.s3.accelerate.amazonaws.com/${userName}/.*${extension || ''}\?.*Content-Type=${contentType ? contentType.replace('/','%2F') : 'image%2Fjpeg'}*`);

                    expect(url).toMatch(regex);
            })
    })