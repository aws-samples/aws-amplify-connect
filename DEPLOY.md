# Connect Instance
## Create

Connect currently does not support CloudFormation so you will need to create and configure the instance manually. 

1. Login to the AWS Console and navigate to the "Amazon Connect" service.
2. Select "Add an instance"
3. Select "Store users within Amazon Connect" (you can choose one of the other options but for this guide we are keeping it simple) and enter a unique URL you'd like to use for you Connect user (Agents and Admins) directory.
4. Create yourself a new Connect admin account
5. Leave both Incoming and Outbound calls ticked
6. Read the information on the "Data storage" page but leave the settings at default
7. Create you instance (this will take a few minutes)

## Configure

Once your instance has been created

1. Click "Get Started" (or login with the instance URL)
2. Start the "Getting Started" wizards
3. Claim a number
4. Skip the rest of the wizard once you have claimed a number

# Portal
## Prerequisites
### Git

Install [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)

```
yum install git
```
 
### Node.js

Install [Node.js and NPM](https://nodejs.org/en/) 

```
yum install nodejs
```

### jq

Install [jq](https://stedolan.github.io/jq/download/)

```
yum install jq
```

### react-scripts

Install [react-scripts](https://www.npmjs.com/package/react-scripts)

```bash
npm install -g react-scripts
```

### AWS Amplify

Install [AWS Amplify](https://github.com/aws-amplify/amplify-cli)

```bash
npm install -g @aws-amplify/cli
```

**note:** if you have Amplify already installed you can check which version by running:

```bash
amplify --version
5.3.0
```

## Download and Configure

### Clone Repo

```bash
git clone https://github.com/aws-samples/aws-amplify-connect
```

### Configure Amplify

```bash 
amplify configure
```

Complete the configuration wizard, this will require logging into your AWS web console as part of the process.  Make sure you [choose a region that is supported by Amazon Connect and Amplify](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/). The output will be similar to this:

```
amplify configure
Follow these steps to set up access to your AWS account:

Sign in to your AWS administrator account:
https://console.aws.amazon.com/
Press Enter to continue

Specify the AWS Region
? region:  eu-west-2
Specify the username of the new IAM user:
? user name:  amplify-zzzzz
Complete the user creation using the AWS console
https://console.aws.amazon.com/iam/home?region=undefined#/users$new?step=final&accessKey&userNames=amplify-zzzzz&permissionType=policies&policies=arn:aws:iam::aws:policy%2FAdministratorAccess
Press Enter to continue

Enter the access key of the newly created user:
? accessKeyId:   AKIA**********************
? secretAccessKey:  ****************************************
This would update/create the AWS Profile in your local machine
? Profile Name:  sandbox

Successfully set up the new user.
```

Now initialise the project 

```bash 
cd aws-amplify-connect
amplify init
```

When prompted, you do not want to use an existing environment (this is new deployment), provide a name for your environement (I called mine 'test' for this example) and choose your default editor (I selected None as I used cloud9 to run this example).

**Note** "amplify init" must be run in the root directory of the project

Amplify will now initialise the AWS environment for you using the credentials you configured earlier. The output will be similar to this: 

```
amplify init
Note: It is recommended to run this command from the root of your app directory
? Do you want to use an existing environment? No
? Enter a name for the environment test
? Choose your default editor: None
Using default provider  awscloudformation

For more information on AWS Profiles, see:
https://docs.aws.amazon.com/cli/latest/userguide/cli-multiple-profiles.html

? Do you want to use an AWS profile? Yes
? Please choose the profile you want to use sandbox
Adding backend environment test to AWS Amplify Console app: **************
⠴ Initializing project in the cloud...
```

### Install Project NPM modules

Install the modules for the project from `package.json`, run in the root folder of the project:

```bash 
npm install
```

### Configure the CCP URL

Create the CCP config file

```bash
cp ./src/example.connect-url.js ./src/connect-url.js
```

Edit `./src/connect-url.js` and update the url to match your Connect instance.

## Deploy

### Amplify Publish

To deploy the project run "amplify publish" from the root directoy of the project, this will use CloudFormation to deploy all of the backend services as well as publish the front end website.

```bash
amplify publish
```

Note the URL that is output at the end of this command, this is the URL you will use to log into the new portal. 
You can find this URL again by running `amplify status`

### S3 trigger

There is currently a bug in Amplify that prevents an S3 event being created for a Lambda function that already has permission to access the same S3 bucket.  

To work around this issue there is a bash script that will create this event for you: in the root directory of the project run the following command:

```
bash createS3Trigger.sh <awsprofile>
```

# Configure Connect

## Update Connect with the Portal URL

1. Login to the AWS Console and navigate to the "Amazon Connect" service.
2. Select your instance in the "Instance Alias" column
3. Select "Approved origins"
4. Select "Add Origin" and add the url of your Portal  

**Note** The Connect agent console will not load in the portal until you complete this step

## Connect Lambda config

1. Login to the AWS Console and navigate to the "Amazon Connect" service.
2. Select your instance in the "Instance Alias" column
3. Select "Contact flows"
4. In the "AWS Lambda" section, use the drop down to select the "ConnectDialerSuccessUpdateJS-yourEnvironment" function and Click "Add Lambda Function"

This allow Amazon Connect to call that Lambda function as part of a contact flow (which we will create next).

## Connect flow creation
### Find your Connect Instance ARN

1. Login to the AWS Console and navigate to the "Amazon Connect" service.
2. Select your instance in the "Instance Alias" column
3. Select "Overview"
4. Take a note of your instance id (the GUID after the "/" of the Instance ARN)

### Generate the DialerFlow
On the command line, from the root folder

```bash 
cd connect
bash createDialerFlow.sh <awsprofile> <connectinstanceid>
cd ..
```

This will process the sampleDialerFlow.json and insert the correct ARNs for your connect instance.

### Load the Flow into Connect

1. Login to the AWS Console and navigate to the "Amazon Connect" service.
2. Select your instance in the "Instance Alias" column
3. Select "Overview"
4. Click the "Login URL" link to open your Connect Instance
5. Login to the Connect Instance
6. Use the left navigation to select "Routing, Contact flows"
7. Click "Create contact flow"
8. Using the drop down menu in the upper right corner, select "Import flow (beta)"
9. Browse to and select the newly created flow, in the connect folder: "generatedDialerFlow.json"
10. Using the drop down menu in the upper right corner, select "Save & publish"

### Associate a number with the Flow

Whilst this flow will be used for customers that we dial outbound, we'd also like to be able to dial this flow inbound, to do this:

1. Login to the AWS Console and navigate to the "Amazon Connect" service.
2. Select your instance in the "Instance Alias" column
3. Select "Overview"
4. Click the "Login URL" link to open your Connect Instance
5. Login to the Connect Instance
6. Use the left navigation to select "Routing, Phone numbers"
7. Click on the number you claimed earlier
8. In the "Contact flow / IVR" drop down, select "SampleDialerFlow"
9. Click "Save"

## Update the Lambda Dialer

Now that all the connect flows are created we can update the lambda dialer to make use of them

Run these commands starting in the root folder of the project (replacing \<varibles\> where indicated):

```bash
cd connect
bash updateConnectDialerParameters.sh <awsprofile> <connectinstanceid>
cd ..
```

This command creates the file `./amplify/backend/function/ConnectDialerJS/parameters.json` similar to this example:

```json
{
  "instance": "72202a3f-78e4-496c-a01b-9a8c09a1a077",
  "cFlowID": "b7873d0a-7cf5-4b9f-ac36-4a76f33ef286",
  "sourcePhoneNumber": "+44xxxxxxxxxx",
  "maxAttempts": "3",
  "minutesBetweenCalls": "15",
  "minFreeAgents": "1",
  "minutesBetweenSuccesses": "1440",
  "index": "SuccessfulConnection-index",
  "CloudWatchRule": "cron(0/2 9-16 ? * MON-FRI *)"
}
```

The "CloudWatchRule" is the [cron rule](https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html) which will govern when outbound calls are made.  You can change this to suit your needs by editing this file now or later and running `amplify push`.  We need to run this now, so in the root folder of the project:

```bash
amplify push
```

# Create Users

## Create Cognito Users

In the root folder of your project run the following command

```bash
amplify auth console
```

and select `User pool`, the output should be similar to the following:

```bash
Using service: Cognito, provided by: awscloudformation
? Which console User Pool
User Pool console:
https://eu-west-2.console.aws.amazon.com/cognito/users/?region=eu-west-2#/pool/eu-west-2_zzzzzzzzz/details
```

In a browser navigate to the generated URL, then select "Users and Groups" and using the "Create user" button create a new user for yourself with a valid email address, but untick and don't enter a phone number. 

While you are waiting for the signup email to arrive, `edit your new account and add your newly created user to the "Uploaders" group`.

## Create Connect Users (Agents)

1. Login to the AWS Console and navigate to the "Amazon Connect" service.
2. Select your instance in the "Instance Alias" column
3. Select "Overview"
4. Click the "Login URL" link to open your Connect Instance
5. Login to the Connect Instance
6. Use the left navigation to select "Users, User management"
7. Click "Add new users"
8. Click "Next" leaving the option set to "Create and set up a new user."
9. Populate the form with a new users information and from the drop downs "Basic Routing Profile", "Agent",  "Soft phone", and click "Save"
10. Click "Create users"

# Using the portal
## Agent Login

Once you have both a Connect and Cognito user account, browse to your website portal (find the URL again by running `amplify status`) and then login with your new Cognito account.  Once the agent portal renders, a second tab should open and you will then need to login with your Connect portal credentials.  This second tab should close automatically once login is successful. 

## Upload users
On the upload tab (only displayed if the agent is a member of the Uploaders group in cognito) select a csv on your local disk and upload.  The system will process the users in a few seconds.

Format of CSV file

```csv
firstName,lastName,number
Joe,Bloggs,+441111111111
Eve,Bloggs,+442222222222
```

## Wait for calls
Setting your agent status to `Available` will allow the Connect Dialer to begin dialing customer/residents in the database. Once a customer has requested a call back and they are moved into the the call back queue and hung up, it takes ~2 minutes before the customer call back is attempted, the customer is not actually called until an agent accepts the call from the queue.

# Trouble Shooting
## Service Limits
### Connect 
By default Amazon Connect has a number of [service limits](https://docs.aws.amazon.com/connect/latest/adminguide/amazon-connect-service-limits.html) in place on new deployments that require a quota increase request to remove e.g. Outbound calls to +447 prefix is limited by default and would prevent successful outbound calls.

# Deleting the Project
## Connect
1. Login to the AWS Console and navigate to the "Amazon Connect" service.
2. Tick your instance in the "Instance Alias" column
3. Click "Remove"

## Amplify
In the root folder of your project run the following command and follow the prompts:
```bash
amplify delete
```
