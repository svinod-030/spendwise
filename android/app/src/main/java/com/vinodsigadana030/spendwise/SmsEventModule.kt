package com.vinodsigadana030.spendwise

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Collections
import java.util.WeakHashMap

class SmsEventModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "SmsEventModule"

    @ReactMethod
    fun postNotification(amount: Double, type: String, merchant: String?, sender: String) {
        NotificationHelper.postTransactionNotification(
            context = reactApplicationContext,
            amount = amount,
            type = type,
            merchant = merchant,
            sender = sender
        )
    }

    @ReactMethod
    fun postBillNotification(amount: Double, dueDate: String?, sender: String) {
        NotificationHelper.postBillNotification(
            context = reactApplicationContext,
            amount = amount,
            dueDate = dueDate,
            sender = sender
        )
    }

    companion object {
        private val contexts = Collections.newSetFromMap(WeakHashMap<ReactApplicationContext, Boolean>())

        private fun addContext(context: ReactApplicationContext) {
            contexts.add(context)
        }

        fun sendEvent(eventName: String) {
            synchronized(contexts) {
                for (context in contexts) {
                    try {
                        if (context.hasActiveCatalystInstance()) {
                            context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                                ?.emit(eventName, null)
                        }
                    } catch (e: Exception) {
                        // Context might be invalid or catalyst instance dead
                    }
                }
            }
        }
    }

    init {
        addContext(reactContext)
    }
}
