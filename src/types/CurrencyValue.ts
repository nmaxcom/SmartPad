/**
 * @file CurrencyValue - Currency values with symbol and proper arithmetic
 * @description Represents currency amounts with their symbols, solving the issue
 * where "$100" was treated as a generic string. Provides type-safe currency
 * arithmetic with proper symbol validation and formatting.
 */

import { SemanticValue, SemanticValueType, DisplayOptions } from './SemanticValue';
import { NumberValue } from './NumberValue';
import { PercentageValue } from './PercentageValue';

export type CurrencySymbol = '$' | '€' | '£' | '¥' | '₹' | '₿' | 'CHF' | 'CAD' | 'AUD';

/**
 * Currency metadata for proper formatting and validation
 */
interface CurrencyInfo {
  symbol: CurrencySymbol;
  name: string;
  decimalPlaces: number;
  symbolPosition: 'before' | 'after';
}

const CURRENCY_INFO: Record<CurrencySymbol, CurrencyInfo> = {
  '$': { symbol: '$', name: 'USD', decimalPlaces: 2, symbolPosition: 'before' },
  '€': { symbol: '€', name: 'EUR', decimalPlaces: 2, symbolPosition: 'before' },
  '£': { symbol: '£', name: 'GBP', decimalPlaces: 2, symbolPosition: 'before' },
  '¥': { symbol: '¥', name: 'JPY', decimalPlaces: 0, symbolPosition: 'before' },
  '₹': { symbol: '₹', name: 'INR', decimalPlaces: 2, symbolPosition: 'before' },
  '₿': { symbol: '₿', name: 'BTC', decimalPlaces: 8, symbolPosition: 'before' },
  'CHF': { symbol: 'CHF', name: 'CHF', decimalPlaces: 2, symbolPosition: 'after' },
  'CAD': { symbol: 'CAD', name: 'CAD', decimalPlaces: 2, symbolPosition: 'after' },
  'AUD': { symbol: 'AUD', name: 'AUD', decimalPlaces: 2, symbolPosition: 'after' },
};

/**
 * Represents a currency amount with its symbol
 * Solves the ambiguity of "$100" by clearly separating symbol and amount
 * 
 * Examples:
 * - "$100" -> CurrencyValue('$', 100)
 * - "€50.25" -> CurrencyValue('€', 50.25)
 * - "¥1000" -> CurrencyValue('¥', 1000)
 */
export class CurrencyValue extends SemanticValue {
  private readonly symbol: CurrencySymbol;
  private readonly amount: number;
  private readonly currencyInfo: CurrencyInfo;

  constructor(symbol: CurrencySymbol, amount: number) {
    super();
    
    if (!CURRENCY_INFO[symbol]) {
      throw new Error(`Unsupported currency symbol: ${symbol}`);
    }
    
    if (!isFinite(amount)) {
      throw new Error(`Invalid currency amount: ${amount}`);
    }
    
    this.symbol = symbol;
    this.amount = amount;
    this.currencyInfo = CURRENCY_INFO[symbol];
  }

  getType(): SemanticValueType {
    return 'currency';
  }

  getNumericValue(): number {
    return this.amount;
  }

  /**
   * Get the currency symbol
   */
  getSymbol(): CurrencySymbol {
    return this.symbol;
  }

  /**
   * Get currency info for formatting
   */
  getCurrencyInfo(): CurrencyInfo {
    return this.currencyInfo;
  }

  isNumeric(): boolean {
    return true;
  }

  canConvertTo(targetType: SemanticValueType): boolean {
    // Currencies can be converted to numbers (losing currency meaning)
    return targetType === 'currency' || targetType === 'number';
  }

  toString(options?: DisplayOptions): string {
    const precision = options?.precision ?? this.currencyInfo.decimalPlaces;
    const formattedAmount = this.formatCurrencyAmount(this.amount, precision);
    
    if (this.currencyInfo.symbolPosition === 'before') {
      return `${this.symbol}${formattedAmount}`;
    } else {
      return `${formattedAmount} ${this.symbol}`;
    }
  }

