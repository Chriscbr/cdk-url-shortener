const { DynamoDB } = require("aws-sdk");

exports.handler = async function (event) {
  console.log("request:", JSON.stringify(event, undefined, 2));

  const shortenedUrl = (event.pathParameters || {}).shortenedUrl;
  if (!shortenedUrl) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/plain" },
      body: "Error: must provide a valid shortened url.",
    };
  }

  // create AWS DynamoDB client
  const dynamo = new DynamoDB();

  // check if shortened URL is valid
  const response = await dynamo
    .query({
      TableName: process.env.URL_TABLE_NAME,
      IndexName: "shortenedUrlIndex",
      KeyConditionExpression: "shortenedUrl = :shortenedUrl",
      ExpressionAttributeValues: {
        ":shortenedUrl": {
          S: shortenedUrl,
        },
      },
    })
    .promise();
  console.log("DynamoDB response:", JSON.stringify(response, undefined, 2));

  if (response.Items.length === 0) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/plain" },
      body: `${shortenedUrl} is not associated with any URL.\n`,
    };
  } else {
    const websiteUrl = response.Items[0].websiteUrl.S;
    return {
      statusCode: 301,
      headers: {
        "Content-Type": "text/plain",
        Location: websiteUrl,
      },
    };
  }
};
