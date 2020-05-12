/* Amplify Params - DO NOT EDIT
You can access the following resource attributes as environment variables from your Lambda function
var environment = process.env.ENV
var region = process.env.REGION
var storageContactsStoreName = process.env.STORAGE_CONTACTSSTORE_NAME
var storageContactsStoreArn = process.env.STORAGE_CONTACTSSTORE_ARN

Amplify Params - DO NOT EDIT *//*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/

var environment = process.env.ENV
var region = process.env.REGION
var storageContactsStoreName = process.env.STORAGE_CONTACTSSTORE_NAME
var storageContactsStoreArn = process.env.STORAGE_CONTACTSSTORE_ARN

var AWS = require('aws-sdk');
var express = require('express')
var bodyParser = require('body-parser')
var awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')

var IS_OFFLINE = process.env.ENV == 'local';
//var TABLE = 'ConnectDialer';
var TABLE = storageContactsStoreName
var dynamoDb = IS_OFFLINE === true ?
    new AWS.DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000',
    }) :
    new AWS.DynamoDB.DocumentClient();

// declare a new express app
var app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
});


/**********************
 * Example get method *
 **********************/

app.get('/telephonenumber', function(req, res) {
  const ddbparams = {
    TableName: TABLE,
    IndexName:'Enabled-lastSuccess',
    KeyConditionExpression: 'Enabled = 1'
  };
  
  dynamoDb.scan(ddbparams, (error, result) => {
    if (error) {
        res.status(400).json({error});
    }
    if (result) {
        res.json(result);
    }
  });
});

app.get('/telephonenumber/:id', function(req, res) {
  var id = req.params.id;

  const ddbparams = {
    TableName: TABLE,
    Key: {
      telephoneNumber: id
    }
  };

  dynamoDb.get(ddbparams, (error, result) => {
    if (error) {
        res.status(400).json({ error: 'Error retrieving TelephoneNumber' });
    }
    if (result.Item) {
        res.json(result.Item);
    }
    else {
        res.status(404).json({ error: `TelephoneNumber: ${id} not found` });
    }
  });
  
});

/****************************
* Example post method *
****************************/

app.post('/telephonenumber', async function(req, res) {
  var id = req.params.id;
  //console.log('Request Data');
  //console.log(req);
  var lastEvaluatedKey = req.body.LastEvaluatedKey;
  var scanIndexForward = req.body.ScanIndexForward;
  var filterEnabled = req.body.FilterEnabled;
  var changeOfDirection = req.body.ChangeOfDirection;
  var enabled = "0";
  var limit = 5;
  var lastSuccess = 1;
  if (filterEnabled){enabled = "1"}

  //console.log(data);
  //var dataEnabled = req.body.data.enabled
  //console.log(dataEnabled);

  // move the index cursor to the correct place if there is a change in direction of search
  if(changeOfDirection === true)
  {
    var ddbparams = {
      TableName: TABLE,
      IndexName:'Enabled-lastSuccess',
      Limit: (limit -1),
      KeyConditionExpression: "enabled = :e and lastSuccess > :ls",
      ExpressionAttributeValues: {
          ":e": enabled,
          ":ls": lastSuccess
      }
    };
    ddbparams.ScanIndexForward = scanIndexForward;
    if (lastEvaluatedKey != ""){
      ddbparams.ExclusiveStartKey = lastEvaluatedKey;
    } 
    
    console.log(JSON.stringify(ddbparams));
    
    try {
      var result = await dynamoDb.query(ddbparams).promise();
    } 
    catch (error) {
      res.status(400).json({error});
    }
    
    if (result) {
      lastEvaluatedKey = result.LastEvaluatedKey;
    }
  }

  var ddbparams = {
    TableName: TABLE,
    IndexName:'Enabled-lastSuccess',
    Limit: limit,
    KeyConditionExpression: "enabled = :e and lastSuccess > :ls",
    ExpressionAttributeValues: {
        ":e": enabled,
        ":ls": lastSuccess
    }
  };
  ddbparams.ScanIndexForward = scanIndexForward;
  if (lastEvaluatedKey != ""){
    ddbparams.ExclusiveStartKey = lastEvaluatedKey;
  } 
  
  //console.log('ddbparams');
  //console.log(JSON.stringify(ddbparams));
  
  try {
    var result = await dynamoDb.query(ddbparams).promise();
    res.json(result);
  } 
  catch (error) {
    res.status(400).json({error});
  }
});

app.post('/telephonenumber/*', function(req, res) {
  // Add your code here
  res.json({success: 'post call succeed!', url: req.url, body: req.body})
});

/****************************
* Example put method *
****************************/

app.put('/telephonenumber', function(req, res) {
  // Add your code here
  res.json({success: 'put call succeed!', url: req.url, body: req.body})
});

app.put('/telephonenumber/*', function(req, res) {
  // Add your code here
  res.json({success: 'put call succeed!', url: req.url, body: req.body})
});

/****************************
* Example patch method *
****************************/

app.patch('/telephonenumber', function(req, res) {
  // Add your code here
  res.json({success: 'patch call succeed!', url: req.url, body: req.body})
});

app.patch('/telephonenumber/:id', function(req, res) {
  var id = req.params.id;
  //console.log('Request Data');
  //console.log(req);
  var data = req.body.data
  //console.log(data);
  //var dataEnabled = req.body.data.enabled
  //console.log(dataEnabled);

  const ddbparams = {
    TableName: TABLE,
    Key: {
      telephoneNumber: id
    },
    UpdateExpression: "set enabled = :enabled, choice = :choice",
    ExpressionAttributeValues:{
        ":enabled": data.enabled,
        ":choice": data.choice
    },
    ReturnValues:"UPDATED_NEW"
  };

  console.log(JSON.stringify(ddbparams));

  const result = dynamoDb.update(ddbparams, function(err, data) {
    if (err) {
      console.log(err);
    }
    else {
      console.log(data);
    }
  });
  console.log(result);
  res.json({success: 'patch call succeed!', url: req.url, body: req.body})
});

/****************************
* Example delete method *
****************************/

app.delete('/telephonenumber', function(req, res) {
  // Add your code here
  res.json({success: 'delete call succeed!', url: req.url});
});

app.delete('/telephonenumber/:id', function(req, res) {
  var id = req.params.id;
  //console.log('Request Data');
  //console.log(req);
  //var data = req.body.data
  //console.log(data);
  //var dataEnabled = req.body.data.enabled
  //console.log(dataEnabled);

  const ddbparams = {
    TableName: TABLE,
    Key: {
      telephoneNumber: id
    }
  };

  console.log(JSON.stringify(ddbparams));

  const result = dynamoDb.delete(ddbparams, function(err, data) {
    if (err) {
      console.log(err);
    }
    else {
      console.log(data);
    }
  });
  console.log(result);
  res.json({success: 'delete call succeed!', url: req.url});
});

app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
