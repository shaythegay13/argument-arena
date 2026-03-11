// Stripe product & price IDs for the credit-based monetization system

export const STRIPE_PRO = {
  product_id: "prod_U7OtWtNsHfTIoU",
  price_id: "price_1T9A5NIN6aHiJNfpbFsvvKTr",
  price: 19,
  monthlyCredits: 10,
} as const;

export const CREDIT_PACKS = [
  {
    id: "starter",
    name: "Starter Pack",
    product_id: "prod_U7PGFSHKimigyy",
    price_id: "price_1T9ASKIN6aHiJNfpOaigNoJR",
    credits: 5,
    price: 10,
    perCredit: 2,
  },
  {
    id: "builder",
    name: "Builder Pack",
    product_id: "prod_U7PppbYmYQ99wv",
    price_id: "price_1T9AzaIN6aHiJNfp7y0yJW7k",
    credits: 20,
    price: 29,
    perCredit: 1.45,
    popular: true,
  },
  {
    id: "founder",
    name: "Founder Pack",
    product_id: "prod_U85Ttrs2dF7rwc",
    price_id: "price_1T9pIAIN6aHiJNfp3213kJyd",
    credits: 50,
    price: 59,
    perCredit: 1.18,
  },
] as const;

export const FREE_CREDITS = 2;
