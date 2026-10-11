import { 
  Customer, Vendor, Mark, Lot, Purchase, Sale, Payment, CashAccount, ExpenseCategory, Expense,
  StockMovement, ApprovalRequest, AuditLog, User, CompanySettings, CustomerLedgerEntry 
} from '../types';

export const SEED_USERS: User[] = [
  {
    id: 'u-1',
    name: 'Vedhaprem Reddy',
    username: 'owner',
    email: 'vedhaprem@mandi-onion.com',
    phone: '+91 98450 11223',
    role: 'OWNER',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    active: true
  },
  {
    id: 'u-2',
    name: 'Suresh Patil',
    username: 'manager',
    email: 'suresh@mandi-onion.com',
    phone: '+91 98450 44556',
    role: 'MANAGER',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    active: true
  },
  {
    id: 'u-3',
    name: 'Rajesh Kumar',
    username: 'salesperson',
    email: 'rajesh@mandi-onion.com',
    phone: '+91 98450 77889',
    role: 'SALESPERSON',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    active: true
  }
];

export const SEED_COMPANY: CompanySettings = {
  shopName: 'Vedhaprem Mandi Onion Wholesalers',
  mandiLicenseNo: 'APMC/PUN/2021/ONN-8842',
  gstNo: '27AABCV8892L1Z9',
  address: 'Shop No. 42-44, APMC Market Yard, Gultekdi, Pune - 411037',
  phone: '+91 98450 11223',
  altPhone: '+91 20 2426 8899',
  email: 'trade@vedhaprem-mandi.com',
  termsAndConditions: '1. Goods once inspected and sold will not be returned.\n2. Payment strictly within agreed credit days.\n3. Discrepancies in bag tare or weight must be notified within 24 hours of dispatch.',
  invoicePrefix: 'VPN-INV',
  receiptPrefix: 'VPN-REC'
};

export const SEED_MARKS: Mark[] = [
  {
    id: 'm-1',
    code: 'AA',
    name: 'Grade AA (Big Premium)',
    description: 'Extra large red onion, dry skin, tightly packed 50kg bags',
    defaultPurchaseRate: 47.00,
    defaultSellingRate: 69.00,
    qualityGrade: 'PREMIUM',
    colorTag: '#005da7'
  },
  {
    id: 'm-2',
    code: 'J',
    name: 'Grade J (Medium Bold)',
    description: 'Medium-bold 45-55mm uniform bulbs, excellent shelf life',
    defaultPurchaseRate: 44.00,
    defaultSellingRate: 64.00,
    qualityGrade: 'GRADE_1',
    colorTag: '#2976c7'
  },
  {
    id: 'm-3',
    code: 'K',
    name: 'Grade K (Regular Medium)',
    description: 'Regular commercial grade, suitable for hotels and retailers',
    defaultPurchaseRate: 40.00,
    defaultSellingRate: 58.00,
    qualityGrade: 'GRADE_2',
    colorTag: '#535f70'
  },
  {
    id: 'm-4',
    code: 'OK',
    name: 'Grade OK (Small Golta)',
    description: 'Small rounded golta onion, high demand for food processing',
    defaultPurchaseRate: 35.00,
    defaultSellingRate: 49.00,
    qualityGrade: 'COMMERCIAL',
    colorTag: '#7f5300'
  },
  {
    id: 'm-5',
    code: 'CV',
    name: 'Grade CV (Chikan Select)',
    description: 'Deep ruby red skin, high pungency Nashik origin',
    defaultPurchaseRate: 48.00,
    defaultSellingRate: 71.00,
    qualityGrade: 'PREMIUM',
    colorTag: '#9c27b0'
  },
  {
    id: 'm-6',
    code: 'TC',
    name: 'Grade TC (Transport Cargo)',
    description: 'Hard skin cured bulk stock ready for interstate dispatch',
    defaultPurchaseRate: 42.00,
    defaultSellingRate: 61.00,
    qualityGrade: 'GRADE_1',
    colorTag: '#00796b'
  }
];

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'c-1',
    code: 'CUST-001',
    name: 'ABC Traders',
    phone: '+91 98220 12345',
    email: 'procurement@abctraders.com',
    address: 'Plot 12, Shivaji Market, Camp, Pune',
    marketLocation: 'Pune Central',
    creditLimit: 250000,
    creditDays: 7,
    outstandingAmount: 150000,
    status: 'ACTIVE',
    createdAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 'c-2',
    code: 'CUST-002',
    name: 'Shree Enterprises',
    phone: '+91 98221 67890',
    email: 'shree.enterprises@gmail.com',
    address: 'Shop 8, Katraj Mandi, Pune',
    marketLocation: 'South Pune',
    creditLimit: 150000,
    creditDays: 10,
    outstandingAmount: 85000,
    status: 'ACTIVE',
    createdAt: '2026-01-15T11:30:00Z'
  },
  {
    id: 'c-3',
    code: 'CUST-003',
    name: 'Om Traders',
    phone: '+91 98222 34567',
    email: 'om.traders.pune@yahoo.com',
    address: 'Gala No. 19, Hadapsar Vegetable Yard, Pune',
    marketLocation: 'Hadapsar',
    creditLimit: 300000,
    creditDays: 5,
    outstandingAmount: 210000,
    status: 'ACTIVE',
    createdAt: '2026-02-01T09:15:00Z'
  },
  {
    id: 'c-4',
    code: 'CUST-004',
    name: 'Patel & Co',
    phone: '+91 98223 98765',
    email: 'patelandco.onions@gmail.com',
    address: 'Near Old Bus Stand, Chinchwad, PCMC',
    marketLocation: 'PCMC Industrial',
    creditLimit: 200000,
    creditDays: 14,
    outstandingAmount: 45000,
    status: 'ACTIVE',
    createdAt: '2026-02-10T14:40:00Z'
  }
];

