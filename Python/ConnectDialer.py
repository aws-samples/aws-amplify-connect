import json, boto3, os
from boto3.dynamodb.conditions import Key, Attr
from datetime import datetime, timedelta
from decimal import Decimal

client = boto3.client('dynamodb')
connect = boto3.client('connect')
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):

    ma = os.environ['maxAttempts']
    minbc = int(os.environ['minutesBetweenCalls'])
    Q = os.environ['queue']
    minFA = os.environ['minFreeAgents']
    cFlowID = os.environ['cFlowID']
    cID = os.environ['instance']
    sNum = os.environ['sourcePhoneNumber']
    dtbl = os.environ['dynamoTable']
    index = os.environ['index']
    minbs = int(os.environ['minutesBetweenSuccesses'])

    #aAgents = GetConnectMetric(Q, cID)
    aAgents = 1 # hard coded for now...
    result = 'none'
    if (aAgents >= int(minFA)):
        print("Ready!  available agents: " + str(aAgents))

        result = queryDDB(dtbl, index, minbc, ma, minbs)
        print(result)
        if(result['Count'] > 0):
            callOutbound(result['Items'], cFlowID, cID, sNum, dtbl) 
        else:
            print('No numbers ready')
    else:
        print("no avail agents: " + str(aAgents))

    # reset if attempts is eq maxAttempts, reset if attempt time is older than (minutesBetweenSuccesses) 24 hours
    resetMaxAttempts(dtbl, index, ma, minbs)
    
    return {
        'statusCode': 200,
        'body': json.dumps(result, default=decimaldefault)
    }


def queryDDB(table, index, minInterval, maxAttempts, successInterval):

    table = dynamodb.Table(table)

    lastSuccessThreshold = Decimal((datetime.now() - timedelta(minutes=successInterval)).timestamp())
    print(lastSuccessThreshold)
    lastAttemptThreshold = Decimal((datetime.now() - timedelta(minutes=minInterval)).timestamp())
    print(lastAttemptThreshold)

    response = table.query(
        IndexName='Enabled-lastSuccess-index',
        KeyConditionExpression=Key('Enabled').eq('1') & Key('lastSuccess').lt(lastSuccessThreshold),
        FilterExpression=Attr('lastAttempt').lt(lastAttemptThreshold) & Attr('contactAttempts').lt(str(maxAttempts))
    )
    
    #response = table.query(
    #    IndexName=index,
    #    KeyConditionExpression=Key('SuccessfulConnection').eq('0'),
    #    FilterExpression=Attr('lastAttempt').lt(lastAttemptDate)&Attr('contactAttempts').lt(str(maxAttempts))
    #)

    print('Query Results: ' + str(response['Count']))
    return response


def callOutbound(phoneNumbers, cFlowID, cID, sNum, table):
    # Start outbound call for each entry and update entry in DB

    for item in phoneNumbers:
        formatted = item['TelephoneNumber']
        print('Attempting Call:  ' + formatted)

        try:
            response = connect.start_outbound_voice_contact(
                DestinationPhoneNumber=formatted,
                ContactFlowId=cFlowID,
                InstanceId=cID,
                SourcePhoneNumber=sNum
            )
            print('Call success for: ' + formatted)
        except Exception as inst:
            print('Error: ', inst )

        CA = client.get_item(
            TableName=table,
            Key={
                'TelephoneNumber': {
                    'S': item["TelephoneNumber"]
                }
            },
            AttributesToGet=['contactAttempts']
        )
        print('Existing attempts for ' + formatted + ':  ' + str(CA['Item']['contactAttempts']['S']))
        counter = int(CA['Item']['contactAttempts']['S'])
        counter += 1

        #publishCWMetric()

        client.update_item(
            TableName=table,
            Key={
                'TelephoneNumber': {
                    'S': item["TelephoneNumber"]
                }
            },
            UpdateExpression="set contactAttempts =:attempts, lastAttempt=:time, lastAttemptDateTime=:dttime",
            ExpressionAttributeValues={
                ':attempts': {'S': str(counter)},':time':{'N': str(datetime.now().timestamp())}, ':dttime':{'S':datetime.now().isoformat()}
            },
        )


def GetConnectMetric(Q, cID):
    response = connect.get_current_metric_data(
        InstanceId=cID,
        Filters={
            'Queues': [
                Q,
            ],
            'Channels': [
                'VOICE',
            ]
        },
        Groupings=[
            'QUEUE',
        ],
        CurrentMetrics=[
            {
                'Name': 'AGENTS_AVAILABLE',
                'Unit': 'COUNT'
            },
        ]
    )

    if not response["MetricResults"]:
        return 0
    else:
        return response["MetricResults"][0]["Collections"][0]["Value"]

def decimaldefault(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


## Function to reset if attempts is eq maxAttempts, reset if attempt time is older than (minutesBetweenSuccesses) 24 hours
def resetMaxAttempts(table, index, maxAttempts, successInterval):

    table = dynamodb.Table(table)

    lastSuccessThreshold = Decimal((datetime.now() - timedelta(minutes=successInterval)).timestamp())
    print(lastSuccessThreshold)

    response = table.query(
        IndexName='Enabled-lastSuccess-index',
        KeyConditionExpression=Key('Enabled').eq('1') & Key('lastSuccess').lt(lastSuccessThreshold),
        FilterExpression=Attr('lastAttempt').lt(lastSuccessThreshold)&Attr('contactAttempts').gte(str(maxAttempts))
    )
    
    for item in response['Items']:
        phnum = item['TelephoneNumber']
        print("phnum: " + phnum)
        
        updateresponse = client.update_item(
            TableName=table.name,
            Key={
                'TelephoneNumber':{
                    'S': phnum
                }
            },
            UpdateExpression="set contactAttempts =:attempts",
            ExpressionAttributeValues={
                ':attempts': {'S': '0'}
            },
        )
    return response

