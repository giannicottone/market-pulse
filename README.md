# MarketPulse

A lightweight tool to validate whether an idea has real market interest before investing time or money into it.

---

## Overview

MarketPulse aggregates public signals from search trends and online discussions to provide a quick, directional answer to a simple question:

Is there real interest in this idea, or just noise?

The app takes a keyword or concept and returns:

* An interest score (0–100)
* Trend direction (rising, stable, declining)
* Platform-level signal breakdown
* Related emerging ideas
* Direct links to underlying data sources

This is not meant to be perfectly accurate. It is meant to provide fast, directional insight.

---

## Purpose of This Project

This project was built as an experiment in AI-assisted development, specifically to evaluate how effectively tools like Codex can:

* Accelerate full-stack development
* Assist with debugging and iteration
* Maintain structure across multiple components
* Produce something that feels like a real product, not just a demo

The goal was not just to generate code, but to:

* Build something usable
* Refine it through iteration
* Identify where AI helps vs where human judgment is required

---

## What This Tests

This project intentionally explores the full lifecycle:

### Code Generation

Using AI to scaffold:

* Next.js frontend
* Component structure
* API routes

### Debugging

Iterating through:

* environment setup issues
* package conflicts
* runtime errors
* data normalization problems

### Product Thinking

Refining:

* UI clarity
* loading states
* perceived responsiveness
* usefulness of output

### Signal Processing

Transforming raw data into:

* simple scores
* readable labels
* actionable output

---

## Features

* Keyword-based market validation
* Google Trends signal analysis
* Reddit discussion signal analysis
* Composite scoring system
* Clean, product-focused UI
* Transparent data source links

---

## Data Sources

All data is derived from publicly available sources:

* Google Trends
* Reddit search (top posts, weekly window)

The app includes direct links so users can verify the underlying signals themselves.

---

## Tech Stack

* Next.js
* React
* Tailwind CSS
* Node.js API routes

No authentication, no external databases, and no paid APIs were used. The focus was speed, clarity, and execution.

---

## How to Run

npm install
npm run dev

Then open:

http://localhost:3000

---

## Key Design Decisions

* Product-first approach: UI and experience were prioritized before backend integration
* Simple scoring model: clarity over complexity
* No overengineering: minimal dependencies, no unnecessary abstractions
* Transparency: users can inspect all underlying data sources

---

## Limitations

* Data is approximate and not normalized at scale
* No caching or rate limiting implemented
* Reddit and Trends signals are simplified
* Not production-ready

---

## Takeaways

This project demonstrates that AI-assisted development is highly effective for:

* speeding up initial builds
* generating boilerplate
* iterating on UI quickly

However, it still requires human input for:

* architecture decisions
* product direction
* debugging edge cases
* determining what actually matters

---

## Future Improvements

* Add caching layer for repeated queries
* Improve scoring accuracy
* Add historical comparisons
* Expand data sources (e.g. YouTube, Twitter/X)
* Introduce persistence layer

---

## Final Note

This is not a finished product. It is a deliberate experiment in building something quickly, validating ideas, and understanding where AI meaningfully contributes to the development process.
