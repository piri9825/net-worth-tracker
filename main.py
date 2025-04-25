import polars as pl


def main():
    df = pl.read_excel("Net Worth Tracker.xlsx", sheet_name="Net Worth")
    df.columns = [str(col) for col in df.row(0)]
    df = df.drop("Where to Find")
    df.columns = ["Account"] + [
        col.name.split(" ")[0] for col in df if col.name != "Account"
    ]
    df = df.slice(1, -6)
    df = df[[col.name for col in df if not col.is_null().all()]]

    print(df)


if __name__ == "__main__":
    main()
