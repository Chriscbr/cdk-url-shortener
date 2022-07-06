import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as dynamodb from "@aws-cdk/aws-dynamodb";

export class UrlShortenerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // defines a DynamoDB table
    const table = new dynamodb.Table(this, "UrlTable", {
      partitionKey: {
        name: "websiteUrl",
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      //readCapacity: 1,
      //writeCapacity: 1,
      timeToLiveAttribute: "TTL",
    });
    table.addGlobalSecondaryIndex({
      indexName: "shortenedUrlIndex",
      partitionKey: {
        name: "shortenedUrl",
        type: dynamodb.AttributeType.STRING,
      },
    });

    // defines an AWS Lambda instance
    const createUrlLambda = new lambda.Function(this, "CreateUrlHandler", {
      runtime: lambda.Runtime.NODEJS_12_X, // execution environment
      code: lambda.Code.fromAsset("create-url-lambda"), // directory to load code
      handler: "index.handler", // file is "index", function is "handler"
      environment: {
        URL_TABLE_NAME: table.tableName,
      },
    });

    const cfnFuncUrlCreateURLLambda = new cdk.CfnResource(
      this,
      "cfnFuncUrlCreateURLLambda",
      {
        type: "AWS::Lambda::Url",
        properties: {
          Cors: { AllowOrigins: ["*"] },
          AuthType: "NONE",
          TargetFunctionArn: createUrlLambda.functionArn,
        },
      }
    );
    new cdk.CfnResource(this, "funcURLPermissionCreateLambda", {
      type: "AWS::Lambda::Permission",
      properties: {
        FunctionName: createUrlLambda.functionName,
        Principal: "*",
        Action: "lambda:InvokeFunctionUrl",
        FunctionUrlAuthType: "NONE",
      },
    });
    new cdk.CfnOutput(this, "outputFuncUrlCreateLambda", {
      value: cfnFuncUrlCreateURLLambda.getAtt("FunctionUrl").toString(),
    });

    // defines another AWS Lambda instance
    const visitUrlLambda = new lambda.Function(this, "VisitUrlHandler", {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset("visit-url-lambda"),
      handler: "index.handler",
      environment: {
        URL_TABLE_NAME: table.tableName,
      },
    });

    const cfnFuncUrlVisitURLLambda = new cdk.CfnResource(
      this,
      "cfnFuncUrlVisitURLHandler",
      {
        type: "AWS::Lambda::Url",
        properties: {
          Cors: { AllowOrigins: ["*"] },
          AuthType: "NONE",
          TargetFunctionArn: visitUrlLambda.functionArn,
        },
      }
    );
    new cdk.CfnResource(this, "funcURLPermissionVisitLambda", {
      type: "AWS::Lambda::Permission",
      properties: {
        FunctionName: visitUrlLambda.functionName,
        Principal: "*",
        Action: "lambda:InvokeFunctionUrl",
        FunctionUrlAuthType: "NONE",
      },
    });
    new cdk.CfnOutput(this, "outputFuncUrlVisitLambda", {
      value: cfnFuncUrlVisitURLLambda.getAtt("FunctionUrl").toString(),
    });

    // Grant DynamoDB permissions to the lambda functions
    table.grantReadWriteData(createUrlLambda);
    table.grantReadData(visitUrlLambda);
  }
}
