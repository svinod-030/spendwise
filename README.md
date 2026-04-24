# SpendWise
SpendWise is a privacy-focused, automated expense tracker designed to help you manage your finances without compromising your data.

## ✨ Key Features

*   **Automatic Tracking**: Automatically parses incoming transaction SMS to track your expenses in real-time.
*   **Privacy First**: All your data stays on your device. We do not collect or upload your financial information.
*   **Smart Categorization**: Automatically categorizes transactions to give you a clear view of your spending habits.
*   **Budgeting Tools**: Set monthly budgets and receive notifications when you're approaching your limits.
*   **Beautiful Insights**: Visualize your spending patterns with intuitive charts and graphs.

## 🚀 Getting Started

### Prerequisites

*   An Android device (for SMS parsing functionality).
*   Node.js and npm installed on your development machine.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/spendwise.git
    cd spendwise
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the app:**
    ```bash
    npm start
    ```

## 🛠️ Tech Stack

*   **Framework**: React Native
*   **State Management**: Zustand
*   **Database**: SQLite (via Expo SQLite)
*   **Stylake**: NativeWind (Tailwind CSS for React Native)
*   **Icons**: Lucide React Native

## 🛡️ Privacy & Security

Your privacy is our priority. SpendWise is built with a "Local-First" philosophy.
*   **No Cloud Storage**: Your transaction history is stored locally in an encrypted SQLite database.
*   **No Tracking**: We do not use any third-party analytics or tracking libraries.
*   **Permission Transparency**: We only request the permissions necessary for the app to function (e.g., SMS reading for automation).

## 📄 License

This project is licensed under the MIT License.