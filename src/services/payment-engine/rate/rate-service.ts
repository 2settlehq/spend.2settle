/**
 * Rate Service
 *
 * Handles fetching and locking exchange rates for payments.
 *
 * Two rates are needed for every payment:
 * 1. Exchange rate: NGN per USD (e.g., 1600 means $1 = ₦1600)
 * 2. Asset price: USD per crypto unit (e.g., 95000 means 1 BTC = $95,000)
 *
 * Rate Locking:
 * -------------
 * When a user starts a payment, we "lock" both rates. This means:
 * - The user sees a fixed crypto amount to send
 * - Even if the market moves, the quoted amount doesn't change
 * - Protects both user and platform from volatility during the payment window
 *
 * Rate Sources:
 * -------------
 * - Exchange rate: From our `rates` table (updated periodically)
 * - Asset price: From CoinMarketCap API (fetched on demand)
 *
 * Caching:
 * --------
 * We cache rates briefly (60 seconds) to:
 * - Reduce API calls to CoinMarketCap (they have rate limits)
 * - Speed up responses for multiple concurrent payments
 * - The cache is short enough that rates stay reasonably fresh
 */

import { CryptoCurrency, FiatCurrency, RateLock, DEFAULT_CONFIG } from '../types';
import { RateServiceUnavailableError } from '../errors';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Raw rate data before processing.
 */
interface RateData {
  /** NGN per USD exchange rate */
  exchangeRate: number;

  /** Merchant rate (different from customer rate) */
  merchantRate: number;

  /** Profit margin rate */
  profitRate: number;
}

/**
 * Crypto price data.
 */
interface AssetPrice {
  /** The crypto symbol */
  symbol: CryptoCurrency;

  /** Price in USD */
  priceUsd: number;

  /** When this price was fetched */
  fetchedAt: Date;
}

/**
 * Cached rate entry.
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: Date;
}

// =============================================================================
// CACHE
// =============================================================================

/**
 * Simple in-memory cache.
 *
 * Why in-memory?
 * - Fast: No network round-trip
 * - Simple: No Redis/external dependency
 * - Sufficient: Our cache TTL is short (60s), and each server instance
 *   having its own cache is acceptable for our scale
 *
 * Limitation: Each serverless function instance has its own cache.
 * At high scale, consider Redis for shared caching.
 */
class RateCache {
  private exchangeRateCache: CacheEntry<RateData> | null = null;
  private assetPriceCache: Map<CryptoCurrency, CacheEntry<AssetPrice>> = new Map();

  /** Cache TTL in milliseconds (60 seconds) */
  private readonly TTL_MS = 60 * 1000;

  /**
   * Get cached exchange rate if still valid.
   */
  getExchangeRate(): RateData | null {
    if (!this.exchangeRateCache) return null;

    // Check if expired
    if (new Date() > this.exchangeRateCache.expiresAt) {
      this.exchangeRateCache = null;
      return null;
    }

    return this.exchangeRateCache.data;
  }

  /**
   * Store exchange rate in cache.
   */
  setExchangeRate(data: RateData): void {
    this.exchangeRateCache = {
      data,
      expiresAt: new Date(Date.now() + this.TTL_MS),
    };
  }

  /**
   * Get cached asset price if still valid.
   */
  getAssetPrice(symbol: CryptoCurrency): AssetPrice | null {
    const entry = this.assetPriceCache.get(symbol);
    if (!entry) return null;

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.assetPriceCache.delete(symbol);
      return null;
    }

    return entry.data;
  }

  /**
   * Store asset price in cache.
   */
  setAssetPrice(price: AssetPrice): void {
    this.assetPriceCache.set(price.symbol, {
      data: price,
      expiresAt: new Date(Date.now() + this.TTL_MS),
    });
  }

  /**
   * Clear all cached data.
   * Useful for testing or when rates need to be refreshed immediately.
   */
  clear(): void {
    this.exchangeRateCache = null;
    this.assetPriceCache.clear();
  }
}

// Global cache instance (shared within a server instance)
const cache = new RateCache();

// =============================================================================
// RATE FETCHING
// =============================================================================

/**
 * Fetch exchange rate from the database.
 *
 * This calls your existing /api/rates endpoints internally.
 * In production, you might want to query the DB directly here
 * to avoid an extra HTTP hop.
 *
 * @param fiatCurrency - The fiat currency (only NGN supported initially)
 * @returns Rate data including exchange, merchant, and profit rates
 */
