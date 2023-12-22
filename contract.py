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

    NATIVE_TYPE_ID = 0
    PARTNER_TYPE_ID = 1
    QUEST_TYPE_ID = 2

    class StarSymphonyNFT(sp.Contract):
        def __init__(self, administrator, server_pk, metadata):
            self.data.paused = False
            self.data.administrator = administrator
            self.data.server_pk = server_pk
            self.data.ledger = sp.cast(
                sp.big_map(), sp.big_map[sp.pair[sp.address, sp.nat], sp.nat]
            )
            self.data.metadata = metadata
            self.data.next_token_id = sp.nat(0)
            self.data.is_minting = sp.cast(
                sp.big_map(), sp.big_map[sp.nat, sp.bool])
            self.data.minting_prices = sp.cast(
                sp.big_map(), sp.big_map[sp.nat, sp.mutez])
            self.data.token_types = sp.cast(
                sp.big_map(), sp.big_map[sp.nat, sp.nat])
            self.data.tokens_minted = sp.cast(
                sp.big_map(), sp.big_map[sp.pair[sp.address, sp.nat], sp.nat]
            )
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
                    assert tx.token_id != PARTNER_TYPE_ID, "Transfer not allowed for Partner tokens"
                    assert tx.token_id != QUEST_TYPE_ID, "Transfer not allowed for Quest tokens"
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
        def burn(self, batch):
            sp.cast(
                batch,
                sp.list[
                    sp.record(
                        from_=sp.address,
                        token_id=sp.nat,
                        amount=sp.nat,
                    ).layout(("from_", ("token_id", "amount")))
                ],
            )
            for action in batch:
                assert action.token_id < self.data.next_token_id, "FA2_TOKEN_UNDEFINED"
                assert action.token_id != QUEST_TYPE_ID, "Burn not allowed for Quest tokens"
                assert action.from_ == sp.sender or self.data.operators.contains(
                    sp.record(
                        owner=action.from_,
                        operator=sp.sender,
                        token_id=action.token_id,
                    )
                ), "FA2_NOT_OPERATOR"
                if action.amount > 0:
                    self.data.ledger[(action.from_, action.token_id)] = sp.as_nat(
                        self.data.ledger.get((action.from_, action.token_id), default=0) - action.amount,
                        error="FA2_INSUFFICIENT_BALANCE",
                    )
                    self.data.supply[action.token_id] = sp.as_nat(
                        self.data.supply.get(action.token_id, default=0) - action.amount,
                        error="FA2_INSUFFICIENT_BALANCE",
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
        def update_server_pk(self, pk):
            """Update public key of server accepted for signing and whitelisting"""
            assert sp.sender == self.data.administrator, "FA2_NOT_ADMIN"
            self.data.server_pk = pk

        @sp.entrypoint
        def set_pause(self, params):
            assert sp.sender == self.data.administrator, "FA2_NOT_ADMIN"
            self.data.paused = params

        @sp.entrypoint
        def set_token_metadata(self, batch):
            assert sp.sender == self.data.administrator, "FA2_NOT_ADMIN"
            for token_metadata_list in batch:
                for token_metadata in token_metadata_list:
                    self.data.token_metadata[token_metadata.token_id] = token_metadata

        @sp.entrypoint
        def publish_token(self, batch):
            assert sp.sender == self.data.administrator, "FA2_NOT_ADMIN"
            for item in batch:
                sp.cast(
                    item,
                    sp.record(
                        price=sp.mutez,
                        type=sp.nat
                    ).layout(("price", "type")),
                )
                current_id = self.data.next_token_id
                self.data.supply[current_id] = 0
                self.data.minting_prices[current_id] = item.price
                self.data.token_types[current_id] = item.type
                self.data.next_token_id = current_id + 1

        @sp.entrypoint
        def set_is_minting(self, batch):
            """
            Sets the minting state for a batch of token IDs.

            Args:
                batch (list): A list of records, each containing a token_id and a boolean value.
            Raises:
                Exception: If the sender is not the administrator or if any token_id is invalid.
            """
            assert sp.sender == self.data.administrator, "Only the administrator can set is_minting"
            for item in batch:
                sp.cast(
                    item,
                    sp.record(
                        token_id=sp.nat, bool=sp.bool
                    ).layout(("token_id", ("bool") )),
                )
                assert item.token_id < self.data.next_token_id, "Invalid token_id"
                self.data.is_minting[item.token_id] = item.bool

        @sp.entrypoint
        def set_minting_price(self, batch):
            assert sp.sender == self.data.administrator, "Only the administrator can set prices"
            for item in batch:
                sp.cast(
                    item,
                    sp.record(
                        token_id=sp.nat, price=sp.mutez
                    ).layout(("token_id", ("price") )),
                )
                # no token_id check to allow setting minting price before publication of token
                self.data.minting_prices[item.token_id] = item.price


        @sp.entrypoint
        def set_token_type(self, batch):
            assert sp.sender == self.data.administrator, "Only the administrator can set token configs"
            for item in batch:
                sp.cast(
                    item,
                    sp.record(
                        token_id=sp.nat, type=sp.nat
                    ).layout(("token_id", ("type") )),
                )
                self.data.token_types[item.token_id] = item.type
                

        @sp.entrypoint
        def withdraw(self, amount, destination):
            assert sp.sender == self.data.administrator, "Only the administrator can withdraw"
            assert amount > sp.mutez(0), "Amount must be positive"
            sp.send(destination, amount)

        @sp.entrypoint
        def mint_native(self, to_, token_id, qty, signature):
            assert not self.data.paused, "FA2_PAUSED"
            assert token_id < self.data.next_token_id, "Invalid token_id"
            assert qty > 0, "qty must be positive"
            assert self.data.is_minting[0], "Minting not active"
            
            token_type = self.data.token_types[token_id]
            assert token_type == NATIVE_TYPE_ID, "Wrong minting function for token type"

            mint_price = self.data.minting_prices[0]
            assert sp.amount == sp.split_tokens(mint_price, qty, 1), "Incorrect minting fee"
            self.data.supply[token_id] += qty
            current_balance = self.data.ledger.get((to_, token_id), default=0)
            self.data.ledger[(to_, token_id)] = (current_balance + qty)

        @sp.entrypoint
        def mint_partner(self, to_, token_id, qty, allocationQty, signature):
            assert not self.data.paused, "FA2_PAUSED"
            assert token_id < self.data.next_token_id, "Invalid token_id"
            assert qty > 0, "qty must be positive"
            assert self.data.is_minting[0], "Minting not active"
            
            token_type = self.data.token_types[token_id]
            assert token_type == PARTNER_TYPE_ID, "Wrong minting function for token type"

            # bof: validate signature 
            sp.cast(allocationQty, sp.nat)
            toSign = sp.record(adress=sp.sender, token_id=token_id, allocationQty=allocationQty)
            packed = sp.pack(toSign)
            assert sp.check_signature(self.data.server_pk, signature, packed), "Signature invalid"
            # eof: validate signature

            minted = self.data.tokens_minted.get((sp.sender, token_id), default=0)
            assert minted + qty <= allocationQty, "Exceeding allocation"

            mint_price = self.data.minting_prices[0]
            assert sp.amount == sp.split_tokens(mint_price, qty, 1), "Incorrect minting fee"

            self.data.tokens_minted[(sp.sender, token_id)] = minted + qty
            self.data.supply[token_id] += qty
            current_balance = self.data.ledger.get((to_, token_id), default=0)
            self.data.ledger[(to_, token_id)] = (current_balance + qty)

        @sp.entrypoint
        def mint_quest(self, to_, token_id, signature):
            # bof: general token check
            assert not self.data.paused, "FA2_PAUSED"
            assert token_id < self.data.next_token_id, "Invalid token_id"
            assert self.data.is_minting[0], "Minting not active"
            # bof: general token check

            allocationQty = 1 # hardcode 1 for quest tokens
            qty = 1 # hardcode 1 as the limit for quest tokens
            
            # bof: validate token type
            token_type = self.data.token_types[token_id]
            assert token_type == QUEST_TYPE_ID, "Wrong minting function for token type"
            # bef: validate token type

            minted = self.data.tokens_minted.get((sp.sender, token_id), default=0)
            assert minted < 1, "Only 1 quest token allowed per address"

            # bof: validate signature 
            sp.cast(allocationQty, sp.nat)
            toSign = sp.record(adress=sp.sender, token_id=token_id, allocationQty=allocationQty)
            packed = sp.pack(toSign)
            assert sp.check_signature(self.data.server_pk, signature, packed), "Signature invalid"
            # eof: validate signature 

            # bof: amount check
            mint_price = self.data.minting_prices[0]
            assert sp.amount == sp.split_tokens(mint_price, qty, 1), "Incorrect minting fee"
            # eof: amount check


            self.data.tokens_minted[(sp.sender, token_id)] = minted + qty
            self.data.supply[token_id] += qty
            current_balance = self.data.ledger.get((to_, token_id), default=0)
            self.data.ledger[(to_, token_id)] = (current_balance + qty)

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

        @sp.offchain_view
        def get_token_metadata(self, token_id):
            """Off-chain view to retrieve token metadata.

            Args:
                token_id (sp.nat): The ID of the token to retrieve metadata for.

            Returns:
                Metadata of the specified token.
            """
            assert token_id < self.data.next_token_id, "FA2_TOKEN_UNDEFINED"
            return self.data.token_metadata[token_id]

    class StarSymphonyNFTTest(StarSymphonyNFT):
        def __init__(
            self, administrator, server_pk, metadata, ledger, token_metadata
        ):
            StarSymphonyNFT.__init__(self, administrator, server_pk, metadata)

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

    admin = sp.address("tz1efwT1rkUG8APyDxWX9J5VxRwRSCVkR4QW")
    server_pk = sp.key("edpku6DjGKCsaVYm54bW95XRkC3nUjk6zMEad9h1SPb8UtNh8nhYLT")
    tok0_md = make_metadata(name="Native NFT", decimals=1, symbol="STAR")
    tok1_md = make_metadata(name="Partner NFT #1", decimals=1, symbol="STAR")

    @sp.add_test(name="Star Symphony")
    def test():
        scenario = sp.test_scenario(main)
        c1 = main.StarSymphonyNFT(
            admin, server_pk, sp.utils.metadata_of_url(
                "http://api.starsymphony.io/mint/native/base")
        )
        scenario += c1

    from templates import fa2_lib_testing as testing

    c1 = main.StarSymphonyNFTTest(
        administrator=admin,
        server_pk=server_pk,
        metadata=sp.utils.metadata_of_url(
            "http://api.starsymphony.io/mint/native/base"),
        ledger=sp.big_map(
            {
                (alice.address, 0): 1
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
