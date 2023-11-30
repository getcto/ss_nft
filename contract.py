import smartpy as sp



class TokenMetadata:
    """Token metadata object as per FA2 standard"""
    def get_type():
        """Returns a single token metadata type, layouted"""
        return sp.TRecord(token_id = sp.TNat, token_metadata = sp.TMap(sp.TString, sp.TBytes)).layout(("token_id", "token_metadata"))
    def get_batch_type():
        """Returns a list type containing token metadata types"""
        return sp.TList(TokenMetadata.get_type())

@sp.module
def main():
    balance_of_args: type = sp.record(
        requests=sp.list[sp.record(owner=sp.address, token_id=sp.nat)],
        callback=sp.contract[
            sp.list[
                sp.record(
                    request=sp.record(owner=sp.address, token_id=sp.nat), balance=sp.nat
                ).layout(("request", "balance"))
            ]
        ],
    ).layout(("requests", "callback"))

    class StarSymphonyNFT(sp.Contract):
        def __init__(self, administrator, metadata):
            self.data.administrator = administrator
            self.data.ledger = sp.cast(
                sp.big_map(), sp.big_map[sp.pair[sp.address, sp.nat], sp.nat]
            )
            self.data.metadata = metadata
            self.data.last_minted = sp.cast(
                sp.big_map(
                ), sp.big_map[sp.pair[sp.address, sp.nat], sp.timestamp]
            )
            # Start from 1 as 0 is the native nft
            self.data.next_token_id = sp.nat(1)
            self.data.is_minting = sp.cast(
                sp.big_map(), sp.big_map[sp.nat, sp.bool])
            self.data.minting_prices = sp.cast(
                sp.big_map(), sp.big_map[sp.nat, sp.mutez])
            self.data.published_tokens = sp.cast(
                sp.big_map(), sp.big_map[sp.nat, sp.bool])
            self.data.operators = sp.cast(
                sp.big_map(),
                sp.big_map[
                    sp.record(
                        owner=sp.address,
                        operator=sp.address,
                        token_id=sp.nat,
                    ).layout(("owner", ("operator", "token_id"))),
                    sp.unit,
                ],
            )
            self.data.supply = sp.cast(
                sp.big_map(), sp.big_map[sp.nat, sp.nat])
            self.data.supply[0] = 0
            self.data.token_metadata = sp.cast(
                sp.big_map(),
                sp.big_map[
                    sp.nat,
                    sp.record(token_id=sp.nat,
                              token_info=sp.map[sp.string, sp.bytes]),
                ],
            )


        @sp.entrypoint
        def transfer(self, batch):
            """Accept a list of transfer operations.

            Each transfer operation specifies a source: `from_` and a list
            of transactions. Each transaction specifies the destination: `to_`,
            the `token_id` and the `amount` to be transferred.

            Args:
                batch: List of transfer operations.
            Raises:
                `FA2_TOKEN_UNDEFINED`, `FA2_NOT_OPERATOR`, `FA2_INSUFFICIENT_BALANCE`
            """
            for transfer in batch:
                for tx in transfer.txs:
                    sp.cast(
                        tx,
                        sp.record(
                            to_=sp.address, token_id=sp.nat, amount=sp.nat
                        ).layout(("to_", ("token_id", "amount"))),
                    )
                    assert tx.token_id < self.data.next_token_id, "FA2_TOKEN_UNDEFINED"
                    from_ = (transfer.from_, tx.token_id)
                    to_ = (tx.to_, tx.token_id)
                    assert transfer.from_ == sp.sender or self.data.operators.contains(
                        sp.record(
                            owner=transfer.from_,
                            operator=sp.sender,
                            token_id=tx.token_id,
                        )
                    ), "FA2_NOT_OPERATOR"
                    self.data.ledger[from_] = sp.as_nat(
                        self.data.ledger.get(from_, default=0) - tx.amount,
                        error="FA2_INSUFFICIENT_BALANCE",
                    )
                    self.data.ledger[to_] = (
                        self.data.ledger.get(to_, default=0) + tx.amount
                    )

        @sp.entrypoint
        def update_operators(self, actions):
            """Accept a list of variants to add or remove operators.

            Operators can perform transfer on behalf of the owner.
            Owner is a Tezos address which can hold tokens.

            Only the owner can change its operators.

            Args:
                actions: List of operator update actions.
            Raises:
                `FA2_NOT_OWNER`
            """
            for action in actions:
                with sp.match(action):
                    with sp.case.add_operator as operator:
                        assert operator.owner == sp.sender, "FA2_NOT_OWNER"
                        self.data.operators[operator] = ()
                    with sp.case.remove_operator as operator:
                        assert operator.owner == sp.sender, "FA2_NOT_OWNER"
                        del self.data.operators[operator]

        @sp.entrypoint
        def balance_of(self, param):
            """Send the balance of multiple account / token pairs to a
            callback address.

            transfer 0 mutez to `callback` with corresponding response.

            Args:
                callback (contract): Where we callback the answer.
                requests: List of requested balances.
            Raises:
                `FA2_TOKEN_UNDEFINED`, `FA2_CALLBACK_NOT_FOUND`
            """
            sp.cast(param, balance_of_args)
            balances = []
            for req in param.requests:
                assert req.token_id < self.data.next_token_id, "FA2_TOKEN_UNDEFINED"
                balances.push(
                    sp.record(
                        request=sp.record(
                            owner=req.owner, token_id=req.token_id),
                        balance=self.data.ledger.get(
                            (req.owner, req.token_id), default=0
                        ),
                    )
                )

            sp.transfer(reversed(balances), sp.mutez(0), param.callback)

        @sp.entrypoint
        def update_administrator(self, address):
            assert sp.sender == self.data.administrator, "FA2_NOT_ADMIN"
            self.data.administrator = address

        @sp.entrypoint
        def set_token_metadata(self, token_metadata_list):
            assert sp.sender == self.data.administrator, "FA2_NOT_ADMIN"
            for token_metadata in token_metadata_list:
                self.data.token_metadata[token_metadata.token_id] = token_metadata

        @sp.entrypoint
        def publish_partner_token(self, params):
            assert sp.sender == self.data.administrator, "FA2_NOT_ADMIN"
            current_id = self.data.next_token_id
            self.data.published_tokens[current_id] = True
            self.data.supply[current_id] = 0
            self.data.is_minting[current_id] = True
            self.data.minting_prices[current_id] = params.price
            # TODO: name and metadata
            # self.data.token_info[token_id] = metadata
            self.data.next_token_id = current_id + 1  # this should be kept as last

        @sp.entrypoint
        def set_is_minting(self, params):
            assert sp.sender == self.data.administrator, "Only the administrator can set is_minting"
            self.data.is_minting[params.token_id] = params.bool

        @sp.entrypoint
        def set_minting_price(self, token_id, price):
            assert sp.sender == self.data.administrator, "Only the administrator can set prices"
            self.data.minting_prices[token_id] = price

        @sp.entrypoint
        def withdraw(self, amount, destination):
            assert sp.sender == self.data.administrator, "Only the administrator can withdraw"
            assert amount > sp.mutez(0), "Amount must be positive"
            sp.send(destination, amount)

        @sp.entrypoint
        def mint_native(self, to_, amount):
            assert amount > 0, "Amount must be greater than 0"
            assert self.data.is_minting[0], "Minting not active"

            mint_price = self.data.minting_prices[0]
            assert sp.amount == mint_price, "Incorrect minting fee"

            self.data.supply[0] += amount
            current_balance = self.data.ledger.get((to_, 0), default=0)
            self.data.ledger[(to_, 0)] = (current_balance + amount)

        @sp.entrypoint
        def mint_partner(self, to_, token_id):
            assert self.data.published_tokens[token_id], "Token not published"
            assert self.data.is_minting[token_id], "Minting not active"
            assert token_id > 0, "Token ID must be greater than 0"

            mint_price = self.data.minting_prices[token_id]
            assert sp.amount == mint_price, "Incorrect minting fee"

            last_minted_time = self.data.last_minted.get(
                (to_, token_id), default=sp.timestamp(0))
            a_day_later = sp.add_seconds(last_minted_time, 86400)
            assert a_day_later < sp.now, "Can only mint once every 24 hours"

            # record last_minted
            self.data.last_minted[(to_, token_id)] = sp.now
            self.data.supply[token_id] += 1
            current_balance = self.data.ledger.get((to_, token_id), default=0)
            self.data.ledger[(to_, token_id)] = (current_balance + 1)

        @sp.offchain_view
        def all_tokens(self):
            """(Offchain view) Return the list of all the `token_id` known to the contract."""
            return sp.range(0, self.data.next_token_id)

        @sp.offchain_view
        def get_next(self):
            """(Offchain view) Return the next token id."""
            return self.data.next_token_id

        @sp.offchain_view
        def get_balance(self, params):
            """(Offchain view) Return the balance of an address for the specified `token_id`."""
            sp.cast(
                params,
                sp.record(owner=sp.address, token_id=sp.nat).layout(
                    ("owner", "token_id")
                ),
            )
            assert params.token_id < self.data.next_token_id, "FA2_TOKEN_UNDEFINED"
            return self.data.ledger.get((params.owner, params.token_id), default=0)

        @sp.offchain_view
        def get_user_last_minted(self, params):
            """(Offchain view) Return the last minted of the user for the token."""
            return self.data.last_minted.get((params.address, params.token_id), default=sp.timestamp(0))

        @sp.offchain_view
        def total_supply(self, params):
            """(Offchain view) Return the total number of tokens for the given `token_id` if known or
            fail if not."""
            assert params.token_id < self.data.next_token_id, "FA2_TOKEN_UNDEFINED"
            return self.data.supply.get(params.token_id, default=0)

        @sp.offchain_view
        def is_operator(self, params):
            """(Offchain view) Return whether `operator` is allowed to transfer `token_id` tokens
            owned by `owner`."""
            return self.data.operators.contains(params)

    class StarSymphonyNFTTest(StarSymphonyNFT):
        def __init__(
            self, administrator, metadata, ledger, token_metadata
        ):
            StarSymphonyNFT.__init__(self, administrator, metadata)

            self.data.ledger = ledger
            self.data.token_metadata = token_metadata