export const SEED_VENDORS: Vendor[] = [
  {
    id: 'v-1',
    code: 'VEN-001',
    name: 'Murade Traders',
    phone: '+91 94220 55112',
    email: 'murade.lasalgaon@gmail.com',
    address: 'Opposite APMC Yard, Lasalgaon, Nashik',
    mandiCity: 'Lasalgaon (Nashik)',
    totalPurchases: 785000,
    payableAmount: 184500,
    status: 'ACTIVE',
    createdAt: '2026-01-05T08:00:00Z'
  },
  {
    id: 'v-2',
    code: 'VEN-002',
    name: 'Local Supplier',
    phone: '+91 94221 66223',
    email: 'manchar.farmers@gmail.com',
    address: 'Ghodegaon Road, Manchar, Pune Rural',
    mandiCity: 'Manchar',
    totalPurchases: 435000,
    payableAmount: 52000,
    status: 'ACTIVE',
    createdAt: '2026-01-12T09:30:00Z'
  },
  {
    id: 'v-3',
    code: 'VEN-003',
    name: 'Kaveri Traders',
    phone: '+91 94222 77334',
    email: 'kaveri.pimpalgaon@gmail.com',
    address: 'Near Cold Storage, Pimpalgaon Baswant, Nashik',
    mandiCity: 'Pimpalgaon Baswant',
    totalPurchases: 620000,
    payableAmount: 98000,
    status: 'ACTIVE',
    createdAt: '2026-01-20T10:00:00Z'
  }
];

