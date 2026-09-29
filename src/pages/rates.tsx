import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Navbar from "@/components/shared/NavBar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePaymentStore } from "stores/paymentStore";

type RateField = "currentRate" | "merchantRate" | "profitRate";
type RateValues = Record<RateField, string>;

const emptyRates: RateValues = {
  currentRate: "",
  merchantRate: "",
  profitRate: "",
};

const fields: Array<{
  name: RateField;
  label: string;
  description: string;
}> = [
  {
    name: "currentRate",
    label: "Rate",
    description: "The current exchange rate in naira.",
  },
  {
    name: "merchantRate",
    label: "Merchant rate",
    description: "The rate used for merchant transactions.",
  },
  {
    name: "profitRate",
    label: "Profit rate",
    description: "The profit amount included in the transaction rate.",
  },
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

async function readResponse(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }

  return data;
}

export default function RatesPage() {
  const [rates, setRates] = useState<RateValues>(emptyRates);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { setRate, setMerchantRate, setProfitRate } = usePaymentStore();

  useEffect(() => {
    const controller = new AbortController();

    async function loadRates() {
      try {
        const data = await readResponse(await fetch("/api/rates/manage", {
          signal: controller.signal,
        }));
        setRates({
          currentRate: String(data.currentRate),
          merchantRate: String(data.merchantRate),
          profitRate: String(data.profitRate),
        });
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadRates();
    return () => controller.abort();
  }, []);

  const updateField = (field: RateField, value: string) => {
    setRates((current) => ({ ...current, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const hasInvalidRate = Object.values(rates).some((value) => {
      const number = Number(value);
      return !Number.isFinite(number) || number <= 0;
    });

    if (hasInvalidRate) {
      setError("Enter a number greater than zero for all three rates.");
      return;
    }

    setIsSaving(true);

    try {
      const data = await readResponse(await fetch("/api/rates/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rates),
      }));

      const nextRates = {
        currentRate: String(data.currentRate),
        merchantRate: String(data.merchantRate),
        profitRate: String(data.profitRate),
      };

      setRates(nextRates);
      setRate(nextRates.currentRate);
      setMerchantRate(nextRates.merchantRate);
      setProfitRate(nextRates.profitRate);
      setSuccess("Rates updated successfully.");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Manage Rates | 2Settle</title>
        <meta name="description" content="Update 2Settle transaction rates" />
      </Head>
      <div className="min-h-screen bg-[#f5f7fc] pb-12">
        <Navbar />
        <main className="mx-auto w-full max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#426cb6] hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Link>

          <Card className="border-[#dfe6f4] shadow-lg">
            <CardHeader className="border-b border-[#e5eaf4]">
              <CardTitle className="text-2xl text-gray-900">Manage rates</CardTitle>
              <CardDescription>
                Update the rate values used by 2Settle transactions.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {error && (
                <Alert variant="destructive" className="mb-5">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="mb-5 border-green-200 bg-green-50 text-green-800">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {isLoading ? (
                <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  Loading rates...
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-3">
                    {fields.map(({ name, label, description }) => (
                      <div key={name} className="space-y-2">
                        <Label htmlFor={name}>{label}</Label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">₦</span>
                          <Input
                            id={name}
                            name={name}
                            type="number"
                            min="0.01"
                            step="0.01"
                            inputMode="decimal"
                            value={rates[name]}
                            onChange={(event) => updateField(name, event.target.value)}
                            className="h-11 pl-8"
                            required
                          />
                        </div>
                        <p className="text-xs leading-5 text-gray-500">{description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end border-t border-[#e5eaf4] pt-5">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="h-11 min-w-36 bg-[#3f82f5] hover:bg-[#306fd8]"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 size-4" aria-hidden="true" />
                          Update rates
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
