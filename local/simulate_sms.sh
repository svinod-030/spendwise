#!/bin/bash

# Help message
show_help() {
  echo "Usage: ./simulate_sms.sh <amount> <type> [merchant]"
  echo "Types: credit, debit, pay"
  echo "Example: ./simulate_sms.sh 500 debit Zomato"
  exit 1
}

# Check arguments
if [ "$#" -lt 2 ]; then
  show_help
fi

AMOUNT=$1
TYPE=$2
MERCHANT=${3:-"Test Merchant"}
DATE=$(date +"%Y-%m-%d")
REF=$(head /dev/urandom | tr -dc '0-9' | head -c 12)

# Determine the message body based on type
case $TYPE in
  "credit")
    BODY="Dear Customer, your A/C x1234 has been credited with Rs. $AMOUNT on $DATE from $MERCHANT. Ref: $REF"
    SENDER="BANKEX"
    ;;
  "debit")
    BODY="Your A/C x1234 has been debited for Rs. $AMOUNT at $MERCHANT on $DATE. Ref: $REF"
    SENDER="BANKEX"
    ;;
  "pay")
    BODY="Paid Rs. $AMOUNT to $MERCHANT from your account on $DATE. Txn ID: $REF"
    SENDER="UPIPAY"
    ;;
  *)
    echo "Error: Invalid type '$TYPE'. Use credit, debit, or pay."
    show_help
    ;;
esac

echo "Simulating SMS..."
echo "Sender: $SENDER"
echo "Message: $BODY"

# Run ADB command
adb emu sms send "$SENDER" "$BODY"

if [ $? -eq 0 ]; then
  echo "✅ SMS simulation sent successfully to emulator!"
else
  echo "❌ Failed to send SMS simulation. Is the emulator running?"
fi
