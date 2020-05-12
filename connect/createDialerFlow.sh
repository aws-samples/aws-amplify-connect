#!/bin/bash          

if [ $# -eq 0 ]; then
    echo "usage: bash createDialerFlow.sh <awsprofile> <connectinstanceid>"
    exit 1
fi

# load JSON
JSON=$(jq '.' ./sampleDialerFlow.json)

## Update Lambda ARNs
{ # try
    LAMBDA=$(jq -r '.function.ConnectDialerSuccessUpdateJS.output.Name' ../amplify/backend/amplify-meta.json)
} || { # catch
    echo "ERROR: You need to install jq:"
    echo "sudo yum install jq" 
    exit 1
}
echo $LAMBDA

LAMBDAARN=$(aws lambda get-function --profile $1 --function-name $LAMBDA --query 'Configuration.FunctionArn' | sed -E 's/"//g')
echo $LAMBDAARN

JSON=$(echo $JSON | jq --arg variable "$LAMBDAARN" '(.modules[] | select (.type == "InvokeExternalResource") | .parameters[] | select (.name == "FunctionArn") | .value) |= $variable ') #> ./generatedDialerFlow.json

## Update Connect Whisper flow ARN
DEFAULTAGENTWHISPERARN=$(aws connect list-contact-flows --profile $1 --instance-id $2 | jq -r '.ContactFlowSummaryList[] | select (.Name == "Default agent whisper").Arn')
echo $DEFAULTAGENTWHISPERARN

JSON=$(echo $JSON | jq --arg variable "$DEFAULTAGENTWHISPERARN" '(.modules[] | select (.type == "SetEventHook") | .parameters[] | select (.name == "ContactFlowId") | .value) |= $variable ')
JSON=$(echo $JSON | jq --arg variable "$DEFAULTAGENTWHISPERARN" '(.modules[] | select (.type == "SetEventHook") | .metadata.contactFlow.id) |= $variable ')

## Update Connect Queue
DEFAULTQUEUEARN=$(aws connect list-queues --profile $1 --instance-id $2 | jq -r '.QueueSummaryList[] | select (.Name == "BasicQueue").Arn')
echo $DEFAULTQUEUEARN

JSON=$(echo $JSON | jq --arg variable "$DEFAULTQUEUEARN" '(.modules[] | select (.type == "CreateCallback") | .parameters[] | select (.name == "Queue") | .value) |= $variable ')
JSON=$(echo $JSON | jq --arg variable "$DEFAULTQUEUEARN" '(.modules[] | select (.type == "CreateCallback") | .metadata.queue.id) |= $variable ')


## Output to disk
echo $JSON | jq '.' > ./generatedDialerFlow.json