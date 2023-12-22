Current contract address on ghostnet: [KT1QZUkXENc2bxAXF5ja6Mq6x8dsvc4sLmfW](https://better-call.dev/ghostnet/KT1QZUkXENc2bxAXF5ja6Mq6x8dsvc4sLmfW/operations)

# Run Smartpy Locally

To run locally, ensure you have downloaded the `smartpy` executable (Docker is required and should be running). Also ensure that you have given the necessary permissions to the scripts:


1. Activate venv

2. Run `./test.sh`

# Notes

- the 'native' NFT is the one with ID 0
- the Partner NFTs will have ID one and above (in sequential order)

# Deployment

publish -> set_is_minting

## These need to be set

- metadata
- price
- type
- is_minting


## How to publish a token

- call `set_token_metadata`
- call `publish_token` (price and type)
- call `set_is_minting`


## Setting token metadata

### `token_info`

string = key
bytes = value (hexadecimal byte representation)

Example, to have the metadata be

```
{
    "name": "Partner A"
}
```

you should call `set_token_metadata` with

string: `name`
bytes: `506172746e65722041`
