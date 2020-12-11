module.exports = {
  gettingStarted: {
    "Getting Started": [
      "getting-started/welcome",
      "getting-started/overview",
      "getting-started/synthetic-tokens",
      "getting-started/oracle"
    ],
    "Synthetic Tokens": [
      "synthetic-tokens/explainer",
      "synthetic-tokens/glossary",
      "synthetic-tokens/known-issues",
    ],
    "Oracle (DVM)": [
      "oracle/tech-architecture",
      "oracle/econ-architecture",
      "oracle/dvm-interface",
      "oracle/known-issues",
    ],
  },
    Developers: [
      {
        type: "category",
        label: "Quick Start",
        items: ["developers/setup", "developers/quick-deploy"],
      },
      {
        type: "category",
        label: "A to Z Synthetic Tutorial",
        items: ["build-walkthrough/build-process", "build-walkthrough/mint-locally", "build-walkthrough/emp-deployment", "build-walkthrough/emp-parameters", "build-walkthrough/emp-interface", "build-walkthrough/new-params", "build-walkthrough/minting-etherscan",],
      },
      // {
      //   type: "category",
      //   label: "Minting Tokens",
      //   items: ["developers/mint-locally", "developers/mint-etherscan"],
      // },
      {
        type: "category",
        label: "Bots",
        items: ["developers/bots", "developers/bot-param", "developers/liquidation-opportunity-program"],
      },
      {
        type: "category",
        label: "Developer Mining",
        items: ["developers/developer-mining", "developers/devmining-reqs", "developers/designing-incentives"],
      },
      {
        type: "category",
        label: "Advanced Tutorials",
        items: ["developers/dvm-integration"],
      },
      {
        type: "category",
        label: "Developer Reference",
        items: ["dev-ref/addresses", "dev-ref/subgraphs", "dev-ref/bug-bounty", "dev-ref/mainnet-info",
        {
          type: "link",
          label: "Contracts (Github)",
          href:
            "https://github.com/UMAprotocol/protocol/tree/master/packages/core/contracts",
        },
        {
          type: "link",
          label: "Contract Documentation",
          href:
            "https://docs-dot-uma-protocol.appspot.com/uma/index.html",
        },],
      },

    ],
      "UMA Tokenholders": [
        "uma-tokenholders/uma-holders",
        "uma-tokenholders/adding-price-id",
        "uma-tokenholders/umips",
        {
          type: "category",
          label: "Voting Tutorials",
          items: ["uma-tokenholders/voter-dApp", "uma-tokenholders/voting-2key"],
        },
      ],
    "Events & Press": [
      "community/community-overview",
      {
        type: "category",
        label: "Events & Press",
        items: [ "community/press", "community/blog-posts", "community/events"],
      },
      {
        type: "category",
        label: "Farming Tutorials",
        items: ["users/mint-farm-yusd", "users/mint-farm-yusdbtc", "users/redeem-tokens"],
      },
    ],
};
