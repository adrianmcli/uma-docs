---
title: Liquidation and Dispute Bots
sidebar_label: Running Bots
---

## Quick Start: Liquidator Bot

This section is intended for those who are familiar with Docker and just want to
get up and running. We strongly suggest you read the entirety of this article to
learn more about the bot ecosystem which also includes a dispute bot as well as
a monitoring bot.

First, create a file to set the appropriate configuration for your liquidation
bot. Please edit the following example with your own values.

```shell title="example.env"
EMP_ADDRESS=0xFb70A4CBD537B36e647553C279a93E969b041DF0
PRIVATE_KEY=0xf7cbade2b9eec8fc83aa70e4b43f480d0ca78b7060737ead2669d095f2035322
COMMAND=yarn truffle exec ./packages/liquidator/index.js --network mainnet_privatekey
```

Once you have a properly configured `.env` file, use the following commands to
pull the Docker image and run a container with your specified configuration.

```shell
# Pull the latest docker container image
docker pull umaprotocol/protocol:latest

# Start the liquidator bot Docker container
docker run --name liquidator-bot -d --env-file ./example.env umaprotocol/protocol:latest
# *your container hash should print here*

# List logs from running bot:
docker logs <your container hash>
```

Your liquidation bot should now be running, please read on to find out about how
it works and how to [configure](developers/bot-param.md) it.

## Motivation

