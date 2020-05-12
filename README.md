# Introduction
## Background
This Project is intended to demostrate an outbound dialer and supporting web portal that can be used to check on vulnerable customer/residents in the community via a phone call, this requirement was concieved as a potential use-case for patients recently discharged from hospital or vulnerable members of the community who are shielding themselves during the Coronavirus pandemic.

A phone call was chosen as the mechanism to contact these residents as the most common option available to them. [Amazon Connect](https://aws.amazon.com/connect/) provides the Outbound dialing facility along with call centre agent features, [AWS Lambda](https://aws.amazon.com/lambda/) is used to provide the logic and [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) as the data store. [Amazon S3](https://aws.amazon.com/s3/) is also used to temporarily store new customer/resident information before it is processed into DynamoDB.

The Agent and Uploader website where Agents can answer calls, see additional information about callers and Uploaders can add new residents, is built using [AWS Amplify](https://aws.amazon.com/amplify/) to allow rapid development.  [Amazon Cognito](https://aws.amazon.com/cognito/) is used for Agent/Uploader authentication in the web portal.  [Amazon API Gateway](https://aws.amazon.com/api-gateway/) act as the gateway to Lambda and DynamoDB to GET and POST data.

# Overview
## Upload
Residents who have recently been discharged from hospital or have informed their local councils that they are self-isolating/shielding can be added to a CSV file that is then uploaded to the Agent Portal; to have permission to add new CSV data, the website user/agent must be a member of the `Uploaders` Cognito group. 

Upon uploading the CSV, the site places the file in an S3 bucket and an S3 event is created which triggers a Lambda function; the Lambda function reads the CSV and adds new customers/residents to the DynamoDB (existing customer/residents are not overwritten).

## Dialer 
1. An [EventBridge rule](https://docs.aws.amazon.com/eventbridge/latest/userguide/create-eventbridge-scheduled-rule.html) runs every 60 seconds and trigger the ConnectDialer Lambda
2. The ConnectDialer Lambda checks the Amazon Connect instance to see if there are agents online and ready to take calls (in our scenario it is not desirable to call residents unless there is an agent available for a call back), if no agents are available the Lambda exits. If agent(s) are available, the Lambda Function retrieves a list of customers/residents that are:
* Enabled
* Not successfully contacted for 24 hours
* A contact attempt has not been made in the last 5 mins
* No more than 3 contact attemps have been made in the last 24 hours
3. The ConnectDialer instructs the Connect instance to start an outbound call to each resident in the list and then increments the contactAttempts and lastAttempt times in DynamoDB for that customer/resident.
4. Connect initiates the outbound call and routes the resident into the Call Flow which asks "How are you felling? Press 1 for Happy or 2 if you would like to talk to someone"
5. If the customer/resident is Happy, Connect invokes the ConnectDialerSuccessUpdate lambda and disconnect the call.  If the customer/resident requests a call back, Connect invokes the ConnectDialerSuccessUpdate lambda and adds the customer/resident the call back queue and disconnects the call.
6. The ConnectDialerSuccessUpdate lambda updates that DynamoDB entry for the customer/resident with a successfulConnection (a customer answered and responded to the question) and notes the answer to the question (Happy/Sad).
7. When an agent becomes available, Connect will pop the next customer/resident from the queue and route the call to the available Agent (who is logged in via the web site) and the customer/resident details will be displayed along side the call. 
8. If the agent accepts the call Connect then makes the outbound call to the customer/resident, connecting the Agent and Customer/Resident.

## Agent Portal
![alt text](/diagrams/portal_incoming.png)

## Architecture
### Dialer
![alt text](/diagrams/dialer_architecture.png)

### Website
![alt text](/diagrams/website_architecture.png)

# Deploy
You can find instructions on how to deploy this project [here](/DEPLOY.md)

# License

This library is licensed under the MIT-0 License. See the [LICENSE](/LICENSE) file.
