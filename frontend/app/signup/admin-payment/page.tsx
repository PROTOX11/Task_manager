"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const ADMIN_SIGNUP_STORAGE_KEY = "pending-admin-signup";
const ADMIN_PLAN_AMOUNT = 499;

interface PendingSignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export default function AdminPaymentPage() {
  const [pendingSignup, setPendingSignup] = useState<PendingSignupData | null>(null);
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signupAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const rawValue = sessionStorage.getItem(ADMIN_SIGNUP_STORAGE_KEY);
    if (!rawValue) {
      toast.error("Start from the signup form before completing admin payment.");
      router.replace("/signup");
      return;
    }

    try {
      const parsedValue = JSON.parse(rawValue) as PendingSignupData;
      setPendingSignup(parsedValue);
      setCardholderName(`${parsedValue.firstName} ${parsedValue.lastName}`.trim());
    } catch {
      sessionStorage.removeItem(ADMIN_SIGNUP_STORAGE_KEY);
      toast.error("Your admin signup session expired. Please fill the form again.");
      router.replace("/signup");
    }
  }, [router]);

  const handlePayment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!pendingSignup) {
      toast.error("Admin signup details are missing.");
      return;
    }

    if (cardNumber.replace(/\s+/g, "").length < 16) {
      toast.error("Enter a valid card number.");
      return;
    }

    if (!expiryDate || !cvv || cvv.length < 3) {
      toast.error("Enter complete payment details.");
      return;
    }

    setIsLoading(true);

    try {
      const paymentReference = `ADMIN-${Date.now()}`;

      await signupAdmin({
        ...pendingSignup,
        paymentAmount: ADMIN_PLAN_AMOUNT,
        paymentReference,
      });

      sessionStorage.removeItem(ADMIN_SIGNUP_STORAGE_KEY);
      toast.success("Payment complete. Your admin account is ready.");
      router.push("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Payment succeeded but account creation failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!pendingSignup) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Complete Admin Payment</CardTitle>
          <CardDescription>
            Finish the payment below to activate admin access for {pendingSignup.email}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handlePayment}>
          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Admin plan</span>
                <span className="font-medium">TaskFlow Admin</span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-semibold">Rs. {ADMIN_PLAN_AMOUNT}</p>
                  <p className="text-sm text-muted-foreground">One-time activation payment</p>
                </div>
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>

            <Field>
              <FieldLabel htmlFor="cardholderName">Cardholder Name</FieldLabel>
              <Input
                id="cardholderName"
                placeholder="Name on card"
                value={cardholderName}
                onChange={(event) => setCardholderName(event.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="cardNumber">Card Number</FieldLabel>
              <Input
                id="cardNumber"
                inputMode="numeric"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(event) => setCardNumber(event.target.value)}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="expiryDate">Expiry Date</FieldLabel>
                <Input
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="cvv">CVV</FieldLabel>
                <Input
                  id="cvv"
                  inputMode="numeric"
                  placeholder="123"
                  value={cvv}
                  onChange={(event) => setCvv(event.target.value)}
                  required
                />
              </Field>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay Rs. {ADMIN_PLAN_AMOUNT} and Create Admin Account
            </Button>
            <p className="text-sm text-muted-foreground">
              Need to change account type?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Go back to signup
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
