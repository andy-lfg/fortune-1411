export function transactionTemplate(type: "deposit" | "withdraw" | "milestone", amount?: number, currency?: string) {
  let title = "";
  let message = "";

  if (type === "deposit") {
    title = "✅ Einzahlung bestätigt";
    message = `Ihre Einzahlung von <strong>${amount} ${currency}</strong> wurde erfolgreich bestätigt.`;
  } else if (type === "withdraw") {
    title = "💸 Auszahlung freigegeben";
    message = `Ihre Auszahlung von <strong>${amount} ${currency}</strong> wurde soeben freigegeben.`;
  } else if (type === "milestone") {
    title = "🏆 Meilenstein erreicht!";
    message = `Herzlichen Glückwunsch! Sie haben einen neuen Meilenstein erreicht. Vielen Dank für Ihr Engagement.`;
  }

  return `
  <div style="font-family: Arial, sans-serif; padding: 20px; background: #0f172a; color: white;">
    <h2 style="color: #a855f7;">${title}</h2>
    <p style="font-size: 16px;">${message}</p>
    <p style="font-size: 14px; color: #9ca3af;">Fortune 1411 – Ihre Investment-Plattform</p>
  </div>
  `;
}
