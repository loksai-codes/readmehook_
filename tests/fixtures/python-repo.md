# tabloid

**tabloid** turns messy CSV exports into tidy, typed DataFrames. It guesses column types, fixes encodings and normalises dates so you don't have to.

> Works with pandas >= 2.0 and polars >= 0.20.

## Why tabloid?

Every analytics project starts with the same cleanup script. tabloid is that script, tested.

## Example

```python
import tabloid

df = tabloid.read("exports/orders.csv")
print(df.dtypes)
```

## Features

- Encoding detection (UTF-8, Latin-1, UTF-16)
- Date normalisation with locale hints
- Typed nullable integers
- Streaming mode for files larger than memory
- Pluggable column rules

## Configuration

Create a `tabloid.toml` next to your data:

```toml
[columns.order_date]
type = "date"
format = "%d/%m/%Y"
```

## Installation

```console
$ python -m pip install tabloid
Collecting tabloid
  Downloading tabloid-1.4.0-py3-none-any.whl (41 kB)
Successfully installed tabloid-1.4.0
```

## Demo

https://github.com/user-attachments/assets/4f0c2a6e-9b1d-4c3e-8a77-2d5e1f0b9c11

## Contributing

PRs welcome! See CONTRIBUTING.md.
