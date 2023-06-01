const TweetTypes = {
    TWEET: 'Tweet',
    RETWEET: 'Retweet',
    REPLY: 'Reply',
}

const dynamodb = {
    MAX_BATCH_SIZE : 25
}

module.exports = {
    TweetTypes,
    dynamodb
}