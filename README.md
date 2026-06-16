# BigQuery Release Pulse 🚀

A modern, glassmorphic web dashboard built using **Python Flask** and **Vanilla HTML/CSS/JS** that consumes the official Google BigQuery Release Notes RSS feed, categorizes the entries, and offers an integrated interface to draft and share updates directly on X (formerly Twitter).

---

## 🎨 Features

- **Real-Time Aggregation:** Dynamically pulls the official BigQuery release notes feed directly from Google Cloud.
- **Auto-Categorization:** Uses textual heuristics to auto-categorize notes into:
  - 🚀 **Features**
  - ⚙️ **Updates**
  - 🐛 **Bug Fixes**
  - ⚠️ **Deprecations**
- **Dynamic Frontend Filtering:** Instant client-side search indexing and category selection without page reloads.
- **Tweet Composer:** Click on any update to compose a tweet with preset emojis, automatic URL links, and live character limit feedback (280-character boundary progress ring).
- **Glassmorphic UI:** A dark-mode aesthetic featuring fluid hover interactions, subtle glows, and responsive styling.

---

## 📂 Project Structure

```text
├── app.py                  # Flask main backend entry point
├── requirements.txt        # Backend dependencies
├── .gitignore              # Ignored files for version control
├── templates/
│   └── index.html          # Core frontend layout and components
└── static/
    ├── app.js              # State management, filters, and API fetching
    └── style.css           # Premium glassmorphic styling system
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Python 3.11+** installed on your system.

### 2. Installation
Clone this repository (or copy the folder), navigate to the root directory, and install the required dependencies:

```bash
pip install -r requirements.txt
```

### 3. Running the Server
Start the local Flask development server:

```bash
python app.py
```

By default, the application will run at:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🛠️ Built With

- **Backend:** [Flask](https://flask.palletsprojects.com/) (Routing & Proxy API), [feedparser](https://pypi.org/project/feedparser/) (RSS Parsing)
- **Frontend:** Vanilla HTML5, Vanilla JavaScript (ES6), Custom CSS3 Variables
- **Fonts:** [Google Fonts (Outfit & Plus Jakarta Sans)](https://fonts.google.com/)
- **Icons:** [FontAwesome v6](https://fontawesome.com/)
