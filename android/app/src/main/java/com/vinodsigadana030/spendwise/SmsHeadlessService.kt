package com.vinodsigadana030.spendwise

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class SmsHeadlessService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    intent ?: return null
    val address = intent.getStringExtra("address") ?: return null
    val body = intent.getStringExtra("body") ?: return null
    val timestamp = intent.getLongExtra("timestamp", System.currentTimeMillis())

    val data = Arguments.createMap().apply {
      putString("address", address)
      putString("body", body)
      putDouble("date", timestamp.toDouble())
    }

    return HeadlessJsTaskConfig(
      "SmsReceivedTask",
      data,
      30_000,
      true
    )
  }
}