export const SEED_LOTS: Lot[] = [
  {
    id: 'lot-1',
    lotNumber: 'LOT AP',
    vendorId: 'v-1',
    vendorName: 'Murade Traders',
    purchaseBillId: 'pur-1',
    purchaseBillNo: 'PUR-2026-081',
    arrivalDate: '2026-09-28',
    status: 'ACTIVE',
    totalBags: 230,
    totalWeightKg: 11800,
    remainingBags: 185,
    remainingWeightKg: 9540,
    marks: [
      {
        markCode: 'AA',
        initialBags: 100,
        initialWeightKg: 5200,
        remainingBags: 78,
        remainingWeightKg: 4056,
        purchaseRate: 47.00
      },
      {
        markCode: 'J',
        initialBags: 80,
        initialWeightKg: 4100,
        remainingBags: 67,
        remainingWeightKg: 3434,
        purchaseRate: 44.00
      },
      {
        markCode: 'K',
        initialBags: 50,
        initialWeightKg: 2500,
        remainingBags: 40,
        remainingWeightKg: 2050,
        purchaseRate: 40.00
      }
    ],
    notes: 'Lasalgaon special harvest - heavy grading, minimal moisture'
  },
  {
    id: 'lot-2',
    lotNumber: 'LOT CV',
    vendorId: 'v-3',
    vendorName: 'Kaveri Traders',
    purchaseBillId: 'pur-2',
    purchaseBillNo: 'PUR-2026-088',
    arrivalDate: '2026-09-30',
    status: 'ACTIVE',
    totalBags: 180,
    totalWeightKg: 9000,
    remainingBags: 145,
    remainingWeightKg: 7250,
    marks: [
      {
        markCode: 'CV',
        initialBags: 120,
        initialWeightKg: 6000,
        remainingBags: 95,
        remainingWeightKg: 4750,
        purchaseRate: 48.00
      },
      {
        markCode: 'OK',
        initialBags: 60,
        initialWeightKg: 3000,
        remainingBags: 50,
        remainingWeightKg: 2500,
        purchaseRate: 35.00
      }
    ],
    notes: 'Deep pink color, cured 3 days on field'
  },
  {
    id: 'lot-3',
    lotNumber: 'LOT TC',
    vendorId: 'v-2',
    vendorName: 'Local Supplier',
    purchaseBillId: 'pur-3',
    purchaseBillNo: 'PUR-2026-094',
    arrivalDate: '2026-10-01',
    status: 'ACTIVE',
    totalBags: 200,
    totalWeightKg: 10100,
    remainingBags: 190,
    remainingWeightKg: 9595,
    marks: [
      {
        markCode: 'TC',
        initialBags: 150,
        initialWeightKg: 7500,
        remainingBags: 142,
        remainingWeightKg: 7100,
        purchaseRate: 42.00
      },
      {
        markCode: 'AA',
        initialBags: 50,
        initialWeightKg: 2600,
        remainingBags: 48,
        remainingWeightKg: 2495,
        purchaseRate: 47.00
      }
    ],
    notes: 'Local Manchar delivery via tractor consignment'
  },
  {
    id: 'lot-4',
    lotNumber: 'LOT DN',
    vendorId: 'v-2',
    vendorName: 'Local Supplier',
    purchaseBillId: 'pur-4',
    purchaseBillNo: 'PUR-2026-070',
    arrivalDate: '2026-09-25',
    status: 'EXHAUSTED',
    totalBags: 10,
    totalWeightKg: 500,
    remainingBags: 0,
    remainingWeightKg: 0,
    marks: [
      {
        markCode: 'OK',
        initialBags: 10,
        initialWeightKg: 500,
        remainingBags: 0,
        remainingWeightKg: 0,
        purchaseRate: 40
      }
    ],
    notes: 'Fully dispatched lot kept so completed-lot profit can be checked against the purchase'
  },
  {
    id: 'lot-5',
    lotNumber: 'LOT NS',
    vendorId: 'v-2',
    vendorName: 'Local Supplier',
    purchaseBillId: 'pur-5',
    purchaseBillNo: 'PUR-2026-071',
    arrivalDate: '2026-09-27',
    status: 'ACTIVE',
    totalBags: 20,
    totalWeightKg: 1000,
    remainingBags: 20,
    remainingWeightKg: 1000,
    marks: [
      {
        markCode: 'TC',
        initialBags: 20,
        initialWeightKg: 1000,
        remainingBags: 20,
        remainingWeightKg: 1000,
        purchaseRate: 42
      }
    ],
    notes: 'Arrived and still unsold. Status follows remaining stock, not the arrival date'
  }
];

