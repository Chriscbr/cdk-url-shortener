const { DynamoDB } = require("aws-sdk");

// probability of collisions should be pretty low!
function generateId(length) {
  let res = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const numCharacters = characters.length;
  for (let i = 0; i < length; i++) {
    res += characters.charAt(Math.floor(Math.random() * numCharacters));
  }
  return res;
}

exports.handler = async function (event) {
  console.log("request:", JSON.stringify(event, undefined, 2));

  const urlParam = `${(event.queryStringParameters || {}).url}?${
    (event.headers || {}).auth
  }`;
  if (!urlParam) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/plain" },
      body: "Error: must provide a valid url query parameter.",
    };
  }

  // create AWS DynamoDB client
  const dynamo = new DynamoDB();

  // check if URL is already shortened
  const response = await dynamo
    .query({
      TableName: process.env.URL_TABLE_NAME,
      KeyConditionExpression: "websiteUrl = :websiteUrl",
      ExpressionAttributeValues: {
        ":websiteUrl": {
          S: urlParam,
        },
      },
    })
    .promise();
  console.log("DynamoDB response:", JSON.stringify(response, undefined, 2));

  if (response.Items.length === 0) {
    const shortenedUrl = generateId(5);
    await dynamo
      .putItem({
        TableName: process.env.URL_TABLE_NAME,
        Item: {
          websiteUrl: { S: urlParam },
          shortenedUrl: { S: shortenedUrl },
        },
      })
      .promise();

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/plain" },
      body: `{"url": "${urlParam}", "shortenedUrlCode": "${shortenedUrl}"}`,
    };
  } else {
    const shortenedUrl = response.Items[0].shortenedUrl.S;
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/plain" },
      body: `{"url": "${urlParam}", "shortenedUrlCode": "${shortenedUrl}"}`,
      //body: `The url ${urlParam} has already been shortened to ${shortenedUrl}.\n`,
    };
  }
};
