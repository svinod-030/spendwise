package com.vinodsigadana030.spendwise

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

object NotificationHelper {

    private const val CHANNEL_ID   = "spendwise_transactions"
    private const val CHANNEL_NAME = "Transaction Alerts"
    private const val CHANNEL_DESC = "Notifies you whenever a bank/UPI transaction is detected in an SMS"

    /** Call once early (e.g. from SmsReceiver) to ensure the channel exists. */
    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (manager.getNotificationChannel(CHANNEL_ID) == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = CHANNEL_DESC
                    enableVibration(true)
                }
                manager.createNotificationChannel(channel)
            }
        }
    }

    /**
     * Post a transaction notification.
     *
     * @param context   Android context
     * @param amount    Transaction amount (e.g. 1250.0)
     * @param type      "expense" or "income"
     * @param merchant  Merchant / payee name (optional)
     * @param sender    Bank / sender short-code (e.g. "HDFCBK")
     */
    fun postTransactionNotification(
        context: Context,
        amount: Double,
        type: String,
        merchant: String?,
        sender: String
    ) {
        ensureChannel(context)

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Format amount nicely
        val formattedAmount = "₹%.2f".format(amount)

        // Build title
        val emoji  = if (type == "income") "💰" else "💸"
        val action = if (type == "income") "Received" else "Spent"
        val title  = "$emoji $action $formattedAmount"

        // Build body
        val body = if (!merchant.isNullOrBlank()) {
            "${if (type == "income") "From" else "At"} $merchant  •  via $sender"
        } else {
            "Transaction detected via $sender"
        }

        // Tap notification → open app
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?.apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK }

        val pendingIntent = if (launchIntent != null) {
            PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else null

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .apply { if (pendingIntent != null) setContentIntent(pendingIntent) }
            .build()

        // Use a stable-but-unique ID so multiple transactions don't collapse into one
        val notificationId = (System.currentTimeMillis() % Int.MAX_VALUE).toInt()
        manager.notify(notificationId, notification)
    }
}