export const SEED_PURCHASES: Purchase[] = [
  {
    id: 'pur-1',
    billNumber: 'PUR-2026-081',
    vendorId: 'v-1',
    vendorName: 'Murade Traders',
    date: '2026-09-28',
    lotNumber: 'LOT AP',
    items: [
      { id: 'pi-1', markCode: 'AA', bags: 100, weightKg: 5200, ratePerKg: 47.00, totalAmount: 244400 },
      { id: 'pi-2', markCode: 'J', bags: 80, weightKg: 4100, ratePerKg: 44.00, totalAmount: 180400 },
      { id: 'pi-3', markCode: 'K', bags: 50, weightKg: 2500, ratePerKg: 40.00, totalAmount: 100000 }
    ],
    expenses: [
      { id: 'pe-1', type: 'FREIGHT', amount: 8500, description: 'Nashik to Pune truck freight' },
      { id: 'pe-2', type: 'HAMALI', amount: 2300, description: 'Unloading charges @ ₹10/bag' },
      { id: 'pe-3', type: 'MANDI_TAX', amount: 3200, description: 'Mandi APMC cess' }
    ],
    grossAmount: 524800,
    totalExpenses: 14000,
    netAmount: 538800,
    notes: 'Universal purchase entry with 3 distinct graded marks',
    attachmentUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
    attachmentName: 'Murade_Bill_081.pdf',
    createdAt: '2026-09-28T14:20:00Z'
  },
  {
    id: 'pur-2',
    billNumber: 'PUR-2026-088',
    vendorId: 'v-3',
    vendorName: 'Kaveri Traders',
    date: '2026-09-30',
    lotNumber: 'LOT CV',
    items: [
      { id: 'pi-4', markCode: 'CV', bags: 120, weightKg: 6000, ratePerKg: 48.00, totalAmount: 288000 },
      { id: 'pi-5', markCode: 'OK', bags: 60, weightKg: 3000, ratePerKg: 35.00, totalAmount: 105000 }
    ],
    expenses: [
      { id: 'pe-4', type: 'FREIGHT', amount: 7200, description: 'Direct tempo transport' },
      { id: 'pe-5', type: 'HAMALI', amount: 1800, description: 'Unloading charges' }
    ],
    grossAmount: 393000,
    totalExpenses: 9000,
    netAmount: 402000,
    notes: 'Pimpalgaon Baswant direct purchase',
    attachmentUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    attachmentName: 'Kaveri_Consignment_Bill.pdf',
    createdAt: '2026-09-30T16:45:00Z'
  },
  {
    id: 'pur-3',
    billNumber: 'PUR-2026-094',
    vendorId: 'v-2',
    vendorName: 'Local Supplier',
    date: '2026-10-01',
    lotNumber: 'LOT TC',
    items: [
      { id: 'pi-6', markCode: 'TC', bags: 150, weightKg: 7500, ratePerKg: 42.00, totalAmount: 315000 },
      { id: 'pi-7', markCode: 'AA', bags: 50, weightKg: 2600, ratePerKg: 47.00, totalAmount: 122200 }
    ],
    expenses: [
      { id: 'pe-6', type: 'HAMALI', amount: 2000, description: 'Mandi unloading' }
    ],
    grossAmount: 437200,
    totalExpenses: 2000,
    netAmount: 439200,
    notes: 'Local consignment from Manchar',
    attachmentUrl: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=600&auto=format&fit=crop&q=80',
    attachmentName: 'Local_Manchar_Slip.jpg',
    createdAt: '2026-10-01T11:10:00Z'
  },
  {
    id: 'pur-4',
    billNumber: 'PUR-2026-070',
    vendorId: 'v-2',
    vendorName: 'Local Supplier',
    date: '2026-09-25',
    lotNumber: 'LOT DN',
    items: [
      { id: 'pi-8', markCode: 'OK', bags: 10, weightKg: 500, ratePerKg: 40, totalAmount: 20000 }
    ],
    expenses: [
      { id: 'pe-7', type: 'OTHER', amount: 1000, description: 'Unloading on LOT DN' }
    ],
    grossAmount: 20000,
    totalExpenses: 1000,
    netAmount: 21000,
    notes: 'Completed lot purchase. Landed cost is goods plus this expense.',
    createdAt: '2026-09-25T09:00:00Z'
  },
  {
    id: 'pur-5',
    billNumber: 'PUR-2026-071',
    vendorId: 'v-2',
    vendorName: 'Local Supplier',
    date: '2026-09-27',
    lotNumber: 'LOT NS',
    items: [
      { id: 'pi-9', markCode: 'TC', bags: 20, weightKg: 1000, ratePerKg: 42, totalAmount: 42000 }
    ],
    expenses: [],
    grossAmount: 42000,
    totalExpenses: 0,
    netAmount: 42000,
    notes: 'Unsold arrival. No outgoing sale is linked to this lot.',
    createdAt: '2026-09-27T09:00:00Z'
  }
];

