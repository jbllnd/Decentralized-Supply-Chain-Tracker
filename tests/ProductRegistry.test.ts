import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV, buffCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_PRODUCT_NAME = 101;
const ERR_INVALID_MAX_QUANTITY = 102;
const ERR_INVALID_ORIGIN = 103;
const ERR_INVALID_BATCH_ID = 104;
const ERR_INVALID_DESCRIPTION = 105;
const ERR_PRODUCT_ALREADY_EXISTS = 106;
const ERR_PRODUCT_NOT_FOUND = 107;
const ERR_INVALID_PRODUCT_TYPE = 115;
const ERR_INVALID_CATEGORY = 116;
const ERR_INVALID_LOCATION = 117;
const ERR_INVALID_CURRENCY = 118;
const ERR_INVALID_MIN_QUANTITY = 110;
const ERR_INVALID_EXPIRY = 111;
const ERR_MAX_PRODUCTS_EXCEEDED = 114;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_AUTHORITY_NOT_VERIFIED = 109;
const ERR_INVALID_HASH = 120;
const ERR_INVALID_WEIGHT = 121;
const ERR_INVALID_DIMENSIONS = 122;
const ERR_INVALID_MATERIAL = 123;
const ERR_INVALID_CERTIFICATION = 124;

interface Product {
  name: string;
  hash: Uint8Array;
  maxQuantity: number;
  origin: string;
  batchId: string;
  description: string;
  timestamp: number;
  creator: string;
  productType: string;
  category: string;
  location: string;
  currency: string;
  status: boolean;
  minQuantity: number;
  expiry: number;
  weight: number;
  dimensions: string;
  material: string;
  certification: string;
}

