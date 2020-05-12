/* Amplify Params - DO NOT EDIT
You can access the following resource attributes as environment variables from your Lambda function
var environment = process.env.ENV
var region = process.env.REGION
var storageContactsStoreName = process.env.STORAGE_CONTACTSSTORE_NAME
var storageContactsStoreArn = process.env.STORAGE_CONTACTSSTORE_ARN

Amplify Params - DO NOT EDIT */

var environment = process.env.ENV;
var region = process.env.REGION;
var storageContactsStoreName = process.env.STORAGE_CONTACTSSTORE_NAME;
var storageContactsStoreArn = process.env.STORAGE_CONTACTSSTORE_ARN;

const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({region: region});

exports.handler = async (event) => {
    // log event 
    console.log('Received Event:', JSON.stringify(event, null, 2));

    // collect details from event 
    var phonenum = event['Details']['ContactData']['CustomerEndpoint']['Address'];
    var eventChoice = event['Details']['Parameters']['Choice'];
    
    // Choice (Mood) if...
    var choice  = 'Unknown';
    if (eventChoice === '1'){
        choice = 'Happy';
    } else if (eventChoice === '2') {
        choice = 'Sad';
    }

    // Now Datetime
    var now = new Date();
    var nowseconds = Math.round(now.getTime() / 1000);
    var nowisostring = now.toISOString();

    // DynamoDB update parameters
    let params = {
        TableName: storageContactsStoreName,
        Key: {
            "telephoneNumber": phonenum
        },
        UpdateExpression: "set successfulConnections = successfulConnections + :val, lastSuccess = :time, lastSuccessDateTime = :dttime, contactAttempts = :attempts, choice = :choice",
        ExpressionAttributeValues: {
            ':dttime': nowisostring, 
            ':attempts': 0, 
            ':choice': choice, 
            ':time': nowseconds,
            ':val': 1
        }
    };
    console.log(JSON.stringify(params));
    var resultPromise = docClient.update(params).promise();
    var result = await resultPromise;
    console.log(result);
    
    // build response
    const response = {
        statusCode: 200,
        body: "Done",
    };
    return response;
};
