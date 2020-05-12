/* Amplify Params - DO NOT EDIT
You can access the following resource attributes as environment variables from your Lambda function
var environment = process.env.ENV
var region = process.env.REGION
var storageContactsStoreName = process.env.STORAGE_CONTACTSSTORE_NAME
var storageContactsStoreArn = process.env.STORAGE_CONTACTSSTORE_ARN

Amplify Params - DO NOT EDIT */

// collect environment variables 
var environment = process.env.ENV;
var region = process.env.REGION;
var storageContactsStoreName = process.env.STORAGE_CONTACTSSTORE_NAME;
var storageContactsStoreArn = process.env.STORAGE_CONTACTSSTORE_ARN;

const ma      = parseInt(process.env.maxAttempts);
const minbc   = parseInt(process.env.minutesBetweenCalls);
const queue   = process.env.queue;
const minFA   = process.env.minFreeAgents;
const cFlowID = process.env.cFlowID;
const cID     = process.env.instance;
const sNum    = process.env.sourcePhoneNumber;
const index   = process.env.index;
const minbs   = parseInt(process.env.minutesBetweenSuccesses);

const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({region: region});
const connect = new AWS.Connect(); 

exports.handler = async (event) => {
    // log event 
    console.log('Received Event:', JSON.stringify(event, null, 2));

    // get # of available agents
    var agentsAvailable = await GetConnectMetric(queue,cID);
    console.log(`Agents available: ${agentsAvailable}`);

    // setup response text
    var responseText = "";

    // if agents are available
    if (agentsAvailable >= 1){ // temp zero value for testing
        console.log(`Starting dialer as ${agentsAvailable} agent(s) are available:`);
        var result = await queryDDB();
        console.log(`DDB Query result: ${result.Count}`);
        if (result.Count > 0){
            let placedCalls = await callOutbound(result['Items']);
            responseText = placedCalls;
        } else {
            console.log(`No numbers ready to call`);
            responseText = "No numbers ready to call";
        }
    }

    // reset if attempts is eq maxAttempts, reset if attempt time is older than (minutesBetweenSuccesses) 24 hours
    await resetMaxAttempts();

    // build response
    const response = {
        statusCode: 200,
        body: JSON.stringify(responseText),
    };
    return response;
};

// Function to reset if attempts is eq maxAttempts, reset if attempt time is older than (minutesBetweenSuccesses) 24 hours
async function resetMaxAttempts(){
    // Now Datetime
    var now = new Date();
    var nowseconds = Math.round(now.getTime() / 1000);
    
    var lastSuccessThreshold = nowseconds - (minbs * 60);
    console.log(`lastSuccessThreshold: ${lastSuccessThreshold}`);

    // Get users with a last success older than threshold

    // DynamoDB parameters
    let params = {
        TableName: storageContactsStoreName,
        IndexName:'Enabled-lastSuccess',
        KeyConditionExpression: 'enabled = :enabled and lastSuccess < :lst',
        FilterExpression: 'lastAttempt < :lst and contactAttempts >= :ma',
        ExpressionAttributeValues: {
            ':enabled': "1",
            ':lst': lastSuccessThreshold,
            ':ma': ma
        }
    };
    console.log(`resetMaxAttempts query DDB params: ${JSON.stringify(params)}`);

    try {
        var result = await docClient.query(params).promise();
    } catch (error) {
        console.error(JSON.stringify(error));
        return {"Count": -1};
    }
    console.log(`resetMaxAttempts query DDB result: ${JSON.stringify(result)}`);

    if (result['Count'] > 0){
        await result.Items.forEach(async (item) => {
            let dynamoParams = {
                TableName: storageContactsStoreName,
                Key: {
                    "telephoneNumber": item["telephoneNumber"]
                },
                UpdateExpression: "set contactAttempts = :attempts",
                ExpressionAttributeValues: {
                    ':attempts': 0
                }
            };
            console.log(`resetMaxAttempts update DDB params: ${JSON.stringify(dynamoParams)}`);

            try {
                var result = await docClient.update(dynamoParams).promise();
            } catch (error) {
                console.error(error);
            }
            console.log(`queryDDB result: ${result}`); 
        });

        return {"Count": result['Count']};
    } else {
        return {"Count": 0};
    }
}

