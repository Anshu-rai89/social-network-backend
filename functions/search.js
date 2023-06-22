const _ = require("lodash");
const {SearchResults} = require('../lib/constants');
const { initTweetIndex } = require("../lib/algolia");
const middy = require("@middy/core");
const ssm = require("@middy/ssm");
const { STAGE } = process.env;
const chance = require('chance').Chance();

module.exports.handler = middy(async (event, context) => {
    const userId = event.identity.userName;
    const {query, mode, limit , nextToken} = event.arguments;
    console.log("Log", context, query, mode, limit);

    switch(mode) {
    case SearchResults.PEOPLE:
        return await searchPeople(context, query, userId, limit, nextToken);
    case SearchResults.LATEST:
        return await searchLatest(context, query, limit, nextToken);
    default:
        throw new Error('Only People and Latest are supported.'); 
    }
})
    .use(
    ssm({
        cache: true,
        cacheExpiryInMillis: 5 * 60 * 1000, // 5 mins
        fetchData: {
        ALGOLIA_APP_ID: `/${STAGE}/aloglia-app-id`,
        ALGOLIA_WRITE_KEY: `/${STAGE}/algolia-admin-key`,
        },
        setToContext: true,
        throwOnFailedCall: true,
    })
    )
    .before((request) => {
    globalDefaults = request.context?.defaults?.global;
    });

    async function searchPeople(context, query, userId, limit, nextToken) {
        const index = await initUserIndex(
        context.ALGOLIA_APP_ID,
        context.ALGOLIA_WRITE_KEY,
        STAGE
        );

        const searchParams = parseToken(nextToken) || {
        hitsPerPage: limit,
        page: 0
        };

        const {hits, page, nbPages} = await index.search(query, searchParams);
        hits.forEach(hit=> hit.__typeName = hit.id === userId ? 'MyProfile' : 'OtherProfile');

        let nextSearchParams;

        if(page+1 >= nbPages) {
            nextSearchParams = null;
        }
        else {
            nextSearchParams = Object.assign({}, searchParams, {page: page+1});
        }

        return {
            results: hits,
            nextToken: generateToken(nextSearchParams)
        }
    }

    async function searchLatest(context, query, limit, nextToken) {
      const index = await initTweetIndex(
        context.ALGOLIA_APP_ID,
        context.ALGOLIA_WRITE_KEY,
        STAGE
      );

      const searchParams = parseToken(nextToken) || {
        hitsPerPage: limit,
        page: 0,
      };

      const { hits, page, nbPages } = await index.search(query, searchParams);
      let nextSearchParams;

      if (page + 1 >= nbPages) {
        nextSearchParams = null;
      } else {
        nextSearchParams = Object.assign({}, searchParams, { page: page + 1 });
      }

      return {
        results: hits,
        nextToken: generateToken(nextSearchParams),
      };
    }

    function parseToken(nextToken) {

        if(!nextToken) {
            return null;
        }

        const token = Buffer.from(nextToken, 'base64').toString();
        const payload = JSON.parse(token);

        delete payload.random;
        return payload;
    }

    function generateToken(searchParams) {
        if(!searchParams) {
            return undefined;
        }

        const payload = Object.assign({}, searchParams, {random: chance.string({length: 16})});
        const token = JSON.stringify(payload);
        return Buffer.from(token).toString('base64');
    }