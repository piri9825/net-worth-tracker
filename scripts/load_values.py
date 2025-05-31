import requests
import pandas as pd


url = "http://localhost:8000/api"

values_endpoint = f"{url}/values/"

## Add values
df = pd.read_csv("values.csv")

for row in df.itertuples():
    response = requests.post(
        values_endpoint,
        json={"account_name": row.Account, "amount": row.Value, "date": row.Date},
    )
    print(response.json())
