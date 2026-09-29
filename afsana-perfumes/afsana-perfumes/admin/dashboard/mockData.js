// Placeholder data shaped like the future GET /api/analytics/dashboard response.
// Swap the useEffect fetch in Dashboard.jsx to hit the real endpoint once
// Phase 3 (API layer) exists — the component shape won't need to change.

export const mockKpis = {
  todayRevenue: "PKR 84,200",
  monthRevenue: "PKR 1,942,000",
  totalOrders: 312,
  pendingOrders: 18,
  lowStockCount: 6,
  avgOrderValue: "PKR 3,150",
};

export const mockRevenueSeries = [
  { date: "Sep 1", revenue: 42000 },
  { date: "Sep 5", revenue: 51000 },
  { date: "Sep 9", revenue: 47500 },
  { date: "Sep 13", revenue: 62000 },
  { date: "Sep 17", revenue: 58000 },
  { date: "Sep 21", revenue: 71000 },
  { date: "Sep 25", revenue: 68500 },
  { date: "Sep 29", revenue: 84200 },
];

export const mockRecentOrders = [
  { id: "AF-10231", customer: "Sana Malik", total: "PKR 6,400", status: "Shipped", date: "29 Sep" },
  { id: "AF-10230", customer: "Bilal Qureshi", total: "PKR 2,150", status: "New", date: "29 Sep" },
  { id: "AF-10229", customer: "Ayesha Raza", total: "PKR 11,900", status: "Processing", date: "28 Sep" },
  { id: "AF-10228", customer: "Hamza Tariq", total: "PKR 3,600", status: "Delivered", date: "28 Sep" },
  { id: "AF-10227", customer: "Fatima Noor", total: "PKR 4,200", status: "Return Requested", date: "27 Sep" },
];

export const mockLowStock = [
  { id: "p1", name: "Oud Rihan — 50ml", stock: 3, threshold: 10 },
  { id: "p2", name: "Amber Noir — 30ml", stock: 1, threshold: 10 },
  { id: "p3", name: "Blanc Musk — 100ml", stock: 5, threshold: 15 },
];

export const mockSecurityAlerts = [
  { id: "a1", message: "New device login for Owner account", time: "2h ago" },
  { id: "a2", message: "3 failed login attempts — staff account 'hamza'", time: "5h ago" },
];
