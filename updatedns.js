var util = require("util");
var AWS = require('aws-sdk');

// place zone id and zone name inthe form of '.mydomain.com' in this object
var R53Zone = { 
	"ZoneId": "XXXXXXXXXXXXXXX", 
	"ZoneName": '.mydomain.com',
	"TTL": 300,
	"RecordType": 'A'	
	};

exports.handler = (event, context, callback) => {
    var r53 = new AWS.Route53();
    var reIpv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    var listRRparams = {
          HostedZoneId: R53Zone.ZoneId, /* required */
          MaxItems: '1',
          StartRecordName: event.pathParameters.hostname + R53Zone.ZoneName,
          StartRecordType: R53Zone.RecordType
        };
    var recSetParams = {
              "HostedZoneId": R53Zone.ZoneId,
                "ChangeBatch": {
              "Comment": "",
              "Changes":[
                {
                  "Action":"UPSERT",
                  "ResourceRecordSet":{
                    "ResourceRecords":[
                      {
                        "Value": ""
                      }
                    ],
                    "Name": event.pathParameters.hostname + R53Zone.ZoneName,
                    "Type": R53Zone.RecordType,
                    "TTL": R53Zone.TTL
                  }
                }
              ]
            }};
    // '{' + "DATA: " + JSON.stringify(data) + ", EVENT: " + JSON.stringify( event ) + ", CONTEXT: " + JSON.stringify( context ) + '}'
    const done = (err, data ) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    
    // make sure we have a path parameter
    if( ! event.pathParameters ){ done( { message: "null or invalid path specified" }, null ); }
    
    // verify the source IP of the request is a valid ip and set in RecSetParams
    if( ! event.requestContext.identity.sourceIp.match(reIpv4) ){ 
        done( { message: "invalid source ip address " + event.requestContext.identity.sourceip + "." }, null ); 
    }
    recSetParams.ChangeBatch.Changes[0].ResourceRecordSet.ResourceRecords[0].Value = event.requestContext.identity.sourceIp;
    
    // if query string exists verify it looks like an ip address and use the ip to set the recSetParams
    if( event.queryStringParameters && event.queryStringParameters.ip ){
        if( ! String( event.queryStringParameters.ip ).match( reIpv4 ) ){
          done( { message: "attempt to set invalid ip address " + event.queryStringParameters.ip + "." }, null );   
        }
        recSetParams.ChangeBatch.Changes[0].ResourceRecordSet.ResourceRecords[0].Value =  String( event.queryStringParameters.ip );
    }
    
    // make sure a host name is provided
    if( ! event.pathParameters.hostname ){
        done( { message: "invalid hostname provided: " + event.pathParameters.hostname + "." }, null );
    }
    
    r53.listResourceRecordSets( listRRparams, function(err, data) {
        if (err) done(err, err.stack); // an error occurred
        
        if( data.ResourceRecordSets.length > 0 ){ // existing record make sure IP has changed before setting
           if( data.ResourceRecordSets[0].ResourceRecords[0].Value == recSetParams.ChangeBatch.Changes[0].ResourceRecordSet.ResourceRecords[0].Value ){
                done( err, { "Comment": "No update necessary. Rout53 matches provided IP address." } );
           }
        }
     
    // set a comment so we know what the call did
    recSetParams.ChangeBatch.Comment = "Setting " + recSetParams.ChangeBatch.Changes[0].ResourceRecordSet.Name + " " 
                                        + recSetParams.ChangeBatch.Changes[0].ResourceRecordSet.Type + " " 
                                        + recSetParams.ChangeBatch.Changes[0].ResourceRecordSet.TTL + " " 
                                        + recSetParams.ChangeBatch.Changes[0].ResourceRecordSet.ResourceRecords[0].Value;
                                        
    r53.changeResourceRecordSets( recSetParams, function(err, data) {
                done( err, data );
            });
      
});
 


};