  equals(other: SemanticValue, tolerance = 1e-10): boolean {
    if (other.getType() !== 'currency') {
      return false;
    }
    
    const otherCurrency = other as CurrencyValue;
    return this.symbol === otherCurrency.symbol && 
           Math.abs(this.amount - otherCurrency.amount) <= tolerance;
  }

  add(other: SemanticValue): SemanticValue {
    if (other.getType() === 'currency') {
      const otherCurrency = other as CurrencyValue;
      
      if (this.symbol !== otherCurrency.symbol) {
        throw this.createIncompatibilityError(other, 'add', `cannot add different currencies: ${this.symbol} and ${otherCurrency.symbol}`);
      }
      
      return new CurrencyValue(this.symbol, this.amount + otherCurrency.amount);
    }
    
    if (other.getType() === 'number') {
      // $100 + 5 = $105 (treating number as same currency)
      // This is questionable but common in practice
      return new CurrencyValue(this.symbol, this.amount + other.getNumericValue());
    }
    
    if (other.getType() === 'percentage') {
      // $100 + 20% = $120 (percentage increase)
      const percentValue = other as PercentageValue;
      return percentValue.on(this);
    }
    
    throw this.createIncompatibilityError(other, 'add', 'invalid currency addition');
  }

  subtract(other: SemanticValue): SemanticValue {
    if (other.getType() === 'currency') {
      const otherCurrency = other as CurrencyValue;
      
      if (this.symbol !== otherCurrency.symbol) {
        throw this.createIncompatibilityError(other, 'subtract', `cannot subtract different currencies: ${this.symbol} and ${otherCurrency.symbol}`);
      }
      
      return new CurrencyValue(this.symbol, this.amount - otherCurrency.amount);
    }
    
    if (other.getType() === 'number') {
      // $100 - 5 = $95
      return new CurrencyValue(this.symbol, this.amount - other.getNumericValue());
    }
    
    if (other.getType() === 'percentage') {
      // $100 - 20% = $80 (percentage decrease)  
      const percentValue = other as PercentageValue;
      return percentValue.off(this);
    }
    
    throw this.createIncompatibilityError(other, 'subtract', 'invalid currency subtraction');
  }

  multiply(other: SemanticValue): SemanticValue {
    if (other.getType() === 'number') {
      // $100 * 3 = $300
      return new CurrencyValue(this.symbol, this.amount * other.getNumericValue());
    }
    
    if (other.getType() === 'percentage') {
      // $100 * 20% = $20 (percentage of amount)
      const percentDecimal = other.getNumericValue();
      return new CurrencyValue(this.symbol, this.amount * percentDecimal);
    }
    
    if (other.getType() === 'currency') {
      throw this.createIncompatibilityError(other, 'multiply', 'cannot multiply two currency amounts');
    }
    
    throw this.createIncompatibilityError(other, 'multiply', 'invalid currency multiplication');
  }

  divide(other: SemanticValue): SemanticValue {
    if (other.getNumericValue() === 0) {
      throw new Error('Division by zero');
    }
    
    if (other.getType() === 'number') {
      // $100 / 4 = $25
      return new CurrencyValue(this.symbol, this.amount / other.getNumericValue());
    }
    
    if (other.getType() === 'percentage') {
      // $100 / 20% = $500
      const percentDecimal = other.getNumericValue();
      return new CurrencyValue(this.symbol, this.amount / percentDecimal);
    }
    
    if (other.getType() === 'currency') {
      const otherCurrency = other as CurrencyValue;
      
      if (this.symbol !== otherCurrency.symbol) {
        throw this.createIncompatibilityError(other, 'divide', `cannot divide different currencies: ${this.symbol} and ${otherCurrency.symbol}`);
      }
      
      // $100 / $25 = 4 (dimensionless ratio)
      return new NumberValue(this.amount / otherCurrency.amount);
    }
    
    throw this.createIncompatibilityError(other, 'divide', 'invalid currency division');
  }

