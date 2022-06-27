# Cool Cats Solidity Test

This repo contains a number of mistakes and places where improvements can be made. Please made any adjustments you see fit.
We have deliberately made some very silly mistakes and simple things like file names might be wrong or inconsistent.

### ERC1155SupplyCC

Why was this file used and not used directly from the OpenZeppelin library?

ERC1155SupplyCC added the useful `totalSupply` and `exists` methods, which make it easy to track how many individual tokens there are of each id within the ERC1155 contract, if any (`exists` boolean) and not just how many are held by a specific address as provided by the `_balances` mapping in ERC1155. This allows to quickly check how many NFT tokens (i.e. totalSupply of Id == 1) a contract has minted and how many Fungible ones (i.e. totalSupply of id > 1).

OpenZeppelin Contracts v3.0.0 introduced the `_beforeTokenTransfer` hook into ERC1155 for cleaner and safer code and to avoid code duplication between parent and inheriting contracts. ERC1155SupplyCC implements the virtual `_beforeTokenTransfer` method of the ERC1155 contract by adding totalSupply tracking when either minting and burning ERC1155 tokens depending on to/from address being address(0).

### Claim()

Please adjust the claim function so that an address can only claim once per day.

## Unit Tests

At Cool Cats we write unit tests for 100% coverage and for as many edge cases as we can think of. Please do the same here.

## Deployment Script/Task

Please create a deployment script or task. Which ever you feel is most appropriate