export const SEED_SALES: Sale[] = [
  {
    id: 'sale-1',
    billNumber: 'VPN-INV-1081',
    customerId: 'c-1',
    customerName: 'ABC Traders',
    customerPhone: '+91 98220 12345',
    customerAddress: 'Plot 12, Shivaji Market, Camp, Pune',
    date: '2026-10-01',
    time: '08:45 AM',
    items: [
      {
        id: 'si-1',
        markCode: 'AA',
        lotNumber: 'LOT AP',
        bags: 3,
        weightKg: 151,
        ratePerKg: 69.00,
        amount: 10419, // 151 * 69
        bagWeights: [
          { bagNumber: 1, weightKg: 50 },
          { bagNumber: 2, weightKg: 53 },
          { bagNumber: 3, weightKg: 48 }
        ]
      }
    ],
    totalBags: 3,
    totalWeightKg: 151,
    totalAmount: 10419,
    paymentType: 'CREDIT',
    paidAmount: 0,
    balanceDue: 10419,
    status: 'CONFIRMED',
    createdByUserId: 'u-3',
    createdByName: 'Rajesh Kumar',
    createdByRole: 'SALESPERSON',
    notes: 'Standard morning delivery for hotel contract',
    createdAt: '2026-10-01T08:45:00Z'
  },
  {
    id: 'sale-2',
    billNumber: 'VPN-INV-1082',
    customerId: 'c-3',
    customerName: 'Om Traders',
    customerPhone: '+91 98222 34567',
    customerAddress: 'Gala No. 19, Hadapsar Vegetable Yard, Pune',
    date: '2026-10-01',
    time: '10:15 AM',
    items: [
      {
        id: 'si-2',
        markCode: 'AA',
        lotNumber: 'LOT AP',
        bags: 3,
        weightKg: 151,
        ratePerKg: 69.00,
        amount: 10419,
        bagWeights: [
          { bagNumber: 1, weightKg: 50 },
          { bagNumber: 2, weightKg: 53 },
          { bagNumber: 3, weightKg: 48 }
        ]
      },
      {
        id: 'si-3',
        markCode: 'K',
        lotNumber: 'LOT AP',
        bags: 2,
        weightKg: 98,
        ratePerKg: 65.00,
        amount: 6370,
        bagWeights: [
          { bagNumber: 1, weightKg: 49 },
          { bagNumber: 2, weightKg: 49 }
        ]
      }
    ],
    totalBags: 5,
    totalWeightKg: 249,
    totalAmount: 16789,
    paymentType: 'CREDIT',
    paidAmount: 0,
    balanceDue: 16789,
    status: 'CONFIRMED',
    createdByUserId: 'u-3',
    createdByName: 'Rajesh Kumar',
    createdByRole: 'SALESPERSON',
    notes: 'Multi-quality morning dispatch',
    createdAt: '2026-10-01T10:15:00Z'
  },
  {
    id: 'sale-3',
    billNumber: 'VPN-INV-1083',
    customerId: 'c-2',
    customerName: 'Shree Enterprises',
    customerPhone: '+91 98221 67890',
    customerAddress: 'Shop 8, Katraj Mandi, Pune',
    date: '2026-10-01',
    time: '11:40 AM',
    items: [
      {
        id: 'si-4',
        markCode: 'J',
        lotNumber: 'LOT AP',
        bags: 10,
        weightKg: 512,
        ratePerKg: 64.00,
        amount: 32768,
        bagWeights: [
          { bagNumber: 1, weightKg: 51 }, { bagNumber: 2, weightKg: 52 }, { bagNumber: 3, weightKg: 50 },
          { bagNumber: 4, weightKg: 53 }, { bagNumber: 5, weightKg: 51 }, { bagNumber: 6, weightKg: 50 },
          { bagNumber: 7, weightKg: 52 }, { bagNumber: 8, weightKg: 51 }, { bagNumber: 9, weightKg: 51 },
          { bagNumber: 10, weightKg: 51 }
        ]
      }
    ],
    totalBags: 10,
    totalWeightKg: 512,
    totalAmount: 32768,
    paymentType: 'CASH',
    paidAmount: 32768,
    balanceDue: 0,
    status: 'CONFIRMED',
    createdByUserId: 'u-3',
    createdByName: 'Rajesh Kumar',
    createdByRole: 'SALESPERSON',
    notes: 'Spot cash settlement discount applied',
    createdAt: '2026-10-01T11:40:00Z'
  },
  {
    id: 'sale-4',
    billNumber: 'VPN-INV-1084',
    customerId: 'c-4',
    customerName: 'Patel & Co',
    customerPhone: '+91 98223 98765',
    customerAddress: 'Near Old Bus Stand, Chinchwad, PCMC',
    date: '2026-09-26',
    time: '04:10 PM',
    items: [
      {
        id: 'si-5',
        markCode: 'OK',
        lotNumber: 'LOT DN',
        bags: 10,
        weightKg: 500,
        ratePerKg: 60,
        amount: 30000,
        bagWeights: [
          { bagNumber: 1, weightKg: 50 }, { bagNumber: 2, weightKg: 50 }, { bagNumber: 3, weightKg: 50 },
          { bagNumber: 4, weightKg: 50 }, { bagNumber: 5, weightKg: 50 }, { bagNumber: 6, weightKg: 50 },
          { bagNumber: 7, weightKg: 50 }, { bagNumber: 8, weightKg: 50 }, { bagNumber: 9, weightKg: 50 },
          { bagNumber: 10, weightKg: 50 }
        ]
      }
    ],
    totalBags: 10,
    totalWeightKg: 500,
    productSubtotal: 30000,
    charges: {
      amaliPerBag: 20,
      marketFeePerBag: 10,
      amaliEnabled: true,
      marketFeeEnabled: true,
      bagCount: 10,
      amaliAmount: 200,
      marketFeeAmount: 100,
      otherCharges: 0,
      productSubtotal: 30000,
      totalAdditionalCharges: 300,
      finalInvoiceAmount: 30300
    },
    totalAmount: 30300,
    paymentType: 'CASH',
    paymentStatus: 'PAID',
    paidAmount: 30300,
    balanceDue: 0,
    status: 'CONFIRMED',
    createdByUserId: 'u-3',
    createdByName: 'Rajesh Kumar',
    createdByRole: 'SALESPERSON',
    notes: 'Finalized before later fee-setting changes. Saved Amali and market fee stay on this bill.',
    createdAt: '2026-09-26T16:10:00Z'
  }
];

