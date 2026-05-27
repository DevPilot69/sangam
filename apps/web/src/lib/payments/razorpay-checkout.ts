type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay is only available in the browser"));
  }
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });
  return scriptPromise;
}

export async function openRazorpayCheckout(
  options: Omit<RazorpayCheckoutOptions, "handler"> & {
    onSuccess: (response: RazorpayHandlerResponse) => void;
    onDismiss?: () => void;
  }
): Promise<void> {
  await loadRazorpayScript();
  if (!window.Razorpay) {
    throw new Error("Razorpay checkout unavailable");
  }
  const { onSuccess, onDismiss, ...rest } = options;
  const rzp = new window.Razorpay({
    ...rest,
    handler: onSuccess,
    modal: { ondismiss: onDismiss },
  });
  rzp.open();
}

export type { RazorpayHandlerResponse };