The prompt and accurate execution of liquidations and disputes is a core assumption to all priceless financial contracts compatible with the UMA DVM.
Liquidation and dispute bots, as described below and implemented [here](https://github.com/UMAprotocol/protocol/tree/master/packages/liquidator) and [here](https://github.com/UMAprotocol/protocol/tree/master/packages/disputer), are infrastructure tools that will help maintain the overall health of the UMA ecosystem.
They are currently compatible with the priceless synthetic token contract template, as described [here](synthetic-tokens/what-are-synthetic-assets.md) and implemented [here](https://github.com/UMAprotocol/protocol/tree/master/packages/core/contracts/financial-templates).

### Liquidation vs Dispute Bot

The liquidation bot monitors all open positions within a given ExpiringMultiParty contract and liquidates positions if their collateralization ratio, as inferred from off-chain information about the value of the price identifier, drops below a given threshold.

The dispute bot monitors all liquidations occurring within a given ExpiringMultiParty contract and initiates disputes against liquidations it deems invalid, as inferred from off-chain information about the value of the price identifier.
A liquidation is invalid if a position was correctly collateralized at the time of liquidation.

In short, a liquidation bot is to liquidate under-collateralized positions while a dispute bot is used for disputing those liquidations if they incorrectly report a position as under-collateralized. Since a dispute is the only way a price request is triggered in the system, they are very important to the operation of the DVM.

## Incentives to Running a Bot

Details about liquidation and dispute rewards can be found [here](synthetic-tokens/expiring-synthetic-tokens.md).

## Implementation

The liquidation and dispute bots are separate entities. Each has its own wallet and is designed to be be run independently of the other.
This decouples dependencies between the bots to decrease the risk of one impacting the other.
In production, it is suggested to run the bots within docker containers to isolate the bots and to ensure a reproducible execution environment.

## Technical Tutorial

This tutorial will be broken down into three main sections:

1. [Running the bots directly from your host environment (no Docker) from the command line](#running-the-liquidator-and-disputer-bots-locally)
2. [Running the bots within a dockerized environment from the official UMA Docker image](#running-the-bots-locally-with-docker)
3. [Deploying bots to production in Google Cloud Compute](#running-the-bots-in-the-cloud-with-gcp)

This tutorial will guide you through setting up a liquidator and disputer to monitor an ExpiringMultiParty deployed on the Kovan test network.
A verified version of the ExpiringMultiParty contract can be found on Kovan [here](https://kovan.etherscan.io/address/0xDe15ae6E8CAA2fDa906b1621cF0F7296Aa79d9f1).
This contract is an ETHBTC synthetic, collateralized in Dai.

## Prerequisites

Before starting this tutorial you need to clone the repo, install the dependencies, and compile the smart contracts.

### Linux users

If you are using Linux, you may need to first install the following packages before `yarn` can complete properly:

```
make gcc libudev-dev g++ linux-headers-generic libusb-1.0-0
```

Note that `libudev-dev`, `linux-headers-generic`, and `libusb-1.0-0` may have different names depending on your Linux distribution.

If you are not using Linux (or if you have installed the above), you can run the following to continue:

```bash
# Clone the repo and navigate into the protocol directory
git clone https://github.com/UMAprotocol/protocol.git
cd ./protocol

# Install dependencies
yarn

# Compile contracts
yarn qbuild

```

If you have any issues executing `yarn truffle <command>` you can try running `$(npm bin)/truffle <command>`. If you have Truffle globally installed you should be able to run `truffle <command>` without npx or `$(npm bin)` but it may not be the same version specified in the project. The liquidator and disputer scripts can also be run directly as node processes by replacing the `yarn truffle exec <path>` commands with `node <path>`.

### Funding accounts

Bots must be funded with currency to pay for liquidations and disputes.
Specifically, if you want to run a liquidation bot, you need to fund the wallet with 1) synthetic tokens to close liquidated positions, 2) collateral currency to pay the DVM final fee, and 3) Ether to pay transaction fees.
If you want to run a dispute bot, then this wallet should be funded with 1) collateral currency to pay dispute bonds and the DVM final fee and 2) Ether to pay for transactions.

At a minimum, the account must have some ETH to pay gas for transactions executed during bot set up, otherwise the bots will crash. If the bots do not have collateral or synthetic tokens, they will not crash but they will not be able to send liquidations or disputes.

### Bot private key management

All deployment configurations require a wallet mnemonic (or private key) to be injected into the bots enabling them to submit transactions to perform on-chain liquidations and disputes.
You can either bring your own mnemonic from an existing wallet or generate a fresh one using the `bip39` package installed within the UMA repo.
If you have a wallet mnemonic already you can skip this section.

To generate a new mnemonic you can run the following:

```bash
node -e "console.log(require('bip39').generateMnemonic())"
# your mnemonic should print here
```

You can then load this mnemonic into truffle and view the associated address.
To do this, set the mnemonic as an environment variable by running:

```bash
# Add the new mnemonic to your environment variables. Be sure to replace with your mnemonic.
export MNEMONIC="sail chuckle school attitude symptom tenant fragile patch ring immense main rapid"

# Start the truffle console
yarn truffle console --network kovan_mnemonic

# Print the address of your newly created account
truffle(kovan_mnemonic)> accounts[0]

# should print: `0x45Bc98b00adB0dFe16c85c391B1854B706b7d612`
```

You can now fund this wallet with the associated currency for the type of bot you want to run.
To learn more about creating synthetic tokens to fund your liquidation bot see [this](/build-walkthrough/minting-etherscan) tutorial.

### Creating a price feed API key

All bots require a price feed to inform their liquidation decisions. The bots will work fine without a key but free no account tier will run out of credits within a day. We recommend making a free account to ensure you have sufficient credits.
The easiest price feed to integrate with is [CryptoWatch](https://cryptowat.ch/). To create an API Key do the following:

1. Create an account [here](https://cryptowat.ch/account/create).
2. Generate an API key [here](https://cryptowat.ch/account/api-access).

Keep this key handy. You'll need it when configuring the bots.

## Running the liquidator and disputer bots locally

This section describes running the liquidator and disputer bots locally from your machine without docker or any complex execution environment. This is meant to be the simplest way possible to start up a bot.

**a) Configuring environment**
To start a bot the first step is to configure the bot's settings.
Liquidation bots require 4 main configurations settings which are configured using environment variables.
To set this up create a `.env` file in the root directory directory:

```bash
EMP_ADDRESS=0xDe15ae6E8CAA2fDa906b1621cF0F7296Aa79d9f1
MNEMONIC=sail chuckle school attitude symptom tenant fragile patch ring immense main rapid
PRICE_FEED_CONFIG={"apiKey":"YOUR-CRYPTO-WATCH-API-KEY-HERE"}
```

The parameters above, as well as other optional parameters are explained in the appendix of this tutorial. **Be sure to add in your mnemonic and your crypto watch API key.** The parameter in the example above conform to [UMIP-2](https://github.com/UMAprotocol/UMIPs/blob/master/UMIPs/umip-2.md#implementation)'s specification.

Note that the `EMP_ADDRESS` above currently refers to the ETHBTC synthetic token deployed on Kovan. The EMP refers to the `ExpiringMultiParty` financial contract used here.

**b) Starting the bots**

Now that your env is set up you can run the bot. Run the following command from the root directory to start the bots on Kovan:

```bash
yarn truffle exec ./packages/liquidator/index.js --network kovan_mnemonic
```

This will start the liquidator bot process using the network `kovan` and the wallet `mnemonic`. You should see the following output:

```bash
Using network 'kovan_mnemonic'.

2020-05-22 08:39:42 [info]: {
  "at": "Liquidator#index",
  "message": "liquidator started 🕵️‍♂️",
  "empAddress": "0xFb70A4CBD537B36e647553C279a93E969b041DF0",
  "pollingDelay": "60",
  "priceFeedConfig": {
    "type": "medianizer",
    "pair": "usdeth",
    "lookback": 7200,
    "minTimeBetweenUpdates": 60,
    "medianizedFeeds": [
      {
        "type": "cryptowatch",
        "exchange": "coinbase-pro"
      },
      {
        "type": "cryptowatch",
        "exchange": "binance"
      },
      {
        "type": "cryptowatch",
        "exchange": "kraken"
      }
    ]
  },
}
... Rest of bot startup logs and continuous health reports...
```

In a separate terminal you can start a disputer bot using the same config by running:

```bash
yarn truffle exec ./packages/disputer/index.js --network kovan_mnemonic
```

You should see the following output:

```bash
2020-05-22 08:37:10 [info]: {
  "at": "Disputer#index",
  "message": "Disputer started 🔎",
  "empAddress": "0xFb70A4CBD537B36e647553C279a93E969b041DF0",
  "pollingDelay": "60",
  "priceFeedConfig": {
    "type": "medianizer",
    "pair": "ethbtc",
    "lookback": 7200,
    "minTimeBetweenUpdates": 60,
    "medianizedFeeds": [
      {
        "type": "cryptowatch",
        "exchange": "coinbase-pro"
      },
      {
        "type": "cryptowatch",
        "exchange": "binance"
      },
      {
        "type": "cryptowatch",
        "exchange": "kraken"
      }
    ]
  },
}
  ... Rest of bot startup logs and continuous health reports...
```

The bots are now running! Any liquidation event or informative logs will be printed here.
If all is operating correctly, you should be able to liquidate under-collateralized positions and dispute incorrectly liquidated positions.

## Running the bots locally with Docker

Running the bots from your local machine is simple but is not ideal for long term bot execution as you'll need to keep a terminal running the whole time to keep the bot process alive.
What would be better is to run the bots within an isolated Docker container that can be run in the background on your machine.

The steps followed here can also be reproduced on a VPS service like Google Cloud Compute Engine, Digital Ocean or AWS EC2 to host your Dockerized bots in the cloud.
Section 3 of this tutorial will show you how to deploy the bots to GCP. It is recommended that you get the bots running within a local Docker environment before trying to run them on the cloud.

**a) Setting up docker on your local machine**

To be able to run the bots within a Dockerized environment you need to have Docker set up on your local machine. Getting started with Docker is relatively straight forward.
See the official docs for [Mac](https://docs.docker.com/docker-for-mac/), [Linux](https://docs.docker.com/engine/install/ubuntu/) or [Windows](https://docs.docker.com/docker-for-windows/install/).

**b) Creating environment configs for the bots**

In the previous section, both the liquidator and disputer bots used the same `.env` configuration file.
In this section, we will create separate configuration files for each bot.
These scripts will contain all the settings for a given bot, as well as the starting command used to boot the bot.

Start by copying the `.env` you created to make two new env files. This section assumes you are in the root directory directory. Run the following commands:

```bash
# Copy the contents of the .env and add command to run the liquidator bot.
cp .env liquidator.env
echo '\nCOMMAND=yarn truffle exec ./packages/liquidator/index.js --network kovan_mnemonic' >> liquidator.env

# Do the same for the disputer bots
cp .env disputer.env
echo '\nCOMMAND=yarn truffle exec ./packages/disputer/index.js --network kovan_mnemonic' >> disputer.env
```

You should now have two config files `liquidator.env` and `disputer.env` within the root directory which contain the original configs defined in the previous section along with a `COMMAND` line which defines the execution command of the bot.
These commands are the same as before.

**c) Starting the Docker containers**

Next, we will start the Docker containers in detached mode on our local machine. To do this run the following:

```bash
# Pull the latest docker container image
docker pull umaprotocol/protocol:latest

# Start the liquidator bot Docker container
docker run --name liquidator-bot -d --env-file ./liquidator.env umaprotocol/protocol:latest

# Start the disputer bot Docker container
docker run --name disputer-bot -d --env-file ./disputer.env umaprotocol/protocol:latest
```

Both docker containers should start correctly. To view the running docker containers on your machine you can run:

```bash
docker ps
CONTAINER ID        IMAGE                         COMMAND                  CREATED             STATUS              PORTS               NAMES
f74d1cdd8892        umaprotocol/protocol:latest   "/bin/bash scripts/r…"   8 seconds ago       Up 7 seconds                            disputer-bot
5c7cea93b65b        umaprotocol/protocol:latest   "/bin/bash scripts/r…"   10 minutes ago      Up 10 minutes                           liquidator-bot
```

You can now view the logs of these docker containers by running:

```bash
docker logs f74d1cdd8892 # where f74d1cdd8892 is the docker id from previous command
```

This should print the logs of the bot's execution to date.

You can also run in attached mode to view the logs as they are printed as:

```bash
docker attach f74d1cdd889
```

If you want to stop the bots from running you can run the following:

```bash
docker stop $(docker ps -a -q)
```

Note this will stop all running docker containers on your machine.

## Running the bots in the cloud with GCP

In this section of the tutorial you will learn how to spin up a liquidator and dispute bot in Google Cloud Compute.
Note that you can use any cloud hosting platform to run the Docker containers. We simply use GCP as an easy example.
The official GCP docs are a useful reference. For more information and commands see [this](https://cloud.google.com/compute/docs/containers/deploying-containers) official tutorial.

**a) Setting up your `gcloud` environment**

Before running any GCP commands you need to set up an account and configure the `gcloud` utility.
See [this](https://cloud.google.com/compute/docs/gcloud-compute) official documentation on setting this up. Once this is set up you should be able to run the following to view your gcloud email:

```bash
gcloud config list account --format "value(core.account)"
## <your email should print here>
```

**b) Deploying Bots to GCP**

To deploy the bots to GCP we use the `compute instances create-with-container` CLI function which will create a new compute instance within your GCP Compute engine.
This instance will boot up and run a Docker container on execution.
From the root directory, where `liquidator.env` and `disputer.env` configs are located, you can run the following to deploy bots to GCP:

```bash
gcloud compute instances create-with-container ethbtc-liquidator-kovan \
    --container-image docker.io/umaprotocol/protocol:latest \
    --container-env-file ./liquidator.env
```

Note `ethbtc-liquidator-kovan` is the name of the deployed compute instance. You can change this to anything you want. `./liquidator.env` is the environment configuration file created in the previous section of this tutorial.
Logging into gcloud Compute Engine dashboard you should see a deployed compute instance called `ethbtc-liquidator-kovan`.

You can run the same command with a new name and new configuration file to start the disputer bot.

**C) Updating container configuration.**

