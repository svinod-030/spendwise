package com.vinodsigadana030.spendwise

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.SmsMessage
import com.facebook.react.HeadlessJsTaskService

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "android.provider.Telephony.SMS_RECEIVED") return

        val messages = android.provider.Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        if (messages.isEmpty()) return

        val fullBody = StringBuilder()
        for (sms in messages) {
            fullBody.append(sms.displayMessageBody)
        }

        val firstSms = messages[0]
        val address   = firstSms.displayOriginatingAddress ?: "Unknown"
        val timestamp = firstSms.timestampMillis
        val body      = fullBody.toString()

        // ── Fire a local notification if this looks like a transaction ────────
        val parsed = SmsTransactionParser.tryParse(body)
        if (parsed != null) {
            NotificationHelper.postTransactionNotification(
                context   = context,
                amount    = parsed.amount,
                type      = parsed.type,
                merchant  = parsed.merchant,
                sender    = address
            )
        }

        // ── Start headless JS task to persist the transaction ─────────────────
        val serviceIntent = Intent(context, SmsHeadlessService::class.java).apply {
            putExtra("address",   address)
            putExtra("body",      body)
            putExtra("timestamp", timestamp)
        }

        HeadlessJsTaskService.acquireWakeLockNow(context)
        try {
            context.startService(serviceIntent)
        } catch (e: Exception) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            }
        }

        // ── Notify the active foreground app to refresh ───────────────────────
        SmsEventModule.sendEvent("onSmsReceived")
    }
}
