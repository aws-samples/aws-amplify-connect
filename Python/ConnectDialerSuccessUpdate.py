import json
import boto3
import os
from datetime import datetime, timedelta

table = os.environ["dynamoTable"]

client = boto3.client('dynamodb')

def lambda_handler(event, context):
    print(event)
    phonenum = event['Details']['ContactData']['CustomerEndpoint']['Address']
    
    if event['Details']['Parameters']['Choice'] == '1':
        choice = 'Happy'
    elif event['Details']['Parameters']['Choice'] == '2':
        choice = 'Sad'
    else:
        choice = 'Unknown'
    
    result = updateSuccessMetric(phonenum, choice)

    return {
        'statusCode': 200,
        'body': json.dumps(result, default=decimaldefault)
    }

def updateSuccessMetric(phnum, lastchoice):
    CA = client.get_item(
            TableName=table,
            Key={
                'TelephoneNumber': {
                    'S': phnum
                }
            },
            AttributesToGet=['SuccessfulConnection']
        )
    print('Existing SuccessfulConnection for ' + phnum + ':  ' + str(CA['Item']['SuccessfulConnection']['S']))
    counter = int(CA['Item']['SuccessfulConnection']['S'])
    counter += 1

    response = client.update_item(
        TableName=table,
        Key={
            'TelephoneNumber':{
                'S': phnum
            }
        },
        UpdateExpression="set SuccessfulConnection =:successes, lastSuccess=:time, lastSuccessDateTime=:dttime, contactAttempts =:attempts, choice =:choice",
        ExpressionAttributeValues={
            ':successes': {'S': str(counter)}, ':dttime':{'S':datetime.now().isoformat()}, ':attempts': {'S': '0'}, ':choice': {'S': lastchoice}, ':time':{'N': str(datetime.now().timestamp())}
        },
    )
    return response

def decimaldefault(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError