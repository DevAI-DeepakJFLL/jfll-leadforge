"""
AWS Lambda Entrypoint Bridge.
Routes incoming Lambda Function URL and API Gateway requests to the FastAPI application via Mangum.
Ensures compatibility whether the AWS Console Handler is configured as:
- 'lambda_function.lambda_handler' OR
- 'src.api.main.handler'
"""

from src.api.main import handler as lambda_handler

__all__ = ["lambda_handler"]
