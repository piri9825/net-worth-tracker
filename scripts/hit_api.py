import requests
import pandas as pd
import ast

url = "http://localhost:8000/api"

accounts_endpoint = f"{url}/accounts/"

# response = requests.post(accounts_endpoint, {"name": "Test Account"})
# print(response.json())

# response = requests.get(accounts_endpoint)
# print(response.json())


## Create accounts from csv
# df = pd.read_csv("accounts.csv")

# for row in df.itertuples():
#     tags = ast.literal_eval(row.tags)
#     response = requests.post(accounts_endpoint, json={"name": row.name, "description": row.description, "tags": tags})
#     print(response.json())
