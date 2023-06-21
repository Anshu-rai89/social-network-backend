const algoliaSearch = require('algoliasearch');
let userIndex;
let tweetIndex;

const initUserIndex = async (appId, key, stage) => {
    if(!userIndex) {
        const client =  algoliaSearch(appId, key);
        userIndex = client.initIndex(`users_${stage}`);
        await userIndex.setSettings({
            searchableAttributes: [
                "name", "screenName"
            ]
        });
    } 

    return userIndex;
}

const initTweetIndex = async (appId, key, stage) => {
  if (!tweetIndex) {
    const client = algoliaSearch(appId, key);
    tweetIndex = client.initIndex(`tweets_${stage}`);
    await tweetIndex.setSettings({
      searchableAttributes: ["text"],
      customRanking: [
        "desc(createdAt)"
      ]
    });
  }

  return tweetIndex;
};

module.exports = {
  initUserIndex,
  initTweetIndex,
};