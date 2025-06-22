# Simplifi Export

This project provides tools to export data from Simplifi, including scripts for scheduled exports and CSV generation.

## Features
- Export transactions from Simplifi
- Schedule automated exports
- Output data as CSV files in the `exports/` directory

## Getting Started

### Prerequisites
- Node.js (v14 or higher recommended)
- npm

### Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/MikeLockz/simplifi-export.git
   cd simplifi-export
   ```
2. Install dependencies:
   ```sh
   npm install
   ```

### Usage
- To run the exporter script:
  ```sh
  node simplifi-export.js
  ```
- To schedule exports, use the `schedule.js` script or set up a cron job as needed.

### Exported Data
- CSV files are saved in the `exports/` directory. These files are ignored by git as specified in `.gitignore`.

## Project Structure
- `simplifi-export.js` – Main script for exporting Simplifi data
- `schedule.js` – Script for scheduling exports
- `exports/` – Directory for exported CSV files
- `.gitignore` – Ignores sensitive and build files

## License
MIT License
