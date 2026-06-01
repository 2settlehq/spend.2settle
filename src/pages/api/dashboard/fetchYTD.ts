import { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import connection from "@/lib/mysql";

const getGoogleCredentials = () => {
  const base64 = process.env.GOOGLE_CREDENTIALS_BASE64;
  if (!base64) return null;
  return JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} not allowed`);
  }

  try {
    // fetch the volume from excel
    const sheetID = process.env.SHEET_ID;
    const range = process.env.RANGE;
    const credentials = getGoogleCredentials();
    let sheetVolume = 0;

    if (credentials && sheetID && range) {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });

      const sheets = google.sheets({ version: "v4", auth });

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetID,
        range: range,
      });

      const rawSheetValue: string = response.data.values?.[0]?.[0] ?? "0";
      sheetVolume = parseFloat(rawSheetValue.replace(/[,$]/g, "")) || 0;
    } else {
      console.warn(
        "Google Sheet volume skipped: GOOGLE_CREDENTIALS_BASE64, SHEET_ID, or RANGE is missing",
      );
    }

    // historical volume from legacy summaries table (pre-payment-engine era), frozen at migration
    const LEGACY_SUMMARIES_VOLUME = 20845.73;

    // Fetch total settled volume from the payment engine.
    // payment_sessions stores fiat_amount in NGN and exchange_rate as NGN/USD.
    let engineVolume = 0;
    try {
      const [rows]: any = await connection.execute(
        `
          SELECT COALESCE(
            SUM(
              CASE
                WHEN exchange_rate IS NOT NULL AND exchange_rate > 0
                THEN fiat_amount / exchange_rate
                ELSE 0
              END
            ),
            0
          ) AS total
          FROM payment_sessions
          WHERE status = 'settled'
        `,
      );

      engineVolume = parseFloat(rows[0]?.total ?? 0) || 0;
    } catch (error) {
      console.warn("Payment engine volume skipped:", error);
    }

    const totalVolume = sheetVolume + LEGACY_SUMMARIES_VOLUME + engineVolume;

    res.status(200).json({ ytdVolume: "0", dbVolume: totalVolume.toFixed(8) });
  } catch (e: any) {
    console.log("Error fetching Year To Date Volume", e);
    res.status(500).json({ error: "Failed to retrieve YTD Volume", detail: e?.message });
  }
}
