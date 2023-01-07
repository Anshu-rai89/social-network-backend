const S3 = require('aws-sdk/clients/s3'),
    ulid = require('ulid'),
    s3 = new S3({useAccelerateEndpoint: true}) ;

module.exports.handler = async (event) => {
    const {BUCKET_NAME } = process.env,
        id = ulid.ulid(),
        userName = event.identity.userName;
    let key = `${userName}/${id}`;
    const extension = event.arguments.extension,
        contentType = event.arguments.contentType || 'image/jpeg';

    if(extension) {
        if(extension.startsWith('.')) {
            key+= extension
        }
        else 
        key+= `.${extension}`;
    }

    if(!contentType.startsWith('image/')) {
        throw new Error('Content type must be an image');
    }

    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        ACL: 'public-read',
        ContentType: contentType
    }

    const signedUrl = s3.getSignedUrl('putObject',params);
    return signedUrl;
}