export const SEED_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    receiptNumber: 'VPN-REC-501',
    customerId: 'c-1',
    customerName: 'ABC Traders',
    date: '2026-10-01',
    time: '12:30 PM',
    amount: 50000,
    paymentMethod: 'UPI',
    referenceNumber: 'UPI/628109481/HDFC',
    previousOutstanding: 200000,
    newOutstanding: 150000,
    notes: 'Partial payment against last week invoices',
    recordedBy: 'Vedhaprem Reddy',
    createdAt: '2026-10-01T12:30:00Z'
  },
  {
    id: 'pay-2',
    receiptNumber: 'VPN-REC-502',
    customerId: 'c-4',
    customerName: 'Patel & Co',
    date: '2026-10-01',
    time: '02:15 PM',
    amount: 30000,
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: 'NEFT/N1029384756',
    previousOutstanding: 75000,
    newOutstanding: 45000,
    notes: 'NEFT transfer cleared',
    recordedBy: 'Suresh Patil',
    createdAt: '2026-10-01T14:15:00Z'
  },
  {
    id: 'pay-3',
    receiptNumber: 'VPN-REC-503',
    customerId: 'c-4',
    customerName: 'Patel & Co',
    date: '2026-09-26',
    time: '04:12 PM',
    amount: 30300,
    paymentMethod: 'CASH',
    referenceNumber: 'VPN-INV-1084',
    previousOutstanding: 45000,
    newOutstanding: 45000,
    notes: 'Collected in full against VPN-INV-1084. Older outstanding was left unchanged.',
    recordedBy: 'Rajesh Kumar',
    createdAt: '2026-09-26T16:12:00Z'
  }
];

