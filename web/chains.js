// =====================================================================
//  chains.js — EVM networks + curated ERC-20 tokens + swap routers.
//  Swaps use the Uniswap V2 Router02 interface — the same standard ABI
//  Uniswap / SushiSwap / PancakeSwap all share — one router per chain.
// =====================================================================

export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

export const UNISWAP_V2_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
];

export const NETWORKS = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    native: 'ETH',
    nativeDecimals: 18,
    coingecko: 'ethereum',
    clay: '#a88fbb',
    explorer: 'https://etherscan.io',
    swap: {
      // Uniswap V2 Router02
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      wrapped: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    },
    rpcs: [
      'https://ethereum.publicnode.com',
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://cloudflare-eth.com',
    ],
    tokens: [
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  coingecko: 'usd-coin' },
      { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  coingecko: 'tether' },
      { symbol: 'DAI',  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, coingecko: 'dai' },
      { symbol: 'LINK', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, coingecko: 'chainlink' },
      { symbol: 'UNI',  address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, coingecko: 'uniswap' },
    ],
  },
  {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    native: 'POL',
    nativeDecimals: 18,
    coingecko: 'matic-network',
    clay: '#e8894e',
    explorer: 'https://polygonscan.com',
    swap: {
      // SushiSwap V2 Router02 (Uniswap V2-compatible) on Polygon
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      wrapped: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
    },
    rpcs: [
      'https://polygon-bor.publicnode.com',
      'https://polygon-rpc.com',
      'https://polygon.llamarpc.com',
    ],
    tokens: [
      { symbol: 'USDC', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6,  coingecko: 'usd-coin' },
      { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6,  coingecko: 'tether' },
      { symbol: 'WETH', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, coingecko: 'ethereum' },
    ],
  },
  {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    native: 'ETH',
    nativeDecimals: 18,
    coingecko: 'ethereum',
    clay: '#cba4bd',
    explorer: 'https://basescan.org',
    swap: {
      // SushiSwap V2 Router02 on Base (Uniswap V2-compatible)
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      wrapped: '0x4200000000000000000000000000000000000006', // WETH
    },
    rpcs: [
      'https://mainnet.base.org',
      'https://base.llamarpc.com',
      'https://base.publicnode.com',
    ],
    tokens: [
      { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, coingecko: 'usd-coin' },
      { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, coingecko: 'ethereum' },
    ],
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    chainId: 42161,
    native: 'ETH',
    nativeDecimals: 18,
    coingecko: 'ethereum',
    clay: '#9ab8e8',
    explorer: 'https://arbiscan.io',
    swap: {
      // SushiSwap V2 Router02 on Arbitrum
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      wrapped: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
    },
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum-one.publicnode.com',
    ],
    tokens: [
      { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, coingecko: 'usd-coin' },
      { symbol: 'ARB',  address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, coingecko: 'arbitrum' },
      { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, coingecko: 'ethereum' },
    ],
  },
  {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    native: 'ETH',
    nativeDecimals: 18,
    coingecko: 'ethereum',
    clay: '#e2796a',
    explorer: 'https://optimistic.etherscan.io',
    swap: {
      // SushiSwap V2 Router02 on Optimism
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      wrapped: '0x4200000000000000000000000000000000000006', // WETH
    },
    rpcs: [
      'https://mainnet.optimism.io',
      'https://optimism.publicnode.com',
    ],
    tokens: [
      { symbol: 'USDC', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, coingecko: 'usd-coin' },
      { symbol: 'OP',   address: '0x4200000000000000000000000000000000000042', decimals: 18, coingecko: 'optimism' },
    ],
  },
  {
    id: 'bnb',
    name: 'BNB Chain',
    chainId: 56,
    native: 'BNB',
    nativeDecimals: 18,
    coingecko: 'binancecoin',
    clay: '#e8c06a',
    explorer: 'https://bscscan.com',
    swap: {
      // PancakeSwap V2 Router (Uniswap V2-compatible) on BNB Chain
      router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
      wrapped: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    },
    rpcs: [
      'https://bsc-dataseed.binance.org',
      'https://bsc.publicnode.com',
      'https://binance.llamarpc.com',
    ],
    tokens: [
      { symbol: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, coingecko: 'usd-coin' },
      { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, coingecko: 'tether' },
      { symbol: 'WBNB', address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18, coingecko: 'binancecoin' },
    ],
  },
  {
    id: 'sepolia',
    name: 'Sepolia',
    chainId: 11155111,
    native: 'ETH',
    nativeDecimals: 18,
    coingecko: null, // testnet ETH has no market value
    clay: '#b7c9a8',
    explorer: 'https://sepolia.etherscan.io',
    testnet: true,
    faucet: 'https://faucets.chain.link/sepolia',
    swap: { router: null, wrapped: null }, // no canonical V2 router on Sepolia
    rpcs: [
      'https://ethereum-sepolia.publicnode.com',
      'https://rpc.sepolia.org',
      'https://sepolia.drpc.org',
    ],
    tokens: [],
  },
];

export function networkById(id) {
  return NETWORKS.find((n) => n.id === id) || NETWORKS[0];
}