  power(exponent: number): SemanticValue {
    // Currency raised to power doesn't make physical sense, but we'll allow it
    if (!isFinite(exponent)) {
      throw new Error(`Invalid exponent: ${exponent}`);
    }
    
    if (exponent === 1) {
      return this.clone();
    }
    
    if (exponent === 0) {
      // $100^0 = 1 (dimensionless)
      return new NumberValue(1);
    }
    
    // For other exponents, lose currency meaning and return as number
    const result = Math.pow(this.amount, exponent);
    return new NumberValue(result);
  }

  clone(): CurrencyValue {
    return new CurrencyValue(this.symbol, this.amount);
  }

  /**
   * Format currency amount according to currency rules
   */
  private formatCurrencyAmount(amount: number, precision: number): string {
    const rounded = Math.round(amount);
    if (Math.abs(amount - rounded) < 1e-9) {
      return rounded.toString();
    }

    // Special handling for currencies with no decimal places (like JPY)
    if (this.currencyInfo.decimalPlaces === 0) {
      return Math.round(amount).toString();
    }
    
    // For other currencies, format with appropriate decimal places
    const fixed = amount.toFixed(precision);
    
    // Remove trailing zeros after decimal point
    const parts = fixed.split(".");
    if (parts.length === 2) {
      const trimmed = parts[1].replace(/0+$/, "");
      if (!trimmed) {
        return parts[0];
      }
      return `${parts[0]}.${trimmed}`;
    }

    return fixed;
  }

  /**
   * Create currency from string like "$100" or "€50.25"
   */
  static fromString(str: string): CurrencyValue {
    // Try symbol-first format: "$100", "€50.25"
    let match = str.match(/^([\$€£¥₹₿])\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)$/);
    if (match) {
      const symbol = match[1] as CurrencySymbol;
      const amount = parseFloat(match[2].replace(/,/g, ""));
      return new CurrencyValue(symbol, amount);
    }
    
    // Try symbol-last format: "100 CHF", "50.25 CAD"
    match = str.match(/^(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s+(CHF|CAD|AUD)$/);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ""));
      const symbol = match[2] as CurrencySymbol;
      return new CurrencyValue(symbol, amount);
    }
    
    throw new Error(`Invalid currency format: "${str}"`);
  }

  /**
   * Create currency with validation
   */
  static create(symbol: CurrencySymbol, amount: number): CurrencyValue {
    return new CurrencyValue(symbol, amount);
  }

  /**
   * Check if a symbol is supported
   */
  static isSupportedSymbol(symbol: string): symbol is CurrencySymbol {
    return symbol in CURRENCY_INFO;
  }

  /**
   * Get all supported currency symbols
   */
  static getSupportedSymbols(): CurrencySymbol[] {
    return Object.keys(CURRENCY_INFO) as CurrencySymbol[];
  }

  /**
   * Convert to a different currency (requires exchange rate)
   * This is a placeholder for future enhancement
   */
  convertTo(targetSymbol: CurrencySymbol, exchangeRate: number): CurrencyValue {
    if (this.symbol === targetSymbol) {
      return this.clone();
    }
    
    const convertedAmount = this.amount * exchangeRate;
    return new CurrencyValue(targetSymbol, convertedAmount);
  }

  /**
   * Convert to plain number (losing currency meaning)
   */
  toNumber(): NumberValue {
    return new NumberValue(this.amount);
  }

  getMetadata(): Record<string, any> {
    return {
      ...super.getMetadata(),
      symbol: this.symbol,
      amount: this.amount,
      currencyName: this.currencyInfo.name,
      decimalPlaces: this.currencyInfo.decimalPlaces
    };
  }
}
