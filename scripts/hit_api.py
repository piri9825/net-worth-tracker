import requests
import pandas as pd
import ast

url = "http://localhost:8000/api"

accounts_endpoint = f"{url}/accounts/"
values_endpoint = f"{url}/values/"

## Create an Account
# response = requests.post(accounts_endpoint, json={"name": "Pensions (pre-splitting up)"})
# print(response.json())

## Delete an Account
# response = requests.delete(accounts_endpoint+ "InvestEngine Pension")
# print(response.json())

## Post a Value
# response = requests.post(values_endpoint, json={"account_name": "Emergency Fund", "amount": 2000, "date": "2025-05-31"})
# print(response.json())

## Get Accounts
# response = requests.get(accounts_endpoint)
# print(response.json())


## Create accounts from csv
df = pd.read_csv("accounts.csv")

for row in df.itertuples():
    tags = ast.literal_eval(row.tags)
    response = requests.post(
        accounts_endpoint,
        json={"name": row.name, "description": row.description, "tags": tags},
    )
    print(response.json())
