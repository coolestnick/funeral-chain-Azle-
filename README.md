
# ICP Rust Boilerplate: FuneralChain

This project is a decentralized booking and review system built on the Internet Computer Protocol (ICP) using Azle, a Rust and TypeScript framework. The system manages service providers, clients, bookings, and reviews. It also includes functionality for adding reviews and managing availability for service providers.

## Features

- **Service Provider Management**: Add service providers with details such as name, contact information, and availability.
- **Client Management**: Add clients with their contact information.
- **Booking System**: Create bookings between clients and service providers, with status management.
- **Reschedule Bookings**: Reschedule pending bookings to a new available date.
- **Review System**: Clients can review service providers after completing a service, and the average rating is automatically updated.

## Technologies Used

- **Azle**: A TypeScript/Rust SDK for building smart contracts on the Internet Computer.
- **ICP**: Internet Computer Protocol.
- **Rust**: For backend logic and service orchestration.
- **UUID**: For unique identifier generation (used in bookings, clients, and service providers).

## Data Structures

### ServiceProvider

Stores the details of a service provider, including their name, service type, contact info, availability, and reviews.

```typescript
const ServiceProvider = Record({
  id: text,
  name: text,
  service_type: text,
  contact_info: text,
  createdAt: nat64,
  average_rating: nat64,
  reviews: Vec(
    Record({ clientId: text, rating: nat64, comment: text, createdAt: nat64 })
  ),
  availability: Vec(nat64),
});
```

### Booking

Represents a booking request between a client and a service provider, storing details like service date, type, and status.

```typescript
const Booking = Record({
  id: text,
  service_provider_id: text,
  client_id: text,
  service_date: nat64,
  service_type: text,
  status: text,
  createdAt: nat64,
});
```

### Client

Stores client details, including their name and contact information.

```typescript
const Client = Record({
  id: text,
  name: text,
  contact_info: text,
});
```

### Review

Stores a review left by a client for a service provider, including rating and comment.

```typescript
const Review = Record({
  client_id: text,
  rating: nat64,
  comment: text,
  createdAt: nat64,
});
```

## Installation and Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/icp_rust_boilerplate.git
   cd icp_rust_boilerplate
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Deploy the canister:

   ```bash
   dfx deploy
   ```

4. Interact with the canister using the DFX console or front-end interface.

## Usage

### Create a Service Provider

You can create a new service provider with the following details:

- `name`
- `service_type`
- `contact_info`
- `availability`

```typescript
dfx canister call icp_rust_boilerplate_backend createServiceProvider
```

### Create a Booking

You can create a booking for a service provider with these details:

- `service_provider_id`
- `client_id`
- `service_date`
- `service_type`

```typescript
dfx canister call icp_rust_boilerplate_backend createBooking
```

### Reschedule a Booking

You can reschedule an existing booking by providing the `booking_id` and `new_date`.

```typescript
dfx canister call icp_rust_boilerplate_backend rescheduleBooking

```


## Things to be explained in the course:
1. What is Ledger? More details here: https://internetcomputer.org/docs/current/developer-docs/integrations/ledger/
2. What is Internet Identity? More details here: https://internetcomputer.org/internet-identity
3. What is Principal, Identity, Address? https://internetcomputer.org/internet-identity | https://yumimarketplace.medium.com/whats-the-difference-between-principal-id-and-account-id-3c908afdc1f9
4. Canister-to-canister communication and how multi-canister development is done? https://medium.com/icp-league/explore-backend-multi-canister-development-on-ic-680064b06320

## How to deploy canisters implemented in the course

### Ledger canister
`./deploy-local-ledger.sh` - deploys a local Ledger canister. IC works differently when run locally so there is no default network token available and you have to deploy it yourself. Remember that it's not a token like ERC-20 in Ethereum, it's a native token for ICP, just deployed separately.
This canister is described in the `dfx.json`:
```
	"ledger_canister": {
  	"type": "custom",
  	"candid": "https://raw.githubusercontent.com/dfinity/ic/928caf66c35627efe407006230beee60ad38f090/rs/rosetta-api/icp_ledger/ledger.did",
  	"wasm": "https://download.dfinity.systems/ic/928caf66c35627efe407006230beee60ad38f090/canisters/ledger-canister.wasm.gz",
  	"remote": {
    	"id": {
      	"ic": "ryjl3-tyaaa-aaaaa-aaaba-cai"
    	}
  	}
	}
```
`remote.id.ic` - that is the principal of the Ledger canister and it will be available by this principal when you work with the ledger.

Also, in the scope of this script, a minter identity is created which can be used for minting tokens
for the testing purposes.
Additionally, the default identity is pre-populated with 1000_000_000_000 e8s which is equal to 10_000 * 10**8 ICP.
The decimals value for ICP is 10**8.

List identities:
`dfx identity list`

Switch to the minter identity:
`dfx identity use minter`

Transfer ICP:
`dfx ledger transfer <ADDRESS>  --memo 0 --icp 100 --fee 0`
where:
 - `--memo` is some correlation id that can be set to identify some particular transactions (we use that in the marketplace canister).
 - `--icp` is the transfer amount
 - `--fee` is the transaction fee. In this case it's 0 because we make this transfer as the minter idenity thus this transaction is of type MINT, not TRANSFER.
 - `<ADDRESS>` is the address of the recipient. To get the address from the principal, you can use the helper function from the marketplace canister - `getAddressFromPrincipal(principal: Principal)`, it can be called via the Candid UI.


### Internet identity canister

`dfx deploy internet_identity` - that is the canister that handles the authentication flow. Once it's deployed, the `js-agent` library will be talking to it to register identities. There is UI that acts as a wallet where you can select existing identities
or create a new one.

### Marketplace canister

`dfx deploy dfinity_js_backend` - deploys the marketplace canister where the business logic is implemented.
Basically, it implements functions like add, view, update, delete, and buy products + a set of helper functions.

Do not forget to run `dfx generate dfinity_js_backend` anytime you add/remove functions in the canister or when you change the signatures.
Otherwise, these changes won't be reflected in IDL's and won't work when called using the JS agent.