You might want to update docker environment variables or push new code to the compute instances. The easiest way to update env variables is from the GCP dashboard.
The official docs explain the process to do this [here](https://cloud.google.com/compute/docs/containers/configuring-options-to-run-containers#setting_environment_variables).

Alternatively if you want to push a new local config file you can do this by running the following command (assuming we are updating the `ethbtc-liquidator-kovan` initialized in the previous code block)

```bash
 gcloud compute instances update-container ethbtc-liquidator-kovan \
        --container-image docker.io/umaprotocol/protocol:latest \
        --container-env-file ./liquidator.env
```

## Bot health monitoring

Once your bots are running on GCP you want to know when they are properly executing liquidations or if any errors occur. The bots by default provide a few useful monitoring avenues. These are now discussed.

### GCP StackDriver integration

Once your containers are running within compute engine you probably want to see the log messages in the same way you did when running `docker attach` in the previous section.
To make this process easier the bot logger configuration includes Google Stackdriver integration.
This enables GCP logging to pick up the log messages generated from the bots. To enable this add the following environment variable to the docker containers:

```bash
ENVIRONMENT=production
```

This will tell the bot's logger to pipe logs to GCP logging. For more information on this GCP logging and how to access it within Gcloud see the official doc [here](https://cloud.google.com/logging).

### Slack integration

The bots by default also come with built in slack integration to send slack messages when events occur (bot liquidates a position, is running low on capital or something has failed).
To use this integration you must first generate a Slack webhook.
Information on generating a webhook can be found on the slack docs [here](https://slack.com/intl/en-za/help/articles/115005265063-Incoming-Webhooks-for-Slack).

Once you've set up a Slack webhook you can add it to the bots by adding the following environment variable:

```bash
SLACK_WEBHOOK=<your slack webhook>
```

The bots will now automatically start sending log messages in Slack.

## Running a liquidator bot on mainnet

The tutorial thus far assumed you are running Kovan liquidation and dispute bots. Next, we will discuss how to move the deployment onto Ethereum mainnet. This involves three main steps which are outlined below.

**1) Funding your liquidator bot's mainnet wallet**

Running on mainnet involves first repeating the [funding accounts](#funding-accounts) section on the main Ethereum network to acquire collateral to fund the liquidator and disputer bots.

**2) Updating the EMP address to point to mainnet ExpiringMultiParty contract**

Update your environment configuration `EMP_ADDRESS` to refer to the mainnet address of the ExpiringMultiParty contract you want to monitor.

<!-- TODO: add a link to another docs page that outlines the EMP address for all mainnet deployments -->

**3) Update the `COMMAND` used to start the bots to point at mainnet, rather than kovan.**
This is as simple as changing your `COMMAND` to the following for the liquidator and disputer bots respectively.

