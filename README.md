Current contract address on ghostnet: [KT1QZUkXENc2bxAXF5ja6Mq6x8dsvc4sLmfW](https://better-call.dev/ghostnet/KT1QZUkXENc2bxAXF5ja6Mq6x8dsvc4sLmfW/operations)

# Run Smartpy Locally

To run locally, ensure you have downloaded the `smartpy` executable (Docker is required and should be running). Also ensure that you have given the necessary permissions to the scripts:


1. Activate venv

2. Run `./test.sh`

# Notes

- the 'native' NFT is the one with ID 0
- the Partner NFTs will have ID one and above (in sequential order)

# Deployment
## How to publish the Native NFT

- call `set_token_metadata` (token_id 0)
- call `set_minting_price` set minting price for token 0 (mint_native will error if price is not set)
- call `set_is_minting` (token_id 0)

## How to publish the Partner NFT

- call `set_token_metadata`
- call the `publish_partner_token`
