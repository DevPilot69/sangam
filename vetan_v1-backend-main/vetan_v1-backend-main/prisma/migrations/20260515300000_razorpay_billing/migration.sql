-- Razorpay billing (replace Stripe column names)
ALTER TABLE "Subscription" RENAME COLUMN "stripeCustomerId" TO "razorpayCustomerId";
ALTER TABLE "Subscription" RENAME COLUMN "stripeSubId" TO "razorpaySubscriptionId";
ALTER TABLE "Subscription" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