async function fetchExchangeRateFromDb(fiatCurrency: FiatCurrency): Promise<RateData> {
  // For now, we only support NGN
  if (fiatCurrency !== 'NGN') {
    throw new RateServiceUnavailableError(`Currency ${fiatCurrency} not supported yet`);
  }

  try {
    // Import pool here to avoid circular dependencies
    const pool = (await import('@/lib/mysql')).default;

    // Fetch all rates in a single query
    const [rows] = await pool.execute<any[]>('SELECT * FROM rates LIMIT 1');

    if (!rows || rows.length === 0) {
      throw new RateServiceUnavailableError('No rates found in database');
    }

    const rateRow = rows[0];

    // Parse the rates (they might be stored as strings with commas)
    const parseRate = (value: string | number): number => {
      if (typeof value === 'number') return value;
      return parseFloat(value.toString().replace(/,/g, ''));
    };

    const currentRate = parseRate(rateRow.current_rate);
    const merchantRate = parseRate(rateRow.merchant_rate || rateRow.current_rate);
    const profitRate = parseRate(rateRow.profit_rate || 0);

    return {
      // `current_rate` is already the customer rate after profit has been
      // deducted from `merchant_rate` by the payment engine.
      exchangeRate: currentRate,
      merchantRate,
      profitRate,
    };
  } catch (error) {
    if (error instanceof RateServiceUnavailableError) {
      throw error;
    }
    throw new RateServiceUnavailableError(
      'Failed to fetch exchange rate',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Fetch crypto asset price from CoinMarketCap.
 *
 * @param crypto - The cryptocurrency symbol
 * @returns Asset price in USD
 */
async function fetchAssetPriceFromApi(crypto: CryptoCurrency): Promise<AssetPrice> {
  try {
    // For USDT, the price is always ~$1
    // We can skip the API call and return a fixed price
    if (crypto === 'USDT') {
      return {
        symbol: 'USDT',
        priceUsd: 1.0,
        fetchedAt: new Date(),
      };
    }

    // Use axios to call CoinMarketCap
    const axios = (await import('axios')).default;

    const response = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
      {
        params: { symbol: crypto },
        headers: {
          'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY,
        },
        timeout: 10000, // 10 second timeout
      }
    );

    const priceUsd = response.data.data[crypto].quote.USD.price;

    return {
      symbol: crypto,
      priceUsd,
      fetchedAt: new Date(),
    };
  } catch (error) {
    throw new RateServiceUnavailableError(
      `Failed to fetch ${crypto} price`,
      error instanceof Error ? error : undefined
    );
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get current exchange rate.
 *
 * Uses cache if available, fetches from DB if not.
 *
 * @param fiatCurrency - The fiat currency
 * @returns Current exchange rate data
 */
export async function getExchangeRate(fiatCurrency: FiatCurrency = 'NGN'): Promise<RateData> {
  // Check cache first
  const cached = cache.getExchangeRate();
  if (cached) {
    return cached;
  }

  // Fetch fresh rate
  const rateData = await fetchExchangeRateFromDb(fiatCurrency);

  // Cache it
  cache.setExchangeRate(rateData);

  return rateData;
}

/**
 * Get current asset price.
 *
 * Uses cache if available, fetches from CoinMarketCap if not.
 *
 * @param crypto - The cryptocurrency
 * @returns Current price in USD
 */
export async function getAssetPrice(crypto: CryptoCurrency): Promise<number> {
  // Check cache first
  const cached = cache.getAssetPrice(crypto);
  if (cached) {
    return cached.priceUsd;
  }

  // Fetch fresh price
  const assetPrice = await fetchAssetPriceFromApi(crypto);

  // Cache it
  cache.setAssetPrice(assetPrice);

  return assetPrice.priceUsd;
}

/**
 * Lock rates for a payment session.
 *
 * This fetches current rates and returns them in a "locked" structure
 * that includes expiration time. The caller should store these with
 * the payment session.
 *
 * @param crypto - The cryptocurrency being used
 * @param fiatCurrency - The fiat currency for settlement
 * @param ttlMinutes - How long the lock is valid (default: from config)
 * @returns Locked rate data
 */
export async function lockRate(
  crypto: CryptoCurrency,
  fiatCurrency: FiatCurrency = 'NGN',
  ttlMinutes: number = DEFAULT_CONFIG.rateLockTtlMinutes
): Promise<RateLock> {
  // Fetch both rates (can run in parallel)
  const [rateData, assetPrice] = await Promise.all([
    getExchangeRate(fiatCurrency),
    getAssetPrice(crypto),
  ]);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  return {
    rate: rateData.exchangeRate,
    assetPrice,
    lockedAt: now,
    expiresAt,
  };
}

/**
 * Check if a rate lock is still valid.
 *
 * @param lock - The rate lock to check
 * @returns True if the lock hasn't expired
 */
export function isRateLockValid(lock: RateLock): boolean {
  return new Date() < lock.expiresAt;
}

/**
 * Calculate crypto amount from fiat amount using locked rates.
 *
 * Formula:
 * 1. Convert fiat to USD: fiatAmount / rate
 * 2. Convert USD to crypto: usdAmount / assetPrice
 *
 * Example:
 * - fiatAmount: ₦50,000
 * - rate: 1,600 (₦/USD)
 * - assetPrice: $95,000 (BTC/USD)
 * - Result: 50000 / 1600 / 95000 = 0.000328947 BTC
 *
 * @param fiatAmount - Amount in fiat currency
 * @param lock - The locked rates
 * @returns Amount in crypto
 */
export function fiatToCrypto(fiatAmount: number, lock: RateLock): number {
  // Step 1: Fiat to USD
  const usdAmount = fiatAmount / lock.rate;

  // Step 2: USD to Crypto
  const cryptoAmount = usdAmount / lock.assetPrice;

  return cryptoAmount;
}

/**
 * Calculate fiat amount from crypto amount using locked rates.
 *
 * This is the reverse of fiatToCrypto.
 *
 * @param cryptoAmount - Amount in crypto
 * @param lock - The locked rates
 * @returns Amount in fiat
 */
export function cryptoToFiat(cryptoAmount: number, lock: RateLock): number {
  // Step 1: Crypto to USD
  const usdAmount = cryptoAmount * lock.assetPrice;

  // Step 2: USD to Fiat
  const fiatAmount = usdAmount * lock.rate;

  return fiatAmount;
}

/**
 * Clear the rate cache.
 * Useful for testing or forcing a refresh.
 */
export function clearRateCache(): void {
  cache.clear();
}

// =============================================================================
// EXPORTS FOR TESTING
// =============================================================================

export const __testing__ = {
  cache,
  fetchExchangeRateFromDb,
  fetchAssetPriceFromApi,
};