async function callOutbound(phoneNumbers){
    // Start outbound call for each entry and update entry in DB

    //const promises = [];
    await phoneNumbers.forEach(async (item) => {
        var formatted = item['telephoneNumber'];
        console.log(`Attempting Call: ${formatted}`);

        let connectParams = {
            DestinationPhoneNumber: formatted,
            ContactFlowId: cFlowID,
            InstanceId: cID,
            SourcePhoneNumber: sNum
        };

        try {
            var response = await connect.startOutboundVoiceContact(connectParams).promise();
            console.log(response);
            console.log(`Call success for: ${response}`);
        } catch (error) {
            console.error(error);
        }

        //publishCWMetric()

        // Now Datetime
        var now = new Date();
        var nowseconds = Math.round(now.getTime() / 1000);
        var nowisostring = now.toISOString();

        let dynamoParams = {
            TableName: storageContactsStoreName,
            Key: {
                "telephoneNumber": item["telephoneNumber"]
            },
            UpdateExpression: "set contactAttempts = contactAttempts + :val, lastAttempt=:la, lastAttemptDateTime=:ladt",
            ExpressionAttributeValues: {
                ':val': 1,
                ':la': nowseconds,
                ':ladt': nowisostring
            }
        };
        console.log(`update DDB params: ${JSON.stringify(dynamoParams)}`);

        try {
            var result = await docClient.update(dynamoParams).promise();
        } catch (error) {
            console.error(error);
        }
        console.log(`queryDDB result: ${result}`); 
    });
}

async function queryDDB(){

    // Now Datetime
    var now = new Date();
    var nowseconds = Math.round(now.getTime() / 1000);
    //var nowisostring = now.toISOString();

    var lastSuccessThreshold = nowseconds - (minbs * 60);
    //console.log(`lastSuccessThreshold: ${lastSuccessThreshold}`);
    var lastAttemptThreshold = nowseconds - (minbc * 60);
    //console.log(`lastAttemptThreshold: ${lastAttemptThreshold}`);

    // DynamoDB parameters
    let params = {
        TableName: storageContactsStoreName,
        IndexName:'Enabled-lastSuccess',
        KeyConditionExpression: 'enabled = :enabled and lastSuccess < :lst',
        FilterExpression: 'lastAttempt < :lat and contactAttempts < :ma',
        ExpressionAttributeValues: {
            ':enabled': "1",
            ':lst': lastSuccessThreshold,
            ':lat': lastAttemptThreshold,
            ':ma': ma
        }
    };
    console.log(`queryDDB params: ${JSON.stringify(params)}`);

    try {
        var result = await docClient.query(params).promise();
    } catch (error) {
        console.error(JSON.stringify(error));
        return {"Count": -1};
    }
    console.log(`queryDDB result: ${JSON.stringify(result)}`);

    if (result['Count'] > 0){
        return result;
    } else {
        return {"Count": 0};
    }
}

async function GetConnectMetric(queue, cID){
    var params = {
        InstanceId: cID,
        Filters: {
            'Queues': [
                queue,
            ],
            'Channels': [
                'VOICE',
            ]
        },
        Groupings: [
            'QUEUE',
        ],
        CurrentMetrics: [
            {
                'Name': 'AGENTS_AVAILABLE',
                'Unit': 'COUNT'
            },
        ]
    };
    
    try {
        var response = await connect.getCurrentMetricData(params).promise();
    } catch (error) {
        console.error(JSON.stringify(error));
        return -1;
    }
    //console.log(`Connect metrics response: ${JSON.stringify(response)}`);

    if (response["MetricResults"]){
        return response["MetricResults"][0]["Collections"][0]["Value"];
    } else {
        return -1;
    }
}