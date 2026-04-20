package com.vinodsigadana030.spendwise

import com.facebook.react.bridge.*
import com.google.mlkit.nl.entityextraction.*

class SMSParserModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SMSParserModule"

    // Lazily-created extractor — reused across calls to avoid re-initialising
    private val extractor: EntityExtractor by lazy {
        EntityExtraction.getClient(
            EntityExtractorOptions.Builder(EntityExtractorOptions.ENGLISH).build()
        )
    }

    /**
     * Pre-loads the ML Kit model (~10 MB) so the first real SMS parse is instant.
     * Call this once on app start.
     */
    @ReactMethod
    fun preloadModel(promise: Promise) {
        extractor.downloadModelIfNeeded()
            .addOnSuccessListener { promise.resolve(true) }
            .addOnFailureListener { e -> promise.reject("PRELOAD_ERROR", e.message) }
    }

    /**
     * Annotates [text] and returns an array of entity maps.
     * Each map contains: { text, type, value? (for money), fractionalDigits? }
     *
     * Relevant entity types returned to JS:
     *   - "TYPE_MONEY"      → also includes `value` (Double) and `fractionalDigits`
     *   - "TYPE_DATE_TIME"  → text contains the raw date string
     */
    @ReactMethod
    fun extractEntities(text: String, promise: Promise) {
        extractor.downloadModelIfNeeded()
            .addOnSuccessListener {
                val params = EntityExtractionParams.Builder(text).build()
                extractor.annotate(params)
                    .addOnSuccessListener { annotations ->
                        val result = Arguments.createArray()
                        for (annotation in annotations) {
                            for (entity in annotation.entities) {
                                val map = Arguments.createMap()
                                map.putString("text", annotation.annotatedText)
                                when (entity.type) {
                                    Entity.TYPE_MONEY -> {
                                        val money = entity.asMoneyEntity()
                                        if (money != null) {
                                            map.putString("type", "TYPE_MONEY")
                                            
                                            // Calculate scale (number of decimal digits) from the source text
                                            val text = annotation.annotatedText
                                            val decimalMatch = Regex("[.,](\\d+)(?!.*[.,])").find(text)
                                            val scale = decimalMatch?.groupValues?.get(1)?.length ?: 0
                                            
                                            val value = money.integerPart.toDouble() + 
                                                (money.fractionalPart.toDouble() / Math.pow(10.0, scale.toDouble()))
                                            
                                            map.putDouble("value", value)
                                            map.putInt("fractionalDigits", scale)
                                        }
                                    }
                                    Entity.TYPE_DATE_TIME -> {
                                        map.putString("type", "TYPE_DATE_TIME")
                                    }
                                    else -> continue // skip irrelevant entity types
                                }
                                result.pushMap(map)
                            }
                        }
                        promise.resolve(result)
                    }
                    .addOnFailureListener { e ->
                        promise.reject("ANNOTATE_ERROR", e.message)
                    }
            }
            .addOnFailureListener { e ->
                promise.reject("MODEL_DOWNLOAD_ERROR", e.message)
            }
    }
}
