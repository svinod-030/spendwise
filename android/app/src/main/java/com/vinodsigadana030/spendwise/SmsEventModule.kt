package com.vinodsigadana030.spendwise

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.modules.core.DeviceEventManagerModule

class SmsEventModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "SmsEventModule"

    companion object {
        private var reactContext: ReactApplicationContext? = null

        fun setContext(context: ReactApplicationContext) {
            reactContext = context
        }

        fun sendEvent(eventName: String) {
            reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, null)
        }
    }

    init {
        setContext(reactContext)
    }
}
