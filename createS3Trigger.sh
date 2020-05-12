#!/bin/bash          

if [ $# -eq 0 ]; then
    echo "usage: bash createS3Trigger.sh <awsprofile>"
    exit 1
fi

BUCKET=$(grep '"aws_user_files_s3_bucket"' ./src/aws-exports.js | sed -E 's/"(.*)": "(.*)",/\2/')
echo $BUCKET
BUCKETARN=$(echo "arn:aws:s3:::$BUCKET" | sed -E 's/ //g')
echo $BUCKETARN

{ # try
    LAMBDA=$(jq -r '.function.csvUploadStoreTrigger.output.Name' ./amplify/backend/amplify-meta.json)
} || { # catch
    echo "ERROR: You need to install jq:"
    echo "sudo yum install jq" 
    exit 1
}
#echo $LAMBDA

LAMBDAARN=$(aws lambda get-function --profile $1 --function-name $LAMBDA --query 'Configuration.FunctionArn' | sed -E 's/"//g')
echo $LAMBDAARN

#echo $1

sed -E "s/<lambdafunctionarn>/$LAMBDAARN/g" ./createS3Trigger.json > ./temp.createS3Trigger.json
jq "." ./temp.createS3Trigger.json

UUID=$(uuidgen)

ACCOUNTID=$(aws sts get-caller-identity --profile $1 --query Account --output text)

aws lambda add-permission --profile $1 --function-name $LAMBDA --statement-id $UUID --action "lambda:InvokeFunction" --principal s3.amazonaws.com --source-arn $BUCKETARN --source-account $ACCOUNTID
# list permissions
# aws lambda get-policy --profile <PROFILE> --function-name <LAMBDA> | jq '.Policy | fromjson | .Statement[].Sid'
# delete permisson if you make a mistake
# aws lambda remove-permission --profile <PROFILE> --function-name <LAMBDA> --statement-id <UUID>
aws s3api put-bucket-notification-configuration --profile $1 --bucket $BUCKET --notification-configuration file://temp.createS3Trigger.json
rm -f ./temp.createS3Trigger.json