interface ProductUpdate {
  updateName: string;
  updateMaxQuantity: number;
  updateDescription: string;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class ProductRegistryMock {
  state: {
    nextProductId: number;
    maxProducts: number;
    creationFee: number;
    authorityContract: string | null;
    products: Map<number, Product>;
    productUpdates: Map<number, ProductUpdate>;
    productsByName: Map<string, number>;
    productsByHash: Map<string, number>;
  } = {
    nextProductId: 0,
    maxProducts: 10000,
    creationFee: 500,
    authorityContract: null,
    products: new Map(),
    productUpdates: new Map(),
    productsByName: new Map(),
    productsByHash: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextProductId: 0,
      maxProducts: 10000,
      creationFee: 500,
      authorityContract: null,
      products: new Map(),
      productUpdates: new Map(),
      productsByName: new Map(),
      productsByHash: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  // Helper to convert Uint8Array hashes to a Map key string
  hashToKey(hash: Uint8Array): string {
    // Convert Uint8Array to hex string without relying on Node Buffer
    return Array.prototype.map.call(hash, (b: number) => ('00' + b.toString(16)).slice(-2)).join('');
  }

  isVerifiedAuthority(principal: string): Result<boolean> {
    return { ok: true, value: this.authorities.has(principal) };
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setCreationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.creationFee = newFee;
    return { ok: true, value: true };
  }

  createProduct(
    name: string,
    hash: Uint8Array,
    maxQuantity: number,
    origin: string,
    batchId: string,
    description: string,
    productType: string,
    category: string,
    location: string,
    currency: string,
    minQuantity: number,
    expiry: number,
    weight: number,
    dimensions: string,
    material: string,
    certification: string
  ): Result<number> {
    if (this.state.nextProductId >= this.state.maxProducts) return { ok: false, value: ERR_MAX_PRODUCTS_EXCEEDED };
    if (!name || name.length > 100) return { ok: false, value: ERR_INVALID_PRODUCT_NAME };
    if (hash.length !== 32) return { ok: false, value: ERR_INVALID_HASH };
    if (maxQuantity <= 0) return { ok: false, value: ERR_INVALID_MAX_QUANTITY };
    if (!origin || origin.length > 100) return { ok: false, value: ERR_INVALID_ORIGIN };
    if (!batchId || batchId.length > 50) return { ok: false, value: ERR_INVALID_BATCH_ID };
    if (description.length > 500) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (!["electronics", "food", "clothing", "machinery"].includes(productType)) return { ok: false, value: ERR_INVALID_PRODUCT_TYPE };
    if (!category || category.length > 50) return { ok: false, value: ERR_INVALID_CATEGORY };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (minQuantity <= 0) return { ok: false, value: ERR_INVALID_MIN_QUANTITY };
    if (expiry <= this.blockHeight) return { ok: false, value: ERR_INVALID_EXPIRY };
    if (weight <= 0) return { ok: false, value: ERR_INVALID_WEIGHT };
    if (dimensions.length > 50) return { ok: false, value: ERR_INVALID_DIMENSIONS };
    if (material.length > 100) return { ok: false, value: ERR_INVALID_MATERIAL };
    if (certification.length > 100) return { ok: false, value: ERR_INVALID_CERTIFICATION };
    if (!this.isVerifiedAuthority(this.caller).value) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.productsByName.has(name)) return { ok: false, value: ERR_PRODUCT_ALREADY_EXISTS };
  const hashKey = this.hashToKey(hash);
  if (this.state.productsByHash.has(hashKey)) return { ok: false, value: ERR_PRODUCT_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.creationFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextProductId;
    const product: Product = {
      name,
      hash,
      maxQuantity,
      origin,
      batchId,
      description,
      timestamp: this.blockHeight,
      creator: this.caller,
      productType,
      category,
      location,
      currency,
      status: true,
      minQuantity,
      expiry,
      weight,
      dimensions,
      material,
      certification,
    };
    this.state.products.set(id, product);
    this.state.productsByName.set(name, id);
  this.state.productsByHash.set(hashKey, id);
    this.state.nextProductId++;
    return { ok: true, value: id };
  }

  getProduct(id: number): Product | null {
    return this.state.products.get(id) || null;
  }

  updateProduct(id: number, updateName: string, updateMaxQuantity: number, updateDescription: string): Result<boolean> {
    const product = this.state.products.get(id);
    if (!product) return { ok: false, value: false };
    if (product.creator !== this.caller) return { ok: false, value: false };
    if (!updateName || updateName.length > 100) return { ok: false, value: false };
    if (updateMaxQuantity <= 0) return { ok: false, value: false };
    if (updateDescription.length > 500) return { ok: false, value: false };
    if (this.state.productsByName.has(updateName) && this.state.productsByName.get(updateName) !== id) {
      return { ok: false, value: false };
    }

    const updated: Product = {
      ...product,
      name: updateName,
      maxQuantity: updateMaxQuantity,
      description: updateDescription,
      timestamp: this.blockHeight,
    };
    this.state.products.set(id, updated);
    this.state.productsByName.delete(product.name);
    this.state.productsByName.set(updateName, id);
    this.state.productUpdates.set(id, {
      updateName,
      updateMaxQuantity,
      updateDescription,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getProductCount(): Result<number> {
    return { ok: true, value: this.state.nextProductId };
  }

  checkProductExistence(name: string): Result<boolean> {
    return { ok: true, value: this.state.productsByName.has(name) };
  }
}

describe("ProductRegistry", () => {
  let contract: ProductRegistryMock;

  beforeEach(() => {
    contract = new ProductRegistryMock();
    contract.reset();
  });

  it("creates a product successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const result = contract.createProduct(
      "WidgetA",
      hash,
      1000,
      "FactoryX",
      "Batch001",
      "High quality widget",
      "electronics",
      "gadgets",
      "CityZ",
      "STX",
      100,
      100000,
      500,
      "10x10x10",
      "Plastic",
      "ISO9001"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const product = contract.getProduct(0);
    expect(product?.name).toBe("WidgetA");
    expect(product?.hash).toEqual(hash);
    expect(product?.maxQuantity).toBe(1000);
    expect(product?.origin).toBe("FactoryX");
    expect(product?.batchId).toBe("Batch001");
    expect(product?.description).toBe("High quality widget");
    expect(product?.productType).toBe("electronics");
    expect(product?.category).toBe("gadgets");
    expect(product?.location).toBe("CityZ");
    expect(product?.currency).toBe("STX");
    expect(product?.minQuantity).toBe(100);
    expect(product?.expiry).toBe(100000);
    expect(product?.weight).toBe(500);
    expect(product?.dimensions).toBe("10x10x10");
    expect(product?.material).toBe("Plastic");
    expect(product?.certification).toBe("ISO9001");
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate product names", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash1 = new Uint8Array(32).fill(1);
    const hash2 = new Uint8Array(32).fill(2);
    contract.createProduct(
      "WidgetA",
      hash1,
      1000,
      "FactoryX",
      "Batch001",
      "High quality widget",
      "electronics",
      "gadgets",
      "CityZ",
      "STX",
      100,
      100000,
      500,
      "10x10x10",
      "Plastic",
      "ISO9001"
    );
    const result = contract.createProduct(
      "WidgetA",
      hash2,
      2000,
      "FactoryY",
      "Batch002",
      "Better widget",
      "electronics",
      "tools",
      "TownW",
      "USD",
      200,
      200000,
      1000,
      "20x20x20",
      "Metal",
      "ISO14001"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PRODUCT_ALREADY_EXISTS);
  });

  it("rejects duplicate product hashes", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    contract.createProduct(
      "WidgetA",
      hash,
      1000,
      "FactoryX",
      "Batch001",
      "High quality widget",
      "electronics",
      "gadgets",
      "CityZ",
      "STX",
      100,
      100000,
      500,
      "10x10x10",
      "Plastic",
      "ISO9001"
    );
    const result = contract.createProduct(
      "WidgetB",
      hash,
      2000,
      "FactoryY",
      "Batch002",
      "Better widget",
      "electronics",
      "tools",
      "TownW",
      "USD",
      200,
      200000,
      1000,
      "20x20x20",
      "Metal",
      "ISO14001"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PRODUCT_ALREADY_EXISTS);
  });

  it("rejects non-authorized caller", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2FAKE";
    contract.authorities = new Set();
    const hash = new Uint8Array(32).fill(1);
    const result = contract.createProduct(
      "WidgetA",
      hash,
      1000,
      "FactoryX",
      "Batch001",
      "High quality widget",
      "electronics",
      "gadgets",
      "CityZ",
      "STX",
      100,
      100000,
      500,
      "10x10x10",
      "Plastic",
      "ISO9001"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects product creation without authority contract", () => {
    const hash = new Uint8Array(32).fill(1);
    const result = contract.createProduct(
      "WidgetA",
      hash,
      1000,
      "FactoryX",
      "Batch001",
      "High quality widget",
      "electronics",
      "gadgets",
      "CityZ",
      "STX",
      100,
      100000,
      500,
      "10x10x10",
      "Plastic",
      "ISO9001"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid max quantity", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const result = contract.createProduct(
      "WidgetA",
      hash,
      0,
      "FactoryX",
      "Batch001",
      "High quality widget",
      "electronics",
      "gadgets",
      "CityZ",
      "STX",
      100,
      100000,
      500,
      "10x10x10",
      "Plastic",
      "ISO9001"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_MAX_QUANTITY);
  });

  it("rejects invalid product type", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const result = contract.createProduct(
      "WidgetA",
      hash,
      1000,
      "FactoryX",
      "Batch001",
      "High quality widget",
      "invalid",
      "gadgets",
      "CityZ",
      "STX",
      100,
      100000,
      500,
      "10x10x10",
      "Plastic",
      "ISO9001"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PRODUCT_TYPE);
  });

  it("updates a product successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    contract.createProduct(
      "OldWidget",
      hash,
      1000,
      "FactoryX",
      "Batch001",
      "High quality widget",
      "electronics",
      "gadgets",
      "CityZ",
      "STX",
      100,
      100000,
      500,
      "10x10x10",
      "Plastic",
      "ISO9001"
    );
    const result = contract.updateProduct(0, "NewWidget", 2000, "Updated description");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const product = contract.getProduct(0);
    expect(product?.name).toBe("NewWidget");
    expect(product?.maxQuantity).toBe(2000);
    expect(product?.description).toBe("Updated description");
    const update = contract.state.productUpdates.get(0);
    expect(update?.updateName).toBe("NewWidget");
    expect(update?.updateMaxQuantity).toBe(2000);
    expect(update?.updateDescription).toBe("Updated description");
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent product", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateProduct(99, "NewWidget", 2000, "Updated description");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    contract.createProduct(
      "WidgetA",
      hash,
      1000,
      "FactoryX",
      "Batch001",
      "High quality widget",
      "electronics",
      "gadgets",
      "CityZ",
      "STX",
      100,
      100000,
      500,
      "10x10x10",
      "Plastic",
      "ISO9001"
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateProduct(0, "NewWidget", 2000, "Updated description");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets creation fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setCreationFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.creationFee).toBe(1000);
    const hash = new Uint8Array(32).fill(1);
    contract.createProduct(
      "WidgetA",
      hash,
      1000,
      "FactoryX",
      "Batch001",
      "High quality widget",
      "electronics",
      "gadgets",
      "CityZ",
      "STX",
      100,
      100000,
      500,
      "10x10x10",
      "Plastic",
      "ISO9001"
    );
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects creation fee change without authority contract", () => {
    const result = contract.setCreationFee(1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct product count", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash1 = new Uint8Array(32).fill(1);
    const hash2 = new Uint8Array(32).fill(2);
    contract.createProduct(
      "WidgetA",
      hash1,
      1000,
      "FactoryX",
      "Batch001",
      "High quality widget",
      "electronics",
      "gadgets",
      "CityZ",
      "STX",
      100,
      100000,
      500,
      "10x10x10",
      "Plastic",
      "ISO9001"
    );
    contract.createProduct(
      "WidgetB",
      hash2,
      2000,
      "FactoryY",
      "Batch002",
      "Better widget",
      "electronics",
      "tools",
      "TownW",
      "USD",
      200,
      200000,
      1000,
      "20x20x20",
      "Metal",
      "ISO14001"
    );
    const result = contract.getProductCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks product existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    contract.createProduct(
      "WidgetA",
      hash,
      1000,
      "FactoryX",
      "Batch001",
      "High quality widget",
      "electronics",
      "gadgets",
      "CityZ",
      "STX",
      100,
      100000,
      500,
      "10x10x10",
      "Plastic",
      "ISO9001"
    );
    const result = contract.checkProductExistence("WidgetA");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkProductExistence("NonExistent");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("rejects product creation with empty name", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const result = contract.createProduct(
      "",
      hash,
      1000,
      "FactoryX",
      "Batch001",
      "High quality widget",
      "electronics",
      "gadgets",
      "CityZ",
      "STX",
      100,
      100000,
      500,
      "10x10x10",
      "Plastic",
      "ISO9001"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PRODUCT_NAME);
  });

  it("rejects product creation with max products exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxProducts = 1;
    const hash1 = new Uint8Array(32).fill(1);
    const hash2 = new Uint8Array(32).fill(2);
    contract.createProduct(
      "WidgetA",
      hash1,
      1000,
      "FactoryX",
      "Batch001",
      "High quality widget",
      "electronics",
      "gadgets",
      "CityZ",
      "STX",
      100,
      100000,
      500,
      "10x10x10",
      "Plastic",
      "ISO9001"
    );
    const result = contract.createProduct(
      "WidgetB",
      hash2,
      2000,
      "FactoryY",
      "Batch002",
      "Better widget",
      "electronics",
      "tools",
      "TownW",
      "USD",
      200,
      200000,
      1000,
      "20x20x20",
      "Metal",
      "ISO14001"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_PRODUCTS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});