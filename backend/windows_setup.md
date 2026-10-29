## Windows Setup

### 1. Clone the repository

```cmd
git clone <repo-url>
cd AIPowered_DesignAutomation_NVH
```

### 2. Backend

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Download translation models (one-time, ~600 MB)

```cmd
python download_models.py
```

### 4. Start the backend server

```cmd
uvicorn main:app --reload --port 8000
```

### 5. Frontend (open a new terminal)

```cmd
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173**

---

## Notes

- The translation models are saved in `backend/models/` and excluded from git. Each developer runs `download_models.py` once after cloning.
- If the model download is skipped, the app still works — translation will attempt to download models from HuggingFace on first use.
- Backend runs on port **8000**, frontend on port **5173**.