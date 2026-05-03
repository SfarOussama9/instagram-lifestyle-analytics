# Instagram Lifestyle Analytics Project

This repository contains two deliverables for the project:

1. `test.ipynb` for exploration, feature engineering, clustering, modeling, and report figures.
2. `dashboard/` for the interactive FastAPI + Next.js dashboard.

## What Is Included

- `test.ipynb`: the main notebook used for analysis and results.
- `dashboard/backend/`: FastAPI API and training pipeline.
- `dashboard/frontend/`: Next.js dashboard UI.
- `instagram_users_lifestyle_sample_10000_engineered.csv`: a bundled sample dataset that makes the repo runnable after cloning.
- `report.tex`: the Overleaf-ready report source.

## Important Dataset Note

The original file `instagram_users_lifestyle.csv` is about 419 MB, which is too large for a normal GitHub repository.

Download the full dataset from Kaggle here: <https://www.kaggle.com/datasets/rockyt07/social-media-user-analysis>. After downloading and extracting it, place the CSV in the project root as:

```text
instagram_users_lifestyle.csv
```

Because of that:

- the repository is designed to run with the bundled `instagram_users_lifestyle_sample_10000_engineered.csv` by default if the full dataset is missing;
- if you want to reproduce the full-scale analysis exactly, place the original `instagram_users_lifestyle.csv` in the project root, or point the app to it with the `INSTAGRAM_DATASET_PATH` environment variable;
- do not commit the full CSV to GitHub; it is ignored by `.gitignore` and should be downloaded separately from Kaggle when needed.

## Recommended Versions

- Python 3.11
- Node.js 20+
- npm 10+
- VS Code with the Python and Jupyter extensions recommended for notebook work

## Project Structure

```text
DataProject/
|-- test.ipynb
|-- report.tex
|-- requirements-notebook.txt
|-- instagram_users_lifestyle_sample_10000_engineered.csv
`-- dashboard/
    |-- backend/
    |   |-- requirements.txt
    |   `-- app/
    `-- frontend/
        `-- package.json
```

## Clone And Set Up

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd DataProject
```

### 2. Create a Python virtual environment

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Python dependencies

```bash
pip install -r requirements-notebook.txt
```

This installs both the notebook dependencies and the dashboard backend dependencies.

### 4. Install frontend dependencies

```bash
cd dashboard/frontend
npm install
cd ../..
```

## Running The Dashboard Locally

Open two terminals from the project root.

### Terminal 1: backend

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
cd dashboard/backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

macOS/Linux:

```bash
source .venv/bin/activate
cd dashboard/backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Terminal 2: frontend

```bash
cd dashboard/frontend
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Then open:

- Frontend: `http://127.0.0.1:3000`
- Backend health route: `http://127.0.0.1:8000`

## Running The Notebook Locally

From the project root:

```bash
jupyter notebook
```

or:

```bash
jupyter lab
```

Then open `test.ipynb` and select the `.venv` Python kernel.

The notebook now tries the full dataset first and falls back to the bundled sample dataset automatically when the full CSV is not available.

## Using The Full Dataset Instead Of The Sample

Download the dataset from Kaggle: <https://www.kaggle.com/datasets/rockyt07/social-media-user-analysis>. Extract the archive and make sure the full CSV is named `instagram_users_lifestyle.csv`.

### Option A: put the full file in the project root

Place this file next to `test.ipynb`:

```text
instagram_users_lifestyle.csv
```

### Option B: point to the file with an environment variable

Windows PowerShell:

```powershell
$env:INSTAGRAM_DATASET_PATH = "C:\path\to\instagram_users_lifestyle.csv"
```

macOS/Linux:

```bash
export INSTAGRAM_DATASET_PATH="/path/to/instagram_users_lifestyle.csv"
```

The backend uses this variable automatically. The notebook uses the project-root full dataset if present; otherwise it uses the sample.

## Docker Option

If Docker is installed, the dashboard can also be started with:

```bash
cd dashboard
docker compose up
```

This starts:

- backend on port `8000`
- frontend on port `3000`

## Suggested GitHub Workflow For The Team

1. Push the repository without the 419 MB raw dataset.
2. Keep the bundled sample CSV in the repository so the project is runnable immediately after clone.
3. Share the full raw CSV separately through OneDrive, Google Drive, or Git LFS.
4. Ask each teammate to place the full CSV in the project root if they need exact reproduction of the original notebook outputs.

## Presentation Checklist For Teammates

1. Start the backend.
2. Start the frontend.
3. Open the dashboard in the browser.
4. Open `test.ipynb` in Jupyter or VS Code.
5. If they need the exact full-data outputs, add the original `instagram_users_lifestyle.csv` before rerunning cells.

## Troubleshooting

### Backend fails on startup

- Confirm the virtual environment is activated.
- Confirm Python dependencies were installed with `pip install -r requirements-notebook.txt`.
- Confirm the dataset file exists either as the sample CSV in the repo or as the full CSV in the project root.

### Frontend cannot reach the API

- Make sure the backend is running on `127.0.0.1:8000`.
- Make sure the frontend is running on `127.0.0.1:3000`.

### Notebook kernel missing

- Reopen VS Code or Jupyter after creating the virtual environment.
- Install the kernel packages from `requirements-notebook.txt`.
- Select the `.venv` interpreter manually.

## Notes For Submission

- `report.tex` is the final LaTeX report source.
- The sample dataset is for portability and demo purposes.
- The full dataset is required only if you want to reproduce the original large-scale run exactly.