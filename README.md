Current contract address on ghostnet: [KT1QZUkXENc2bxAXF5ja6Mq6x8dsvc4sLmfW](https://better-call.dev/ghostnet/KT1QZUkXENc2bxAXF5ja6Mq6x8dsvc4sLmfW/operations)

To run locally, ensure you have downloaded the `smartpy` executable (Docker is required and should be running). Also ensure that you have given the necessary permissions to the scripts:


Active venv

Run `./test.sh`

Deployment

Native NFT

- deploy contract
- set minting price for token 0 (mint_native will error if price is not set)
- set is_minting for token 0

Partner NFT

- publish_partner_token
