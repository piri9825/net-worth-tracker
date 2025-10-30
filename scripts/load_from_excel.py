import pandas as pd
import requests
from datetime import datetime


def parse_enum_value(cell_value):
    """
    Parse an enum value from the Excel cell.
    Returns the value if present, None otherwise.
    Handles both NaN and the string "None".
    """
    if pd.isna(cell_value):
        return None

    value_str = str(cell_value).strip()
    if not value_str or value_str.lower() == "none":
        return None

    return value_str


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
    Multiple rows for the same account will have their values added together.
    """
    # API endpoints
    accounts_endpoint = f"{api_base_url}/accounts/"
    values_endpoint = f"{api_base_url}/values/"

    print(f"Loading data from {xlsx_file} to {api_base_url}")

    # Clear existing data if requested
    if clear_data:
        clear_existing_data(api_base_url)

    # Read the Net Worth sheet with first row as header
    df = pd.read_excel(xlsx_file, sheet_name="Net Worth", header=0)

    # Get all date columns (columns after the first 6 attribute columns)
    date_columns = [col for col in df.columns[6:] if not pd.isna(col)]

    print(f"Found {len(date_columns)} date columns")
    print(f"Columns: {list(df.columns[:6])}")  # Show first 6 attribute columns

    # First pass: collect all account data and aggregate values
    account_data_map = {}  # account_name -> {term, type, portfolio, asset_class, description, values_by_date}

    for idx, row in df.iterrows():
        # Stop when we hit summary rows (where Description column is NaN)
        description_col = df.columns[0]  # Get the actual column name for Description
        if pd.isna(row[description_col]):
            print(f"Reached summary rows at row {idx + 2}, stopping processing")  # +2 because header is row 1
            break

        # Extract account attributes using column names
        term = parse_enum_value(row[df.columns[1]])  # Column 1: Term
        type_val = parse_enum_value(row[df.columns[2]])  # Column 2: Type
        portfolio = parse_enum_value(row[df.columns[3]])  # Column 3: Portfolio
        asset_class = parse_enum_value(row[df.columns[4]])  # Column 4: Asset Class
        account_name = row[df.columns[5]]  # Column 5: Account

        # Skip if account name is missing
        if pd.isna(account_name):
            print(f"Skipping row {idx + 2} - no account name")
            continue

        account_name = str(account_name).strip()
        description = parse_enum_value(row[description_col])

        # Initialize account data if not seen before
        if account_name not in account_data_map:
            account_data_map[account_name] = {
                'term': term,
                'type': type_val,
                'portfolio': portfolio,
                'asset_class': asset_class,
                'description': description,
                'values_by_date': {}
            }
        else:
            # Verify attributes are identical for the same account (in case of duplicate rows)
            existing = account_data_map[account_name]
            if (existing['term'] != term or existing['type'] != type_val or
                existing['portfolio'] != portfolio or existing['asset_class'] != asset_class):
                raise ValueError(
                    f"Account '{account_name}' has inconsistent attributes across rows. "
                    f"Existing: term={existing['term']}, type={existing['type']}, "
                    f"portfolio={existing['portfolio']}, asset_class={existing['asset_class']}. "
                    f"Row {idx + 2}: term={term}, type={type_val}, "
                    f"portfolio={portfolio}, asset_class={asset_class}"
                )

        # Process values for this row across all date columns
        for date_col in date_columns:
            value = row[date_col]

            # Skip NaN values
            if pd.isna(value):
                continue

            # Convert value to float if possible
            try:
                amount = float(value)
            except (ValueError, TypeError):
                continue

            # Format date properly - date_col should already be a date from the header
            if isinstance(date_col, (pd.Timestamp, datetime)):
                date_str = date_col.strftime("%Y-%m-%d")
            else:
                # Try to parse if it's a string
                try:
                    parsed_date = pd.to_datetime(date_col)
                    date_str = parsed_date.strftime("%Y-%m-%d")
                except:
                    continue

            # Add to existing amount for this date, or initialize if first occurrence
            if date_str not in account_data_map[account_name]['values_by_date']:
                account_data_map[account_name]['values_by_date'][date_str] = 0

            account_data_map[account_name]['values_by_date'][date_str] += amount

    # Second pass: create accounts and values using aggregated data
    accounts_created = 0
    values_created = 0

    for account_name, account_info in account_data_map.items():
        # Create account with new structure
        account_data = {
            "name": account_name,
            "description": account_info['description'],
            "term": account_info['term'],
            "type": account_info['type'],
            "portfolio": account_info['portfolio'],
            "asset_class": account_info['asset_class'],
        }

        try:
            response = requests.post(accounts_endpoint, json=account_data)
            if response.status_code == 200:
                print(f"✓ Created account: {account_name}")
                accounts_created += 1
            else:
                print(
                    f"⚠ Account creation failed for {account_name}: {response.status_code}"
                )
                print(f"  Response: {response.text}")
                if response.status_code == 400:
                    # Account might already exist
                    print(f"  (Account {account_name} may already exist)")
        except requests.exceptions.RequestException as e:
            print(f"✗ Error creating account {account_name}: {e}")
            continue

        # Create values for this account
        for date_str, total_amount in account_info['values_by_date'].items():
            value_data = {
                "account_name": account_name,
                "amount": total_amount,
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
    print(f"✓ Total accounts processed: {len(account_data_map)}")

    return accounts_created, values_created


if __name__ == "__main__":
    # Load with clearing existing data by default
    # Set clear_data=False if you want to add to existing data instead
    load_from_excel(clear_data=True)
