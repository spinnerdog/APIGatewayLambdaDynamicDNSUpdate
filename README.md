# APIGatewayLambdaDynamicDNSUpdate
This Lambda script along with an API Gateway updates Route 53 DNS entries via source IP address or IP address specified in query string.

How to use.
1.  Create Lambda function insert updatedns.js.
2.  Create Role for Lambda function and attach the two policies in policies/Lambda.  Our you can customize to suit your needs.
3.  Set up an API Gateway as a Lambda Proy and associate the Lambda function above.
4.  Add   /{hostname+} Method to the API 
5.  Publish as a stage and call using a url similar to https://xxxxxx.execute-api.us-west-2.amazonaws.com/prod/newhostnametoaddorupdate

The source IP address of the calling host will be used to create or update an A record in the Route 53 zone configured in updatedns.js.


