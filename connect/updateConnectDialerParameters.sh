#!/bin/bash          

if [ $# -eq 0 ]; then
    echo "usage: bash createDialerFlow.sh <awsprofile> <connectinstanceid>"
    exit 1
fi

# load JSON
#JSON=$(jq '.' ../amplify/backend/function/ConnectDialerJS/parameters.json )
JSON="{}"

## Update Connect Whisper flow ARN
echo $2

CONNECTFLOWID=$(aws connect list-contact-flows --profile $1 --instance-id $2 | jq -r '.ContactFlowSummaryList[] | select (.Name == "SampleDialerFlow").Id')
echo $CONNECTFLOWID

PHONENUMBER=$(aws connect list-phone-numbers --profile $1 --instance-id $2 | jq -r '.PhoneNumberSummaryList[0].PhoneNumber')
echo $PHONENUMBER

QUEUEARN=$(aws connect list-queues --profile $1 --instance-id $2 | jq -r '.QueueSummaryList[] | select (.Name == "BasicQueue").Arn')
echo $QUEUEARN

JSON=$(echo "$JSON" | jq --arg variable "$2" '.instance |= $variable ')
JSON=$(echo "$JSON" | jq --arg variable "$CONNECTFLOWID" '.cFlowID |= $variable ')
JSON=$(echo "$JSON" | jq --arg variable "$PHONENUMBER" '.sourcePhoneNumber |= $variable ')
JSON=$(echo "$JSON" | jq --arg variable "$QUEUEARN" '.queue |= $variable ')

JSON=$(echo "$JSON" | jq --arg variable "3" '.maxAttempts |= $variable ')
JSON=$(echo "$JSON" | jq --arg variable "15" '.minutesBetweenCalls |= $variable ')
JSON=$(echo "$JSON" | jq --arg variable "1" '.minFreeAgents |= $variable ')
JSON=$(echo "$JSON" | jq --arg variable "1440" '.minutesBetweenSuccesses |= $variable ')
JSON=$(echo "$JSON" | jq --arg variable "SuccessfulConnection-index" '.index |= $variable ')
JSON=$(echo "$JSON" | jq --arg variable "cron(0/2 9-16 ? * MON-FRI *)" '.CloudWatchRule |= $variable ')

## Output to disk
echo "$JSON" | jq '.' > ../amplify/backend/function/ConnectDialerJS/parameters.json