```bash
# liquidator.env update
COMMAND=yarn truffle exec ./packages/liquidator/index.js --network mainnet_mnemonic

# disputer.env update
COMMAND=yarn truffle exec ./packages/disputer/index.js --network mainnet_mnemonic
```

## Specifying liquidation sensitivity parameters

Due to the design of the UMA DVM and liquidation process, a bot operator might only want to liquidate positions that are `x` percentage under-collateralized. For example if the Collateralization Requirement (CR) of a contract is 120%, a conservative operator might only want to liquidate positions that are at 115% to remove any risk of being disputed.

To facilitate this configuration, the UMA liquidator bots have an optional configuration object that can be used to specify a `crThreshold` which defines how far below the given CR ratio a position must fall before the bot will initiate the liquidation. To enable this configuration with a 5% threshold, add the following to your `liquidator.env`:

```
LIQUIDATOR_CONFIG={"crThreshold":0.05}
```

This configuration object has additional options including:

1. `liquidationDeadline` (in seconds) which aborts the liquidation if the transaction is mined this amount of time after the EMP client's last update time. Defaults to 5 minutes.
2. `liquidationMinPrice` (in Wei, as a `FixedPoint` type) which aborts the liquidation if the amount of collateral in the position per token outstanding is below this ratio. Defaults to 0.

These configurations can be added to the config in the same way the `crThreshold` was added (i.e. as part of the JSON object in the same line).

## Bot configuration parameters

For a more detailed document on bot-specific parameters see this [doc](developers/bot-param.md).