export const SEED_CASH_ACCOUNTS: CashAccount[] = [
  { id: 'acct-cash', name: 'Cash in Hand', kind: 'CASH', openingBalance: 0 },
  { id: 'acct-upi', name: 'UPI Account', kind: 'UPI', openingBalance: 0 },
  { id: 'acct-bank', name: 'Bank Account', kind: 'BANK', openingBalance: 0 },
];

export const SEED_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'exp-market-fee', name: 'Market Fee Expense', trackingCategory: 'MARKET_FEE' },
  { id: 'exp-amali', name: 'Amali Expense', trackingCategory: 'AMALI' },
  { id: 'exp-transport', name: 'Transport', trackingCategory: null },
  { id: 'exp-labour', name: 'Labour', trackingCategory: null },
  { id: 'exp-loading', name: 'Loading/Unloading', trackingCategory: null },
  { id: 'exp-purchase', name: 'Purchase Payments', trackingCategory: null },
  { id: 'exp-other', name: 'Other Operating Expenses', trackingCategory: null },
];

export const SEED_EXPENSES: Expense[] = [];

export const SEED_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'sm-1',
    date: '2026-09-28',
    type: 'PURCHASE_IN',
    referenceId: 'pur-1',
    referenceType: 'PURCHASE',
    lotNumber: 'LOT AP',
    markCode: 'AA',
    bags: 100,
    weightKg: 5200,
    balanceBagsAfter: 100,
    balanceWeightKgAfter: 5200,
    reason: 'Purchase consignment arrived from Murade Traders',
    performedBy: 'Suresh Patil'
  },
  {
    id: 'sm-2',
    date: '2026-09-28',
    type: 'PURCHASE_IN',
    referenceId: 'pur-1',
    referenceType: 'PURCHASE',
    lotNumber: 'LOT AP',
    markCode: 'J',
    bags: 80,
    weightKg: 4100,
    balanceBagsAfter: 80,
    balanceWeightKgAfter: 4100,
    reason: 'Purchase consignment arrived from Murade Traders',
    performedBy: 'Suresh Patil'
  },
  {
    id: 'sm-3',
    date: '2026-10-01',
    type: 'SALE_OUT',
    referenceId: 'sale-1',
    referenceType: 'SALE',
    lotNumber: 'LOT AP',
    markCode: 'AA',
    bags: 3,
    weightKg: 151,
    balanceBagsAfter: 97,
    balanceWeightKgAfter: 5049,
    reason: 'Sale to ABC Traders (INV-1081)',
    performedBy: 'Rajesh Kumar'
  },
  {
    id: 'sm-4',
    date: '2026-09-25',
    type: 'PURCHASE_IN',
    referenceId: 'pur-4',
    referenceType: 'PURCHASE',
    lotNumber: 'LOT DN',
    markCode: 'OK',
    bags: 10,
    weightKg: 500,
    balanceBagsAfter: 10,
    balanceWeightKgAfter: 500,
    reason: 'Purchase consignment arrived for LOT DN',
    performedBy: 'Suresh Patil'
  },
  {
    id: 'sm-5',
    date: '2026-09-26',
    type: 'SALE_OUT',
    referenceId: 'sale-4',
    referenceType: 'SALE',
    lotNumber: 'LOT DN',
    markCode: 'OK',
    bags: 10,
    weightKg: 500,
    balanceBagsAfter: 0,
    balanceWeightKgAfter: 0,
    reason: 'Sale to Patel & Co (INV-1084) depleted LOT DN',
    performedBy: 'Rajesh Kumar'
  },
  {
    id: 'sm-6',
    date: '2026-09-27',
    type: 'PURCHASE_IN',
    referenceId: 'pur-5',
    referenceType: 'PURCHASE',
    lotNumber: 'LOT NS',
    markCode: 'TC',
    bags: 20,
    weightKg: 1000,
    balanceBagsAfter: 20,
    balanceWeightKgAfter: 1000,
    reason: 'Unsold arrival for LOT NS',
    performedBy: 'Suresh Patil'
  }
];

