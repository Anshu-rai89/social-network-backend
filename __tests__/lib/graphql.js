const axios = require('axios');
const _ = require('lodash');

const throwOnErrors = (query, variables, error) => {
    console.log("Error Query",query);
    
    if(!_.isEmpty(error)) {
        const errorMessage = `
        query: ${query.substr(0, 100)}
        variables: ${JSON.stringify(variables)}
        errors: ${JSON.stringify(error)}
    `;

        throw new Error(errorMessage);
    }
    
}
module.exports = async (url, query, variables = {}, auth) => {
    try{
        const headers = {};

        if(auth) {
            headers.Authorization = auth;
        }

        console.log("Url",url,headers,query);
        const resp = await axios({
            method:'post',
            url,
            headers,
            data : {
                query,
                variables: JSON.stringify(variables)
            }
        });

        const {data,errors} = resp.data;
        console.log("data",resp, data, query,errors);
        throwOnErrors(query, variables, errors);
        return data;
    }catch(error) {
        console.log("error in request",error);
        const err = _.get(error, "response.data.errors");
        throwOnErrors(query, variables, err);
        throw err;
    }
}