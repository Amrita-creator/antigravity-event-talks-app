from flask import Flask, jsonify, render_template
import feedparser
import re
from datetime import datetime

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html(raw_html):
    """Clean unwanted tags or normalize links if needed, but preserve layout structure."""
    if not raw_html:
        return ""
    # Normalize links to target="_blank"
    cleaned = re.sub(r'<a\s+href=', r'<a target="_blank" href=', raw_html)
    return cleaned

def parse_date(date_str):
    """Parse date string into a user-friendly format."""
    try:
        # e.g., "2026-06-15T00:00:00Z"
        dt = datetime.strptime(date_str.split('T')[0], "%Y-%m-%d")
        return dt.strftime("%B %d, %Y")
    except Exception:
        return date_str

def extract_category(title, summary):
    """Categorize the release note based on title/summary contents."""
    text = f"{title} {summary}".lower()
    if "deprecation" in text or "deprecated" in text:
        return "Deprecation"
    elif "feature" in text or "new" in text or "introduced" in text or "support" in text:
        return "Feature"
    elif "bug" in text or "fix" in text or "resolved" in text or "issue" in text:
        return "Fix"
    elif "change" in text or "update" in text or "modify" in text:
        return "Update"
    else:
        return "General"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        feed = feedparser.parse(FEED_URL)
        if feed.bozo:
            # Note: bozo might be 1 even for minor XML/HTML formatting issues,
            # so we check if we actually got entries before throwing error.
            if not feed.entries:
                return jsonify({"error": "Failed to parse release notes feed"}), 500
        
        releases = []
        for entry in feed.entries:
            # Some entries might have 'content' instead of 'summary'
            content = ""
            if 'content' in entry and entry.content:
                content = entry.content[0].value
            elif 'summary' in entry:
                content = entry.summary
                
            title = entry.get('title', 'BigQuery Update')
            date_published = entry.get('updated', entry.get('published', ''))
            
            releases.append({
                "id": entry.get('id', ''),
                "title": title,
                "date": parse_date(date_published),
                "raw_date": date_published,
                "content": clean_html(content),
                "link": entry.get('link', ''),
                "category": extract_category(title, content)
            })
            
        return jsonify({"releases": releases})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
