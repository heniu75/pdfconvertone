// Add this near the top of the file, after the imports
export const TRANSACTION_ANALYSIS_PROMPT = `Read the document.
It is likely a type of bank or credit card statement where transactions are detailed.
Locate all low level transaction records within this document.
If a transaction has data additional information for instance like location and original currency code, then consider them as part of 'Transaction Details'.
If a transaction is marked as 'CR' or 'CREDIT OR DIRECT DEBIT' OR 'DIRECT DEBIT TRANSACTION' or similar, then negate the transaction amount.
List all the resulting records as tabular entries.
If you determine that multiple tables will be produced, combined them all into a single table and add a new column named 'Transaction Type' at the start to differentiate the transaction type records.`;
