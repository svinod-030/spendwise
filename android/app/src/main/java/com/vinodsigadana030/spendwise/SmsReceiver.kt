package com.vinodsigadana030.spendwise

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.telephony.SmsMessage
import com.facebook.react.HeadlessJsTaskService

class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != "android.provider.Telephony.SMS_RECEIVED") return

    val bundle: Bundle = intent.extras ?: return
    val pdus = bundle.get("pdus") as? Array<*> ?: return
    val format = bundle.getString("format")

    for (pdu in pdus) {
      val sms = if (format != null) {
        SmsMessage.createFromPdu(pdu as ByteArray, format)
      } else {
        @Suppress("DEPRECATION")
        SmsMessage.createFromPdu(pdu as ByteArray)
      }

      val serviceIntent = Intent(context, SmsHeadlessService::class.java).apply {
        putExtra("address", sms.displayOriginatingAddress ?: "")
        putExtra("body", sms.displayMessageBody ?: "")
        putExtra("timestamp", sms.timestampMillis)
      }
      HeadlessJsTaskService.acquireWakeLockNow(context)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(serviceIntent)
      } else {
        context.startService(serviceIntent)
      }
    }
  }
}
