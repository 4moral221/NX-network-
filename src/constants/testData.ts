/**
 * Testing Dataset for NX Hybrid Matcher
 */
export const SAMPLE_PRODUCTS = [
  { sku: "BR-500", name: "Brookside Fresh Milk 500ml", category: "Dairy" },
  { sku: "BR-1000", name: "Brookside Fresh Milk 1L", category: "Dairy" },
  { sku: "F-2KG", name: "Pembe Maize Flour 2kg", category: "Flour" },
  { sku: "F-1KG", name: "Pembe Maize Flour 1kg", category: "Flour" },
  { sku: "WF-2KG", name: "Ajab Wheat Flour 2kg", category: "Flour" },
  { sku: "CC-500", name: "Coca-Cola Soda 500ml", category: "Beverages" },
  { sku: "CC-2L", name: "Coca-Cola Soda 2L", category: "Beverages" },
  { sku: "NK-AF1-B", name: "Nike Air Force 1 Black", category: "Footwear" },
  { sku: "NK-AF1-W", name: "Nike Air Force 1 White", category: "Footwear" },
  { sku: "BL-CH-50", name: "Blue Band Margarine 50g", category: "Spreads" },
  { sku: "BL-CH-250", name: "Blue Band Margarine 250g", category: "Spreads" },
  { sku: "JG-10", name: "Jogoo Maize Meal 2kg", category: "Flour" },
];

export const TEST_QUERIES = [
  "nike af1 blk",      // Should match Nike Air Force 1 Black (Abbreviation expansion)
  "cocacola 500ml",    // Should match Coca-Cola Soda 500ml (Typo/Concatenation)
  "unga ya ugali",     // Should match Pembe/Jogoo Maize Meal (Semantic)
  "fresh milk 1l",     // Should match Brookside Fresh Milk 1L (Direct)
  "blueband 250",      // Should match Blue Band Margarine 250g (Partial)
];
