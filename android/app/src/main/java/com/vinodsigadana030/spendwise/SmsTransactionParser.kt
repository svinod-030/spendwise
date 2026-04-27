package com.vinodsigadana030.spendwise

import java.util.regex.Pattern

/**
 * Lightweight native-side SMS transaction parser.
 *
 * Mirrors the key detection logic from the TypeScript [smsParser.ts] so that
 * the [SmsReceiver] can post a local notification *immediately* — before the
 * Hermes/React-Native bridge starts — both in foreground and headless modes.
 *
 * It intentionally stays simple: we only need enough signal to decide
 * "is this a transaction?" and extract amount / type / merchant for the
 * notification title/body.  Full persistence is still handled by JS.
 */
object SmsTransactionParser {

    data class ParsedTransaction(
        val amount: Double,
        val type: String,       // "expense" | "income"
        val merchant: String?
    )

    // ── Keyword gates ─────────────────────────────────────────────────────────

    private val TRANSACTION_KEYWORDS = listOf(
        "debited", "credited", "spent", "received", "paid", "payment",
        "txn", "transaction", "upi", "withdrawn", "withdrew", "deposited",
        "transfer", "purchase", "sent", "added", "neft", "imps", "rtgs", "withdrawal"
    )

    private val EXCLUDE_KEYWORDS = listOf(
        "due", "outstanding", "reminder", "generated", "statement",
        "overdue", "will be debited", "payment request", "requested a payment"
    )

    private val NON_TRANSACTIONAL = listOf(
        Pattern.compile("\\botp\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("bank\\s*alert", Pattern.CASE_INSENSITIVE),
        Pattern.compile("one.?time.?pass", Pattern.CASE_INSENSITIVE)
    )

    // ── Amount pattern ────────────────────────────────────────────────────────

    private val AMOUNT_PATTERN = Pattern.compile(
        "(?:rs\\.?|inr|₹)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)",
        Pattern.CASE_INSENSITIVE
    )

    // ── Direct merchant keywords (highest priority) ───────────────────────────

    private val DIRECT_MERCHANTS = listOf(
        "blinkit", "bigbasket", "zepto", "swiggy", "zomato", "uber", "ola",
        "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa",
        "netflix", "prime", "hotstar", "spotify", "youtube",
        "pharmeasy", "1mg", "apollo", "dominos",
        "makemytrip", "goibibo", "irctc", "bookmyshow", "pvr",
        "airtel", "jio", "vodafone", "bsnl",
        "paytm", "phonepe", "gpay", "google pay", "cred",
        "tata power", "bescom", "mseb", "hpcl", "bpcl", "shell"
    )

    // ── To/at pattern ─────────────────────────────────────────────────────────

    private val TO_AT_PATTERN = Pattern.compile(
        "(?:to|at|from|towards|for|by)\\s+([A-Za-z0-9 .&'\\-]{2,60}?)\\s+" +
        "(?:on|for|using|via|ref|id|balance|bal|date|is|at|towards|\\.Avl|Avl|Cheque|$)",
        Pattern.CASE_INSENSITIVE
    )

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns a [ParsedTransaction] if [body] looks like a financial transaction,
     * or `null` otherwise.
     */
    fun tryParse(body: String): ParsedTransaction? {
        val lower = body.lowercase()

        // 1. Skip non-transactional messages
        if (NON_TRANSACTIONAL.any { it.matcher(body).find() }) return null
        if (EXCLUDE_KEYWORDS.any { lower.contains(it) }) return null
        if (TRANSACTION_KEYWORDS.none { lower.contains(it) }) return null

        // 2. Detect direction
        val type = detectType(lower) ?: return null

        // 3. Extract amount
        val amountMatcher = AMOUNT_PATTERN.matcher(body)
        if (!amountMatcher.find()) return null
        val amount = amountMatcher.group(1)?.replace(",", "")?.toDoubleOrNull() ?: return null
        if (amount <= 0) return null

        // 4. Extract merchant
        val merchant = extractMerchant(body, lower)

        return ParsedTransaction(amount = amount, type = type, merchant = merchant)
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun detectType(lower: String): String? {
        return when {
            Regex("debited|spent|paid|purchase|withdrawn|withdrawal|minus|taken out|sent").containsMatchIn(lower) -> "expense"
            Regex("credited|received|deposited|refund|plus|added to").containsMatchIn(lower) -> "income"
            Regex("transfer|neft|imps|rtgs").containsMatchIn(lower) -> "expense"
            else -> null
        }
    }

    private fun extractMerchant(body: String, lower: String): String? {
        // Direct match first
        for (m in DIRECT_MERCHANTS) {
            if (lower.contains(m)) {
                return m.replaceFirstChar { it.uppercase() }
            }
        }

        // Pattern: to/at/from … <Merchant>
        val toAtMatcher = TO_AT_PATTERN.matcher(body)
        if (toAtMatcher.find()) {
            val raw = toAtMatcher.group(1)?.trim()
            if (!raw.isNullOrBlank() && raw.length >= 3) return cleanMerchant(raw)
        }

        return null
    }

    private fun cleanMerchant(name: String): String? {
        val noiseWords = setOf(
            "using", "via", "on", "at", "to", "from", "for", "ref", "id",
            "bank", "ac", "acct", "available", "bal", "balance", "txn", "vpa", "upi"
        )
        var cleaned = name
            .replace(Regex("\\b(?:vpa|upi|info|id|ref|txn|a/c|acct|acc|date)\\b.*", RegexOption.IGNORE_CASE), "")
            .replace(Regex("[*\\-]"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()

        cleaned = cleaned.replace(Regex("(?:\\.Avl|\\bAvl\\b|\\bCheque\\b).*", RegexOption.IGNORE_CASE), "").trim()

        val words = cleaned.split(" ").toMutableList()
        if (words.isNotEmpty() && noiseWords.contains(words.first().lowercase()) && words.size > 1) words.removeAt(0)
        if (words.isNotEmpty() && noiseWords.contains(words.last().lowercase()) && words.size > 1) words.removeAt(words.lastIndex)
        cleaned = words.joinToString(" ")

        if (cleaned.length < 3) return null
        if (Regex("^rs\\.?\\s*[0-9]", RegexOption.IGNORE_CASE).containsMatchIn(cleaned)) return null
        if (Regex("^[0-9 ]+$").matches(cleaned)) return null

        return cleaned.replaceFirstChar { it.uppercase() }
    }
}
