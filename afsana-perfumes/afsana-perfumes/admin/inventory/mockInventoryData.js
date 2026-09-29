// Available Stock = Current Stock - Reserved Stock (per spec's inventory.formula)

export const mockInventory = [
  {
    id: "p1",
    name: "Oud Rihan — 50ml",
    sku: "AF-OUD-050",
    current: 8,
    reserved: 5,
    lowStockThreshold: 10,
  },
  {
    id: "p2",
    name: "Amber Noir — 30ml",
    sku: "AF-AMB-030",
    current: 4,
    reserved: 3,
    lowStockThreshold: 10,
  },
  {
    id: "p3",
    name: "Blanc Musk — 100ml",
    sku: "AF-BLN-100",
    current: 20,
    reserved: 2,
    lowStockThreshold: 15,
  },
  {
    id: "p4",
    name: "Rose Attar — 12ml",
    sku: "AF-ATR-012",
    current: 0,
    reserved: 0,
    lowStockThreshold: 20,
  },
  {
    id: "p5",
    name: "Signature Gift Box",
    sku: "AF-GFT-001",
    current: 35,
    reserved: 4,
    lowStockThreshold: 10,
  },
];

// Shape matches inventory.history.records in the spec.
export const mockStockHistory = [
  { id: "h1", product: "Oud Rihan — 50ml", type: "Restock", change: "+20", who: "Ayesha (Owner)", when: "27 Sep, 4:10 PM", reason: "Purchase order PO-0042 received" },
  { id: "h2", product: "Amber Noir — 30ml", type: "Order", change: "-2", who: "System", when: "28 Sep, 11:02 AM", reason: "Order AF-10229" },
  { id: "h3", product: "Rose Attar — 12ml", type: "Damaged", change: "-3", who: "Hamza (Manager)", when: "28 Sep, 2:45 PM", reason: "Water damage during transit" },
  { id: "h4", product: "Blanc Musk — 100ml", type: "Stock Adjustment", change: "+1", who: "Ayesha (Owner)", when: "29 Sep, 9:15 AM", reason: "Recount correction" },
];
