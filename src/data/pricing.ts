// Stripe product & price IDs for the credit-based monetization system

export const STRIPE_PRO = {
  product_id: "prod_U7OtWtNsHfTIoU",
  price_id: "price_1T9A5NIN6aHiJNfpbFsvvKTr",
  price: 19,
  monthlyCredits: 15,
} as const;

export const STRIPE_STUDIO = {
  product_id: "prod_U85rRKfBRN9oEQ",
  price_id: "price_1T9pg3IN6aHiJNfpZEArQYTJ",
  price: 79,
} as const;

export const SINGLE_EVAL = {
  id: "single",
  name: "Single Evaluation",
  product_id: "prod_U85r5NULrggnG7",
  price_id: "price_1T9pfvIN6aHiJNfpBCp1cnsD",
  credits: 1,
  price: 3,
  perCredit: 3,
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
    popular: false,
  },
  {
    id: "builder",
    name: "Builder Pack",
    product_id: "prod_U7PppbYmYQ99wv",
    price_id: "price_1T9AzaIN6aHiJNfp7y0yJW7k",
    credits: 15,
    price: 29,
    perCredit: 1.93,
    popular: true,
  },
  {
    id: "founder",
    name: "Founder Pack",
    product_id: "prod_U85Ttrs2dF7rwc",
    price_id: "price_1T9pIAIN6aHiJNfp3213kJyd",
    credits: 40,
    price: 59,
    perCredit: 1.48,
    popular: false,
  },
] as const;

export const FREE_CREDITS = 2;