export const SEED_APPROVALS: ApprovalRequest[] = [
  {
    id: 'app-1',
    entityType: 'SALE',
    entityId: 'sale-2',
    referenceNo: 'VPN-INV-1082',
    requestedBy: 'Rajesh Kumar',
    requestedByRole: 'SALESPERSON',
    requestedAt: '2026-10-01T10:45:00Z',
    reason: 'Bag weight entered incorrectly on scale during weighment: Bag 2 was 60kg instead of 53kg',
    status: 'PENDING',
    originalData: {
      totalWeightKg: 249,
      totalAmount: 16789,
      markItem: 'AA (3 bags, 151 KG @ ₹69)'
    },
    requestedData: {
      totalWeightKg: 256,
      totalAmount: 17272,
      markItem: 'AA (3 bags, 158 KG @ ₹69)'
    }
  }
];

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    timestamp: '2026-10-01T08:00:00Z',
    userId: 'u-1',
    userName: 'Vedhaprem Reddy',
    userRole: 'OWNER',
    action: 'SYSTEM_STARTUP',
    entity: 'SYSTEM',
    entityId: 'SYS-01',
    details: 'Mandi trading system session initiated for October 01, 2026'
  },
  {
    id: 'aud-2',
    timestamp: '2026-10-01T08:45:00Z',
    userId: 'u-3',
    userName: 'Rajesh Kumar',
    userRole: 'SALESPERSON',
    action: 'SALE_CREATED',
    entity: 'SALE',
    entityId: 'sale-1',
    details: 'Sale bill VPN-INV-1081 created for ABC Traders: 3 bags AA (151 KG) total ₹10,419'
  },
  {
    id: 'aud-3',
    timestamp: '2026-10-01T12:30:00Z',
    userId: 'u-1',
    userName: 'Vedhaprem Reddy',
    userRole: 'OWNER',
    action: 'PAYMENT_RECORDED',
    entity: 'PAYMENT',
    entityId: 'pay-1',
    details: 'Receipt VPN-REC-501 recorded for ABC Traders ₹50,000 via UPI'
  },
  {
    id: 'aud-4',
    timestamp: '2026-10-01T10:45:00Z',
    userId: 'u-3',
    userName: 'Rajesh Kumar',
    userRole: 'SALESPERSON',
    action: 'EDIT_REQUESTED',
    entity: 'SALE',
    entityId: 'sale-2',
    details: 'Requested correction for sale VPN-INV-1082: Bag weight correction from 151 KG to 158 KG'
  }
];

export const SEED_LEDGER_ENTRIES: CustomerLedgerEntry[] = [
  {
    id: 'led-1',
    date: '2026-09-20',
    customerId: 'c-1',
    type: 'OPENING',
    referenceNo: 'OPN-2026',
    description: 'Opening Balance for Season',
    debit: 189581,
    credit: 0,
    balance: 189581
  },
  {
    id: 'led-2',
    date: '2026-10-01',
    customerId: 'c-1',
    type: 'SALE',
    referenceNo: 'VPN-INV-1081',
    description: 'Onion Sale: 3 bags AA (151 KG @ ₹69)',
    debit: 10419,
    credit: 0,
    balance: 200000
  },
  {
    id: 'led-3',
    date: '2026-10-01',
    customerId: 'c-1',
    type: 'PAYMENT',
    referenceNo: 'VPN-REC-501',
    description: 'Payment received via UPI (HDFC)',
    debit: 0,
    credit: 50000,
    balance: 150000
  }
];
