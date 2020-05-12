/* Amplify Params - DO NOT EDIT
You can access the following resource attributes as environment variables from your Lambda function
var environment = process.env.ENV
var region = process.env.REGION
var storageCsvUploadStoreBucketName = process.env.STORAGE_CSVUPLOADSTORE_BUCKETNAME
var storageCsvUploadStoreBucketName = process.env.STORAGE_CSVUPLOADSTORE_BUCKETNAME
var storageContactsStoreName = process.env.STORAGE_CONTACTSSTORE_NAME
var storageContactsStoreArn = process.env.STORAGE_CONTACTSSTORE_ARN

Amplify Params - DO NOT EDIT */

var environment = process.env.ENV
var region = process.env.REGION
var storageContactsStoreName = process.env.STORAGE_CONTACTSSTORE_NAME
var storageContactsStoreArn = process.env.STORAGE_CONTACTSSTORE_ARN

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const docClient = new AWS.DynamoDB.DocumentClient({region: region});
const csvtojson = require('csvtojson');


exports.handler = async function(event, context) {
  console.log('Received S3 event:', JSON.stringify(event, null, 2));
  // Get the object from the event and show its content type
  const bucket = event.Records[0].s3.bucket.name; //eslint-disable-line
  const key = event.Records[0].s3.object.key; //eslint-disable-line
  const suffix = key.split('.')[(key.split('.')).length - 1];
  console.log(suffix);
  if (suffix === 'csv'){
    const params = {Bucket: bucket, Key: key};
    console.log(JSON.stringify(params));

    // Now Datetime
    var now = new Date();
    var nowseconds = Math.round(now.getTime() / 1000);
    var nowisostring = now.toISOString();

    // Connect to S3 and read file into JSON object
    const stream = s3.getObject(params).createReadStream();
    const json = await csvtojson().fromStream(stream); //await here if async
    //console.log(JSON.stringify(json));

    const promises = [];
    await json.forEach( (obj) => {
      //console.log(`${obj.firstName} ${obj.lastName}`);
      //push each row into DynamoDB
      let params = {
        TableName: storageContactsStoreName,
        Item: {
            "firstName": obj.firstName,
            "lastName": obj.lastName,
            "telephoneNumber": obj.number,
            "enabled": "1",
            "choice": "new",
            "contactAttempts": 0,
            "lastSuccess": nowseconds,
            "lastAttempt": nowseconds,
            "lastAttemptDateTime": nowisostring,
            "lastSuccessDateTime": nowisostring,
            "successfulConnections": 0,
            "createdDateTime": nowisostring
        },
        ConditionExpression: 'attribute_not_exists(telephoneNumber)'
      };
      console.log(JSON.stringify(params));
      
      //console.log("Adding a new item based on: ");
      
      try {
        // https://www.freecodecamp.org/news/promise-all-in-javascript-with-example-6c8c5aea3e32/
        promises.push(docClient.put(params).promise().catch(e => e)); // allows returned promises to be handled as individual error by promise.all
        console.log(`${obj.number} promised`);
        //return { statusCode: 200, body: JSON.stringify({ params, data }) };
      } catch (error) {
        console.log(`${obj.number} error: ${error}`);
        //return {statusCode: 400,error: `Could not post: ${error.stack}`};
      }
    });
    
    let resultSet;
    console.log(JSON.stringify(promises));
    try {
      resultSet = await Promise.all(promises);
    }
    catch (error)
    {
      console.log(error);
    }
    console.log(JSON.stringify(resultSet));
    //await sleep(1000);
    //console.log('Paused for a while...');
    return {statusCode: 200,error: `Successfully processed: ${resultSet}`};
  } 
  else {
    return {statusCode: 400,error: `file type: ${suffix} != csv`};
  }
};

// hack to give dynamodb call a chance to complete
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
