import pandas as pd
import requests
from datetime import datetime


def parse_manual_tags(tags_cell):
    """
    Parse the manual tags from the Excel cell
    Expected format: comma-separated tags like "Asset, Long Term" or "Liability, Short Term"
    """
    if pd.isna(tags_cell):
        return []

    # Convert to string and split by comma, then clean up whitespace
    tags_str = str(tags_cell).strip()
    if not tags_str:
        return []

    tags = [tag.strip() for tag in tags_str.split(",") if tag.strip()]
    return tags


def clear_existing_data(api_base_url):
    """
    Clear all existing accounts and values from the database
    """
    accounts_endpoint = f"{api_base_url}/accounts/"

    print("🗑️  Clearing existing data...")

    # Get all accounts first
    try:
        response = requests.get(accounts_endpoint)
        if response.status_code == 200:
            accounts = response.json()
            print(f"Found {len(accounts)} existing accounts to delete")

            # Delete each account (this should cascade delete values)
            deleted_count = 0
            for account in accounts:
                try:
                    delete_response = requests.delete(
                        f"{accounts_endpoint}{account['name']}"
                    )
                    if delete_response.status_code == 200:
                        deleted_count += 1
                    else:
                        print(f"⚠ Failed to delete account: {account['name']}")
                except requests.exceptions.RequestException as e:
                    print(f"✗ Error deleting account {account['name']}: {e}")

            print(f"✓ Deleted {deleted_count} accounts")
        else:
            print("⚠ Could not retrieve existing accounts")
    except requests.exceptions.RequestException as e:
        print(f"✗ Error retrieving accounts: {e}")


def load_from_excel(
    xlsx_file="Net Worth Tracker.xlsx",
    api_base_url="http://localhost:8000/api",
    clear_data=True,
):
    """
    Read the Net Worth Tracker Excel file and load accounts and values directly into the database via API
    """
    # API endpoints
    accounts_endpoint = f"{api_base_url}/accounts/"
    values_endpoint = f"{api_base_url}/values/"

    print(f"Loading data from {xlsx_file} to {api_base_url}")

    # Clear existing data if requested
    if clear_data:
        clear_existing_data(api_base_url)

    # Read the Net Worth sheet
    df = pd.read_excel(xlsx_file, sheet_name="Net Worth", header=None)

    # Extract dates from row 2 (index 2), starting from column 3 (skip 'Where to Find', 'Tags', and 'Account' columns)
    date_row_idx = 2
    dates = df.iloc[date_row_idx, 3:].dropna()

    # Find data rows (starting from row 3, excluding summary rows)
    account_start_row = 3

    # Track created accounts to avoid duplicates
    created_accounts = set()
    accounts_created = 0
    values_created = 0

    print(f"Found {len(dates)} date columns")
    print(f"Processing rows starting from row {account_start_row + 1}")

    # Process each row until we hit summary rfows (which have NaN in column 0)
    for row_idx in range(account_start_row, len(df)):
        where_to_find = df.iloc[row_idx, 0]  # Column 0: Where to Find
        manual_tags = df.iloc[row_idx, 1]  # Column 1: Tags (e.g., "Short Term, Asset")
        account_name = (
            df.iloc[row_idx, 2] if len(df.columns) > 2 else None
        )  # Column 2: Account Name

        # Stop when we hit summary rows (where column 0 is NaN)
        if pd.isna(where_to_find):
            print(f"Reached summary rows at row {row_idx + 1}, stopping processing")
            break

        # Skip if account name is NaN
        if pd.isna(account_name):
            print(f"Skipping row {row_idx + 1} - no account name")
            continue

        where_to_find = str(where_to_find).strip()
        account_name = str(account_name).strip()

        # Get tags from manual tags column
        tags = parse_manual_tags(manual_tags)

        # Create account if not already created
        if account_name not in created_accounts:
            account_data = {
                "name": account_name,
                "description": where_to_find,
                "tags": tags,
            }

            try:
                response = requests.post(accounts_endpoint, json=account_data)
                if response.status_code == 200:
                    print(f"✓ Created account: {account_name}")
                    created_accounts.add(account_name)
                    accounts_created += 1
                else:
                    print(
                        f"⚠ Account creation failed for {account_name}: {response.status_code}"
                    )
                    if response.status_code == 400:
                        # Account might already exist
                        created_accounts.add(account_name)
                        print(f"  (Account {account_name} may already exist)")
            except requests.exceptions.RequestException as e:
                print(f"✗ Error creating account {account_name}: {e}")
                continue

        # Process values for this account across all dates
        for col_idx, date in enumerate(dates):
            # Get the value from the data (column 3 onwards, after Where to Find, Tags, Account)
            value = df.iloc[row_idx, col_idx + 3]

            # Skip NaN values
            if pd.isna(value):
                continue

            # Convert value to float if possible
            try:
                amount = float(value)
            except (ValueError, TypeError):
                continue

            # Format date properly
            if isinstance(date, (pd.Timestamp, datetime)):
                date_str = date.strftime("%Y-%m-%d")
            else:
                continue

            # Create value entry
            value_data = {
                "account_name": account_name,
                "amount": amount,
                "date": date_str,
            }

            try:
                response = requests.post(values_endpoint, json=value_data)
                if response.status_code == 200:
                    values_created += 1
                    if values_created % 50 == 0:  # Progress indicator every 50 values
                        print(f"  Created {values_created} values...")
                else:
                    print(
                        f"⚠ Value creation failed for {account_name} on {date_str}: {response.status_code}"
                    )
            except requests.exceptions.RequestException as e:
                print(f"✗ Error creating value for {account_name} on {date_str}: {e}")

    print("\n📊 Summary:")
    print(f"✓ Accounts created: {accounts_created}")
    print(f"✓ Values created: {values_created}")
    print(f"✓ Total accounts processed: {len(created_accounts)}")

    return accounts_created, values_created


if __name__ == "__main__":
    # Load with clearing existing data by default
    # Set clear_data=False if you want to add to existing data instead
    load_from_excel(clear_data=True)