if "templates" not in __name__:

    def make_metadata(symbol, name, decimals):
        """Helper function to build metadata JSON bytes values."""
        return sp.map(
            l={
                "decimals": sp.utils.bytes_of_string("%d" % decimals),
                "name": sp.utils.bytes_of_string(name),
                "symbol": sp.utils.bytes_of_string(symbol),
            }
            )

    Administrator = sp.test_account("Administrator")
    alice = sp.test_account("Alice")

    admin = sp.address("tz1ZsGiMC5q9aEcF8UNuLi3kyKkDU2iEK4f3")
    user = sp.address("tz1SoEmB6wXupP7bPedSurBJwpTecUXHaXuu")
    tok0_md = make_metadata(name="Native NFT", decimals=1, symbol="STAR")
    tok1_md = make_metadata(name="Partner NFT #1", decimals=1, symbol="STAR")

    @sp.add_test(name="Star Symphony")
    def test():
        scenario = sp.test_scenario(main)
        c1 = main.StarSymphonyNFT(
            admin, sp.utils.metadata_of_url(
                "https://pub-81915167bb424dcaa1f691c199bdc466.r2.dev/1.json")
        )
        scenario += c1

    from templates import fa2_lib_testing as testing

    c1 = main.StarSymphonyNFTTest(
        administrator=admin,
        metadata=sp.utils.metadata_of_url(
            "https://pub-81915167bb424dcaa1f691c199bdc466.r2.dev/1.json"),
        ledger=sp.big_map(
            {
                (alice.address, 0): 1,
                (user, 0): 1,
                (user, 1): 0
            }
        ),
        token_metadata=sp.big_map(
            {
                0: sp.record(token_id=0, token_info=tok0_md),
                1: sp.record(token_id=1, token_info=tok1_md)
            }
        ),
    )

    kwargs = {"modules": main, "ledger_type": "Fungible"}
    # testing.test_core_interfaces(c1, **kwargs)
    # testing.test_transfer(c1, **kwargs)
    # testing.test_owner_or_operator_transfer(c1, **kwargs)
    # testing.test_balance_of(c1, **kwargs)
